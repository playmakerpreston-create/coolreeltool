// Small helpers shared by the API routes (plain Node request/response, no framework).

export function send(res, status, body) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json");
  res.setHeader("cache-control", "no-store");
  res.end(JSON.stringify(body));
}

export function redirect(res, location) {
  res.statusCode = 302;
  res.setHeader("location", location);
  res.setHeader("cache-control", "no-store");
  res.end();
}

export function html(res, status, markup) {
  res.statusCode = status;
  res.setHeader("content-type", "text/html; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.end(markup);
}

// JSON or form body. Vercel pre-parses req.body; the local dev server and raw streams don't.
export async function readBody(req) {
  let body = req.body;
  if (body === undefined) {
    let raw = "";
    for await (const chunk of req) raw += chunk;
    body = raw;
  }
  if (typeof body !== "string") return body || {};
  if (!body) return {};
  if ((req.headers["content-type"] || "").includes("application/x-www-form-urlencoded")) {
    return Object.fromEntries(new URLSearchParams(body));
  }
  try { return JSON.parse(body); } catch { return {}; }
}

export const query = (req) => Object.fromEntries(new URL(req.url, "http://local").searchParams);

export function siteOrigin(req) {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, "");
  const proto = req.headers["x-forwarded-proto"] || (req.socket?.encrypted ? "https" : "http");
  return `${proto}://${req.headers["x-forwarded-host"] || req.headers.host}`;
}

export const normEmail = (e) => String(e || "").trim().toLowerCase();
export const validEmail = (e) => e.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
export const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
