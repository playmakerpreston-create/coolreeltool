// Sign-in sessions. One active session per person: signing in on a new device
// replaces the stored session id, which signs out every other device.
import crypto from "node:crypto";
import { redis } from "./redis.js";

const COOKIE = "crt_session";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error("SESSION_SECRET must be set to a random string of 32+ characters");
  return s;
}
const sign = (value) => crypto.createHmac("sha256", secret()).update(value).digest("base64url");

function readCookie(req) {
  const header = req.headers.cookie || "";
  for (const part of header.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === COOKIE) return v.join("=");
  }
  return "";
}

export async function startSession(res, email) {
  const sid = crypto.randomBytes(18).toString("base64url");
  await redis("SET", `active:${email}`, sid, "EX", MAX_AGE);
  const value = `${Buffer.from(email).toString("base64url")}.${sid}`;
  res.setHeader("set-cookie", `${COOKIE}=${value}.${sign(value)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${MAX_AGE}`);
}

export function clearSessionCookie(res) {
  res.setHeader("set-cookie", `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`);
}

// -> { email } when valid, or { error: "signed_out" | "signed_in_elsewhere" }
export async function getSession(req) {
  const parts = readCookie(req).split(".");
  if (parts.length !== 3) return { error: "signed_out" };
  const value = `${parts[0]}.${parts[1]}`;
  const expected = Buffer.from(sign(value));
  const given = Buffer.from(parts[2]);
  if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) return { error: "signed_out" };
  const email = Buffer.from(parts[0], "base64url").toString();
  const active = await redis("GET", `active:${email}`);
  if (active !== parts[1]) return { error: active ? "signed_in_elsewhere" : "signed_out", email };
  return { email };
}

export async function endSession(email) {
  await redis("DEL", `active:${email}`);
}

// One-time sign-in links, valid for 15 minutes.
export async function createLoginLink(email, origin) {
  const token = crypto.randomBytes(24).toString("base64url");
  await redis("SET", `login:${token}`, email, "EX", 900);
  return `${origin}/api/auth/verify?token=${token}`;
}

export async function redeemLoginToken(token) {
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token || "")) return null;
  return redis("GETDEL", `login:${token}`);
}
