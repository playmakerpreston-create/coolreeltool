// GET -> the signed-in person's account and seat summary. The app checks this regularly
// and before every export, so a seat used on a second device stops working.
import { send } from "../lib/http.js";
import { summary } from "../lib/billing.js";
import { requireSeat } from "../lib/guard.js";

export default async function handler(req, res) {
  const a = await requireSeat(req);
  if (!a.ok) return send(res, a.status, { code: a.code });
  return send(res, 200, summary(a));
}
