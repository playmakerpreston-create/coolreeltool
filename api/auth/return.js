// GET ?session_id=... Stripe sends the buyer here after paying. Creates their team and signs them in.
import { redirect, query, normEmail } from "../../lib/http.js";
import { stripe, getTeam, saveTeam, forgetSubscription } from "../../lib/billing.js";
import { redis } from "../../lib/redis.js";
import { startSession } from "../../lib/session.js";

export default async function handler(req, res) {
  const { session_id: id } = query(req);
  if (!id || !/^cs_[A-Za-z0-9_]+$/.test(id)) return redirect(res, "/?signin=1");
  let checkout;
  try { checkout = await stripe().checkout.sessions.retrieve(id); } catch { return redirect(res, "/?signin=1"); }
  if (checkout.status !== "complete" || !checkout.customer) return redirect(res, "/?canceled=1#pricing");

  // The return link only signs someone in once; after that they use an emailed sign-in link.
  const first = await redis("SET", `used:${checkout.id}`, "1", "NX", "EX", 60 * 60 * 24 * 30);
  if (first !== "OK") return redirect(res, "/?signin=1");

  const customerId = typeof checkout.customer === "string" ? checkout.customer : checkout.customer.id;
  const email = normEmail(checkout.customer_details?.email || checkout.customer_email);
  const team = (await getTeam(customerId)) || { owner: email, members: [], createdAt: Date.now() };
  await saveTeam(customerId, team);
  await redis("SET", `member:${email}`, customerId);
  await forgetSubscription(customerId);
  await startSession(res, email);
  return redirect(res, "/app?welcome=1");
}
