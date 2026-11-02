// POST -> signs this person out everywhere.
import { send } from "../lib/http.js";
import { getSession, endSession, clearSessionCookie } from "../lib/session.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return send(res, 405, { code: "method_not_allowed" });
  const s = await getSession(req);
  if (!s.error) await endSession(s.email);
  clearSessionCookie(res);
  return send(res, 200, { ok: true });
}
