// Checks the request comes from a signed-in person with a paid seat.
// -> { ok: true, ...access } or { ok: false, status, code }
import { getSession } from "./session.js";
import { access } from "./billing.js";

export async function requireSeat(req) {
  const s = await getSession(req);
  if (s.error) return { ok: false, status: 401, code: s.error };
  const a = await access(s.email);
  if (!a.ok) return { ok: false, status: 402, code: a.code };
  return a;
}
