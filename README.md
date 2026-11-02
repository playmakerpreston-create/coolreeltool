# CoolReelTool

Turn any clip into a scroll-stopping 9:16 reel: a bold headline, your video in a letterbox frame, an optional profile lockup and a byline, exported with sound. Video editing and exporting run in the browser; videos are never uploaded.

This version is a paid website: a public landing page with pricing, and the reel generator at `/app` for paying members only.

## How the paywall works

- **One plan, priced per seat.** A monthly base price includes 1 seat; each extra seat has its own monthly price. Page profiles and reels are unlimited.
- **A seat is one person on one device.** People sign in with an emailed link (no passwords). Signing in on a new device signs out the old one, so a login can't be shared.
- **The buyer is the team owner.** In the app's **Account** panel they add or remove seats (Stripe prorates the bill), add teammates by email (each gets a sign-in link), remove teammates (signed out immediately), and open **Billing** to change their card, see invoices or cancel.
- **Everything is checked on the server.** The app page, the AI tabs and every export check the seat first. A lapsed subscription, a removed teammate or a seat signed in elsewhere is locked out.

## What you need (all have free tiers)

| Service | Used for |
|---|---|
| [Vercel](https://vercel.com) | Hosting the site and its server functions |
| [Stripe](https://stripe.com) | Monthly billing |
| [Upstash Redis](https://upstash.com) (add it from Vercel's **Storage** tab) | Teams, seats and sign-in sessions |
| [Resend](https://resend.com) | Sending sign-in emails |
| Anthropic API key (optional) | The AI Ideas and Rewrite tabs |

## Setup

**1. Stripe prices.** In the Stripe dashboard, create a product "CoolReelTool" with two recurring monthly prices:
- **Base plan**, e.g. $19.99/month. This includes the first seat.
- **Extra seat**, e.g. $9.99/month.

Copy both price IDs (they start with `price_`). Under **Settings → Billing → Customer portal**, turn on the portal so owners can update cards and cancel. Leave quantity changes off there; seats are changed inside the app.

**2. Deploy to Vercel.** Import this repo in Vercel (**Add New → Project**) and deploy. No build settings are needed; `vercel.json` already serves `public/` and routes `/app` to the members-only page.

**3. Add Redis.** In the Vercel project, open **Storage → Create → Upstash for Redis** and connect it. This adds `KV_REST_API_URL` and `KV_REST_API_TOKEN` for you.

**4. Add the other settings** under **Settings → Environment Variables**, then redeploy:

| Name | Value |
|---|---|
| `STRIPE_SECRET_KEY` | Your Stripe secret key (`sk_live_...`, or `sk_test_...` while testing) |
| `STRIPE_BASE_PRICE_ID` | The base plan's price ID |
| `STRIPE_SEAT_PRICE_ID` | The extra seat's price ID |
| `SESSION_SECRET` | A long random string, 32+ characters. Generate one with `openssl rand -base64 48` |
| `RESEND_API_KEY` | Your Resend API key |
| `EMAIL_FROM` | Sender, e.g. `CoolReelTool <hello@yourdomain.com>` (the domain must be verified in Resend) |
| `SITE_URL` | Your site address, e.g. `https://coolreeltool.com` (used in emailed links) |
| `TRIAL_DAYS` | Optional free trial length, e.g. `7` |
| `ANTHROPIC_API_KEY` | Optional, switches on AI Ideas and Rewrite |
| `AI_DAILY_LIMIT` | Optional AI requests per person per day (default 60) |

**5. Test it** with Stripe's test mode first: use `sk_test_` keys and the card `4242 4242 4242 4242` with any future date and CVC. When it all works, switch to live keys and live price IDs.

## Install it as an app

Members can install CoolReelTool with its own icon:
- **iPhone / iPad (Safari):** Share → **Add to Home Screen**
- **Android (Chrome):** ⋮ menu → **Install app**
- **Mac / Windows (Chrome or Edge):** the install icon in the address bar
- **Mac (Safari):** File → **Add to Dock**

## Project layout

```
public/                 the public website (served as-is)
  index.html            landing page: features, pricing, seat picker, sign in
  manifest.webmanifest  app name and icons for installing
  sw.js                 caches the landing page; never caches /app or the API
  icons/  media/        app icons, launch video, hero reel
private/app.html        the reel generator, only served to paid seats
api/                    server functions
  pricing.js            prices from Stripe for the landing page
  checkout.js           starts Stripe Checkout for N seats
  auth/return.js        after payment: creates the team and signs the buyer in
  auth/request-link.js  emails a one-time sign-in link
  auth/verify.js        signs in from the emailed link
  me.js                 the signed-in person's seat (checked often by the app)
  team.js  seats.js     owner adds/removes teammates and changes seat count
  portal.js             opens Stripe's billing page
  logout.js             signs out
  app.js                serves the generator to paid seats
  ai.js                 AI Ideas and Rewrite (paid seats only, daily limit)
lib/                    shared code: Stripe, Redis, sessions, email
```

## Notes

- Profiles are saved in each browser, so a teammate's profiles stay on their own device.
- Exports record in real time, so keep the tab in front while exporting.
- Only post clips you own or have permission to use, and credit the source in the byline.
