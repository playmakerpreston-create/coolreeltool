# CoolReelTool

Turn any clip into a scroll-stopping 9:16 reel: a bold headline, your video in a letterbox frame, an optional profile lockup and a byline. Video editing and exporting run entirely in the browser; videos are never uploaded.

Watch the launch video: [`media/coolreeltool-launch.mp4`](media/coolreeltool-launch.mp4)

## Deploy to Vercel

**Option A: from GitHub**
1. Push this folder to a GitHub repo.
2. In Vercel, choose **Add New → Project**, import the repo and press **Deploy**. No build settings are needed.

**Option B: from your computer**
```bash
npx vercel deploy --prod
```
Run it inside this folder. The first time, it asks you to log in and name the project.

### Switch on AI Ideas and Rewrite (optional)

These two tabs call an AI model through the small server function in `api/ai.js`, so your API key never reaches the browser.

1. Get an API key from the Anthropic Console (console.anthropic.com).
2. In Vercel, open the project's **Settings → Environment Variables** and add:

| Name | Value | Required |
|---|---|---|
| `ANTHROPIC_API_KEY` | your API key | Yes, for the AI tabs |
| `ACCESS_CODE` | any password you choose | Recommended. Visitors must enter it before the AI tabs work, so strangers can't spend your API credit |
| `AI_MODEL` | a model ID | No. Defaults to `claude-opus-5-5` |

3. Redeploy. Without a key the rest of the tool works normally and the AI tabs say they're off.

AI usage is billed to your API account per request. A full niche research run is one request; a rewrite is one request.

## Run it locally

Open `index.html` in Chrome, Edge or Safari. Everything except the AI tabs works straight from the file. To test the AI tabs locally, run `npx vercel dev` with `ANTHROPIC_API_KEY` set.

## Features

**Editor**
- Headline in three sizes, aligned left, center or right, with highlight words in any color
- Video in a 16:9, 4:5 or 1:1 frame; drag to reposition and zoom to crop
- Trim by playing, pausing and pressing *Trim start here* / *Trim end here*, or by dragging the handles
- Profile lockup: photo, name, @username, verified badge in blue, yellow, green, red or white
- Byline under the video, aligned left, center or right
- Black or white background (text flips to match)
- Side margin slider, margin guides and app safe-zone overlay (preview only, never exported)

**Export**
- 1080×1920 with sound (or muted); MP4 (H.264) where the browser supports it, WebM otherwise
- Real-time recording with a progress card, cancel button and locked editing while it runs

**Profiles**: save a page's look (background, highlight color, frame, lockup, badge, byline) under a name like "Evidence of Aliens" and click a card to switch.

**Queue**: add reels one after another, then *Export all* and download them as a single .zip.

**AI Ideas**: pick a page, tap topic and audience chips, and get a niche read, viral formats, hook formulas and 8 reel ideas. Click a headline to send it to the editor.

**Rewrite**: type a rough idea ("do a post for Silly Bandz, I have an old commercial") and get 8 headlines with different hooks, plus a caption and hashtags.

## Storage

Profiles, AI research and settings are saved in the browser's local storage, so they stay on the device and browser where you made them.

## Project layout

```
index.html                     the app (HTML, CSS and JavaScript)
api/ai.js                      server function for the AI tabs (Vercel)
vercel.json                    gives the AI function up to 120 seconds
package.json                   server dependency
media/coolreeltool-launch.mp4  launch video
```

## Notes

- Exports record in real time, so keep the tab in front while exporting.
- Only post clips you own or have permission to use, and credit the source in the byline.
