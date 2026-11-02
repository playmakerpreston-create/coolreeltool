// POST { email } -> emails a one-time sign-in link to anyone with a seat.
// Always answers the same way, so the form can't be used to check who is a customer.
import { send, readBody, siteOrigin, normEmail, validEmail } from "../../lib/http.js";
import { access } from "../../lib/billing.js";
import { redis } from "../../lib/redis.js";
import { createLoginLink } from "../../lib/session.js";
import { sendSignInEmail } from "../../lib/mail.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return send(res, 405, { code: "method_not_allowed" });
  const email = normEmail((await readBody(req)).email);
  if (!validEmail(email)) return send(res, 400, { code: "bad_email" });

  const attempts = await redis("INCR", `rl:link:${email}`);
  if (Number(attempts) === 1) await redis("EXPIRE", `rl:link:${email}`, 3600);
  if (Number(attempts) > 5) return send(res, 200, { ok: true });

  try {
    const a = await access(email);
    if (a.ok) await sendSignInEmail(email, await createLoginLink(email, siteOrigin(req)));
  } catch {
    return send(res, 500, { code: "email_failed" });
  }
  return send(res, 200, { ok: true });
}
