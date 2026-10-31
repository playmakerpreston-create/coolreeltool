# CoolReelTool

Turn any clip into a scroll-stopping 9:16 reel: a bold headline, your video in a letterbox frame, an optional profile lockup and a byline. Everything runs in the browser, with no server and no build step.

Watch the launch video: [`media/coolreeltool-launch.mp4`](media/coolreeltool-launch.mp4)

## Run it

Open `index.html` in Chrome, Edge or Safari. That's it.

To host it, serve the folder as static files. For example, turn on **GitHub Pages** (Settings → Pages → Deploy from branch → `main` / root) and the tool is live at `https://<your-username>.github.io/<repo-name>/`.

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
- 1080×1920 with sound (or muted), MP4 (H.264) where the browser supports it, WebM otherwise
- Real-time recording with a progress card, cancel button and locked editing while it runs

**Profiles**
- Save a page's whole look (background, highlight color, frame, lockup, badge, byline) under a name like "Evidence of Aliens"
- Click a card to switch pages; rename, update or delete

**Queue**
- Add reels one after another, then *Export all* and download them as a single .zip

**AI Ideas and Rewrite** need an AI backend and are switched off in this standalone build. See below.

## Storage

In this standalone build, profiles and settings are saved in the browser's local storage. They stay on the device and browser where you made them. Videos are never uploaded anywhere.

## Turning on AI Ideas and Rewrite

These tabs send a prompt and expect JSON back. To enable them on your own site you need a small server endpoint that calls an AI model with your API key (never put the key in `index.html`). Then replace the `sample.json(...)` calls in `index.html` with a `fetch` to that endpoint.

## Project layout

```
index.html                     the whole app (HTML, CSS and JavaScript)
media/coolreeltool-launch.mp4  launch video
```

## Notes

- Exports record in real time, so keep the tab in front while exporting.
- Only post clips you own or have permission to use, and credit the source in the byline.
