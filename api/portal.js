// POST -> { url } of Stripe's billing page, where the team owner updates their card, sees invoices,
// cancels, or renews a lapsed subscription.
import { send, siteOrigin } from "../lib/http.js";
import { stripe, getTeam } from "../lib/billing.js";
import { redis } from "../lib/redis.js";
import { getSession } from "../lib/session.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return send(res, 405, { code: "method_not_allowed" });
  const s = await getSession(req);
  if (s.error) return send(res, 401, { code: s.error });
  // Owners can open billing even when the subscription has lapsed, so they can renew.
  const customerId = await redis("GET", `member:${s.email}`);
  const team = customerId ? await getTeam(customerId) : null;
  if (!team) return send(res, 402, { code: "no_subscription" });
  if (team.owner !== s.email) return send(res, 403, { code: "owner_only" });
  try {
    const portal = await stripe().billingPortal.sessions.create({ customer: customerId, return_url: `${siteOrigin(req)}/app` });
    return send(res, 200, { url: portal.url });
  } catch {
    return send(res, 502, { code: "billing_failed" });
  }
}
