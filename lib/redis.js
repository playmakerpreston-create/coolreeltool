// Tiny Redis client over the Upstash REST API (what Vercel's "Upstash for Redis" integration provides).
// Uses KV_REST_API_URL / KV_REST_API_TOKEN, or UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN.

const url = () => process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const token = () => process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

export const redisConfigured = () => Boolean(url() && token());

export async function redis(...command) {
  if (!redisConfigured()) throw new Error("Redis is not configured");
  const res = await fetch(url(), {
    method: "POST",
    headers: { authorization: `Bearer ${token()}`, "content-type": "application/json" },
    body: JSON.stringify(command.map(String)),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) throw new Error(`Redis ${command[0]} failed: ${data.error || res.status}`);
  return data.result;
}

export async function getJson(key) {
  const v = await redis("GET", key);
  return v ? JSON.parse(v) : null;
}

export async function setJson(key, value, ttlSeconds) {
  return ttlSeconds
    ? redis("SET", key, JSON.stringify(value), "EX", ttlSeconds)
    : redis("SET", key, JSON.stringify(value));
}
