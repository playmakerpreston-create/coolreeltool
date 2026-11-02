// The emailed sign-in link lands here.
// GET shows a "Continue" button and POST does the sign-in, because some email apps open links
// in the background to scan them, which would otherwise use up the one-time link.
import { html, redirect, query, readBody, escapeHtml } from "../../lib/http.js";
import { redeemLoginToken, startSession } from "../../lib/session.js";
import { access } from "../../lib/billing.js";

const page = (token) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Sign in · CoolReelTool</title><link rel="icon" href="/icons/favicon-32.png">
<style>
:root{color-scheme:light dark;--bg:#f2f2f7;--panel:#fff;--ink:#1c1c1e;--muted:#6e6e73;--rec:#ff3b30}
@media (prefers-color-scheme:dark){:root{--bg:#000;--panel:#1c1c1e;--ink:#f5f5f7;--muted:#98989f;--rec:#ff453a}}
body{margin:0;min-height:100vh;display:grid;place-items:center;background:var(--bg);color:var(--ink);font:16px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;padding:16px;box-sizing:border-box}
.card{background:var(--panel);border-radius:18px;padding:28px;max-width:360px;width:100%;text-align:center;display:flex;flex-direction:column;gap:14px;align-items:center}
img{width:64px;height:64px;border-radius:15px}h1{font-size:22px;margin:0}p{margin:0;color:var(--muted);font-size:15px}
button{font:inherit;font-weight:600;border:0;border-radius:12px;background:var(--rec);color:#fff;padding:12px 20px;width:100%;cursor:pointer}
</style></head><body><form class="card" method="post" action="/api/auth/verify">
<img src="/icons/icon-192.png" alt=""><h1>Sign in to CoolReelTool</h1>
<p>This signs you out on any other device using your seat.</p>
<input type="hidden" name="token" value="${escapeHtml(token)}"><button type="submit">Continue</button></form></body></html>`;

export default async function handler(req, res) {
  if (req.method === "GET") return html(res, 200, page(query(req).token || ""));
  if (req.method !== "POST") return redirect(res, "/");
  const email = await redeemLoginToken((await readBody(req)).token);
  if (!email) return redirect(res, "/?link=expired#signin");
  const a = await access(email);
  if (!a.ok) return redirect(res, "/?expired=1");
  await startSession(res, email);
  return redirect(res, "/app");
}
