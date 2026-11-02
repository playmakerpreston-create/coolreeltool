// Server endpoint for the AI Ideas and Rewrite tabs. Only people with a paid seat can use it.
// POST { prompt, tier } -> { result }  (the model's JSON answer, parsed)
// GET                    -> { configured } (lets the app know whether AI is switched on)
//
// Needs ANTHROPIC_API_KEY. AI_DAILY_LIMIT caps requests per person per day (default 60).
import Anthropic from "@anthropic-ai/sdk";
import { send, readBody } from "../lib/http.js";
import { requireSeat } from "../lib/guard.js";
import { redis } from "../lib/redis.js";

const MODEL = process.env.AI_MODEL || "claude-opus-5-5";
const MAX_PROMPT_CHARS = 8000;
// "quick" requests (topic lists) run at low effort; full research and rewrites at medium.
const EFFORT = { quick: "low", default: "medium" };

let client;
const anthropic = () => (client ||= new Anthropic()); // reads ANTHROPIC_API_KEY

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
  if (req.method === "GET") return send(res, 200, { configured });
  if (req.method !== "POST") return send(res, 405, { code: "method_not_allowed" });
  if (!configured) return send(res, 503, { code: "not_configured" });

  const a = await requireSeat(req);
  if (!a.ok) return send(res, a.status, { code: a.code });

  const limit = Number(process.env.AI_DAILY_LIMIT) || 60;
  const dayKey = `ai:${a.email}:${new Date().toISOString().slice(0, 10)}`;
  const used = Number(await redis("INCR", dayKey));
  if (used === 1) await redis("EXPIRE", dayKey, 60 * 60 * 26);
  if (used > limit) return send(res, 429, { code: "rate_limited" });

  const body = await readBody(req);
  const prompt = typeof body.prompt === "string" ? body.prompt : "";
  if (!prompt || prompt.length > MAX_PROMPT_CHARS) return send(res, 400, { code: "bad_request" });
  const effort = EFFORT[body.tier] || EFFORT.default;

  try {
    const response = await anthropic().beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      output_config: { effort },
      // If the model declines for safety reasons, retry on Anthropic's recommended fallback model.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      messages: [{ role: "user", content: prompt }],
    });

    if (response.stop_reason === "refusal") return send(res, 422, { code: "refused" });
    if (response.stop_reason === "max_tokens") return send(res, 502, { code: "invalid_json" });
    const text = response.content.filter((b) => b.type === "text").map((b) => b.text).join("");
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
