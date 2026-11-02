// GET -> the plan's prices from Stripe, for the landing page. Cached for an hour.
import { send } from "../lib/http.js";
import { stripe, basePriceId, seatPriceId } from "../lib/billing.js";
import { getJson, setJson, redisConfigured } from "../lib/redis.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return send(res, 405, { code: "method_not_allowed" });
  if (!process.env.STRIPE_SECRET_KEY || !basePriceId() || !seatPriceId() || !redisConfigured()) {
    return send(res, 200, { configured: false });
  }
  try {
    let pricing = await getJson("pricing");
    if (!pricing) {
      const [base, seat] = await Promise.all([stripe().prices.retrieve(basePriceId()), stripe().prices.retrieve(seatPriceId())]);
      pricing = {
        configured: true,
        currency: base.currency,
        interval: base.recurring?.interval || "month",
        base: base.unit_amount,
        seat: seat.unit_amount,
        trialDays: Number(process.env.TRIAL_DAYS) || 0,
      };
      await setJson("pricing", pricing, 3600);
    }
    return send(res, 200, pricing);
  } catch {
    return send(res, 200, { configured: false });
  }
}
