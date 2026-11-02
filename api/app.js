// GET /app -> the reel generator itself, only for signed-in people with a paid seat.
// The app's HTML lives in private/, which Vercel never serves directly.
import fs from "node:fs/promises";
import { html, redirect } from "../lib/http.js";
import { requireSeat } from "../lib/guard.js";

const APP_FILE = new URL("../private/app.html", import.meta.url);
const WHERE = { signed_in_elsewhere: "elsewhere", no_subscription: "expired", no_seat: "noseat" };

export default async function handler(req, res) {
  const a = await requireSeat(req);
  if (!a.ok) return redirect(res, `/?${WHERE[a.code] || "signin"}=1${a.code === "signed_out" ? "#signin" : ""}`);
  return html(res, 200, await fs.readFile(APP_FILE, "utf8"));
}
