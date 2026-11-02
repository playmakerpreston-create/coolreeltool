// POST { seats } -> the team owner changes how many seats they pay for.
// Stripe prorates the change on the next bill.
import { send, readBody } from "../lib/http.js";
import { stripe, seatPriceId, subscriptionInfo, forgetSubscription, seatsUsed, summary, MAX_SEATS } from "../lib/billing.js";
import { requireSeat } from "../lib/guard.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return send(res, 405, { code: "method_not_allowed" });
  const a = await requireSeat(req);
  if (!a.ok) return send(res, a.status, { code: a.code });
  if (!a.isOwner) return send(res, 403, { code: "owner_only" });

  const seats = Math.floor(Number((await readBody(req)).seats));
  if (!Number.isFinite(seats) || seats < 1 || seats > MAX_SEATS) return send(res, 400, { code: "bad_seats" });
  if (seats < seatsUsed(a.team)) return send(res, 409, { code: "seats_in_use" });

  const sub = await subscriptionInfo(a.customerId, { fresh: true });
  if (!sub.active) return send(res, 402, { code: "no_subscription" });
  const extra = seats - 1;
  let items = null;
  if (sub.seatItemId) items = [extra > 0 ? { id: sub.seatItemId, quantity: extra } : { id: sub.seatItemId, deleted: true }];
  else if (extra > 0) items = [{ price: seatPriceId(), quantity: extra }];

  try {
    if (items) await stripe().subscriptions.update(sub.subscriptionId, { items, proration_behavior: "create_prorations" });
  } catch {
    return send(res, 502, { code: "billing_failed" });
  }
  await forgetSubscription(a.customerId);
  const fresh = await subscriptionInfo(a.customerId, { fresh: true });
  return send(res, 200, summary({ ...a, sub: fresh }));
}
