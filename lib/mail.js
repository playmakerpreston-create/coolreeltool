// Sign-in emails, sent with Resend (resend.com). Needs RESEND_API_KEY and EMAIL_FROM.
import { escapeHtml } from "./http.js";

export async function sendSignInEmail(to, link, { invitedBy } = {}) {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY is not set");
  const subject = invitedBy ? `${invitedBy} added you to CoolReelTool` : "Your CoolReelTool sign-in link";
  const intro = invitedBy
    ? `${escapeHtml(invitedBy)} gave you a seat on their CoolReelTool team.`
    : "Here's your link to sign in to CoolReelTool.";
  const htmlBody = `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:16px;line-height:1.5;color:#1c1c1e;max-width:480px">
  <p>${intro}</p>
  <p><a href="${escapeHtml(link)}" style="display:inline-block;background:#ff3b30;color:#fff;text-decoration:none;font-weight:600;padding:12px 20px;border-radius:10px">Sign in to CoolReelTool</a></p>
  <p style="color:#6e6e73;font-size:14px">The link works once and expires in 15 minutes. Signing in on this device signs you out anywhere else. If you didn't ask for this, you can ignore this email.</p>
</div>`;
  const text = `${invitedBy ? `${invitedBy} gave you a seat on their CoolReelTool team.` : "Here's your link to sign in to CoolReelTool."}\n\n${link}\n\nThe link works once and expires in 15 minutes.`;
  const res = await fetch(`${process.env.RESEND_API_URL || "https://api.resend.com"}/emails`, {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({ from: process.env.EMAIL_FROM || "CoolReelTool <onboarding@resend.dev>", to: [to], subject, html: htmlBody, text }),
  });
  if (!res.ok) throw new Error(`Email failed with status ${res.status}`);
}
