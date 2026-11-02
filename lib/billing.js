// Stripe billing and teams.
//
// Plan: one subscription per team with two prices -
//   STRIPE_BASE_PRICE_ID  monthly base plan, quantity 1, includes 1 seat
//   STRIPE_SEAT_PRICE_ID  monthly price per extra seat, quantity = seats - 1
// A seat is one person (one email) signed in on one device. Page profiles are unlimited.
//
// Redis keys:
//   team:<customerId>  {"owner": email, "members": [email, ...]}   (the owner uses a seat)
//   member:<email>     customerId of the team that person belongs to
//   sub:<customerId>   cached subscription summary (5 minutes)
import Stripe from "stripe";
import { redis, getJson, setJson } from "./redis.js";

let client;
export function stripe() {
  if (!client) {
    if (!process.env.STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY is not set");
    const options = {};
    if (process.env.STRIPE_MOCK_URL) { // local testing against a fake Stripe server only
      const u = new URL(process.env.STRIPE_MOCK_URL);
      Object.assign(options, { host: u.hostname, port: u.port, protocol: u.protocol.replace(":", "") });
    }
    client = new Stripe(process.env.STRIPE_SECRET_KEY, options);
  }
  return client;
}

export const basePriceId = () => process.env.STRIPE_BASE_PRICE_ID;
export const seatPriceId = () => process.env.STRIPE_SEAT_PRICE_ID;
export const MAX_SEATS = 100;
const GOOD_STATUS = new Set(["active", "trialing", "past_due"]);

export const getTeam = (customerId) => getJson(`team:${customerId}`);
export const saveTeam = (customerId, team) => setJson(`team:${customerId}`, team);
export const forgetSubscription = (customerId) => redis("DEL", `sub:${customerId}`);

// { active, status, subscriptionId, seatItemId, seats }
export async function subscriptionInfo(customerId, { fresh = false } = {}) {
  if (!fresh) {
    const cached = await getJson(`sub:${customerId}`);
    if (cached) return cached;
  }
  const list = await stripe().subscriptions.list({ customer: customerId, status: "all", limit: 10 });
  const sub = list.data.find((s) => GOOD_STATUS.has(s.status));
  let info = { active: false, seats: 0 };
  if (sub) {
    const seatItem = sub.items.data.find((i) => i.price.id === seatPriceId());
    info = { active: true, status: sub.status, subscriptionId: sub.id, seatItemId: seatItem?.id || null, seats: 1 + (seatItem?.quantity || 0) };
  }
  await setJson(`sub:${customerId}`, info, 300);
  return info;
}

const seatsUsed = (team) => 1 + team.members.length;

// Everything about the signed-in person's access.
// -> { ok: true, email, customerId, team, sub, isOwner } or { ok: false, code }
export async function access(email) {
  const customerId = await redis("GET", `member:${email}`);
  if (!customerId) return { ok: false, code: "no_subscription" };
  const team = await getTeam(customerId);
  if (!team) return { ok: false, code: "no_subscription" };
  const sub = await subscriptionInfo(customerId);
  if (!sub.active) return { ok: false, code: "no_subscription" };
  const isOwner = team.owner === email;
  // If seats were reduced below the team size (for example in the billing portal),
  // the most recently added members lose access first.
  if (!isOwner && team.members.indexOf(email) >= sub.seats - 1) return { ok: false, code: "no_seat" };
  return { ok: true, email, customerId, team, sub, isOwner };
}

export function summary(a) {
  const base = { email: a.email, isOwner: a.isOwner, owner: a.team.owner, seats: a.sub.seats, used: seatsUsed(a.team), status: a.sub.status };
  return a.isOwner ? { ...base, members: a.team.members } : base;
}

export { seatsUsed };
