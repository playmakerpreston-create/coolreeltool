// POST { seats, email? } -> { url } of a Stripe Checkout page for the monthly plan.
import { send, readBody, siteOrigin, normEmail, validEmail } from "../lib/http.js";
import { stripe, basePriceId, seatPriceId, MAX_SEATS } from "../lib/billing.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return send(res, 405, { code: "method_not_allowed" });
  const body = await readBody(req);
  const seats = Math.floor(Number(body.seats));
  if (!Number.isFinite(seats) || seats < 1 || seats > MAX_SEATS) return send(res, 400, { code: "bad_seats" });
  const email = normEmail(body.email);
  const origin = siteOrigin(req);
  const lineItems = [{ price: basePriceId(), quantity: 1 }];
  if (seats > 1) lineItems.push({ price: seatPriceId(), quantity: seats - 1 });
  const trialDays = Number(process.env.TRIAL_DAYS) || 0;
  try {
    const session = await stripe().checkout.sessions.create({
      mode: "subscription",
      line_items: lineItems,
      success_url: `${origin}/api/auth/return?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?canceled=1#pricing`,
      allow_promotion_codes: true,
      ...(email && validEmail(email) ? { customer_email: email } : {}),
      ...(trialDays > 0 ? { subscription_data: { trial_period_days: trialDays } } : {}),
    });
    return send(res, 200, { url: session.url });
  } catch {
    return send(res, 502, { code: "checkout_failed" });
  }
}
