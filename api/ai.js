// Server endpoint for the AI Ideas and Rewrite tabs.
// POST { prompt, tier } -> { result }  (the model's JSON answer, parsed)
// GET                    -> { configured } (lets the page know whether AI is switched on)
//
// Needs the ANTHROPIC_API_KEY environment variable in your Vercel project settings.
// Optional: ACCESS_CODE. When set, requests must send the same value in the
// x-access-code header, so strangers can't spend your API credit.
import Anthropic from "@anthropic-ai/sdk";

const MODEL = process.env.AI_MODEL || "claude-opus-5-5";
const MAX_PROMPT_CHARS = 8000;
// "quick" requests (topic lists) run at low effort; full research and rewrites at medium.
const EFFORT = { quick: "low", default: "medium" };

const client = new Anthropic(); // reads ANTHROPIC_API_KEY

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json");
  res.setHeader("cache-control", "no-store");
  res.end(JSON.stringify(body));
}

// The prompts ask for "ONLY a JSON object"; tolerate a stray code fence or lead-in text anyway.
function parseJson(text) {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try { return JSON.parse(cleaned); } catch {}
  const start = cleaned.indexOf("{"), end = cleaned.lastIndexOf("}");
  if (start >= 0 && end > start) return JSON.parse(cleaned.slice(start, end + 1));
  throw new SyntaxError("no JSON object in reply");
}

export default async function handler(req, res) {
  const configured = Boolean(process.env.ANTHROPIC_API_KEY);
  if (req.method === "GET") return send(res, 200, { configured, needsCode: Boolean(process.env.ACCESS_CODE) });
  if (req.method !== "POST") return send(res, 405, { code: "method_not_allowed" });
  if (!configured) return send(res, 503, { code: "not_configured" });
  if (process.env.ACCESS_CODE && req.headers["x-access-code"] !== process.env.ACCESS_CODE) {
    return send(res, 401, { code: "bad_access_code" });
  }

  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = null; } }
  const prompt = body && typeof body.prompt === "string" ? body.prompt : "";
  if (!prompt || prompt.length > MAX_PROMPT_CHARS) return send(res, 400, { code: "bad_request" });
  const effort = EFFORT[body.tier] || EFFORT.default;

  try {
    const response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      output_config: { effort },
      // If the model declines for safety reasons, retry on Anthropic's recommended fallback model.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      messages: [{ role: "user", content: prompt }],
    });

    if (response.stop_reason === "refusal") return send(res, 422, { code: "refused" });
    const text = response.content.filter((b) => b.type === "text").map((b) => b.text).join("");
    if (response.stop_reason === "max_tokens") return send(res, 502, { code: "invalid_json" });
    let result;
    try { result = parseJson(text); } catch { return send(res, 502, { code: "invalid_json" }); }
    return send(res, 200, { result });
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) return send(res, 429, { code: "rate_limited" });
    if (error instanceof Anthropic.AuthenticationError) return send(res, 500, { code: "bad_api_key" });
    if (error instanceof Anthropic.BadRequestError) return send(res, 400, { code: "bad_request" });
    if (error instanceof Anthropic.APIError) return send(res, 502, { code: "upstream_error", status: error.status });
    return send(res, 500, { code: "server_error" });
  }
}
