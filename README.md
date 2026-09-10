# Misc Workstation Prototype

Interactive desk experience for Tsing Liu’s portfolio Misc page.

## What this prototype covers (V1)

1. **Home → Misc entry** — hover Misc to preview the desk still; click expands full-screen into the workstation.
2. **Desk room** — final desk photograph with the monitor showing a browser screenshot (Rooted NYC tabs UI).
3. **Zoom into desktop** — opens a desktop mockup with a browser:
   - **Rooted NYC** → live iframe at `https://rooted-nyc.tsingliu.info/`
   - **String of Pearls** → live iframe at `https://string-of-pearls.tsingliu.info/`
   - Other tabs → placeholders until URLs are ready
4. **Sketchbook zoom** — click the open notebook to play the Flow zoom-out clip (`public/sketchbook-zoom.mp4`) **in reverse** (desk → book), then hand off to the overhead still for interactive page turns (click pages or ‹ › / arrow keys). Exit (× or Escape) plays the clip forward (book → desk).
5. Wall frames show a **Coming soon** hover hint (interaction TBD).


## Run locally

```bash
npm install
npm run dev
```

Dev server: [http://127.0.0.1:43123](http://127.0.0.1:43123)

## Key files

- `public/desk-final.jpg` — room still (monitor content baked in)
- `public/sketchbook-zoom.mp4` — Flow zoom-out (book → desk); enter plays reverse
- `public/sketchbook-overhead.jpg` — top-down still for page turns
- `src/lib/config.ts` — screen/notebook hotspot rects, zoom video path, tab URLs
- `src/components/DeskScene.tsx` — room + monitor morph + sketchbook video zoom
- `src/components/SketchbookPages.tsx` — spine-hinged page turns
- `src/components/DesktopBrowser.tsx` — OS/browser chrome + iframe

---

## Webflow migration plan (revisited)

Goal: ship this Misc desk on `tsingliu.info` without rebuilding the GSAP / video / page-turn logic inside native Webflow Designer.

### Recommended approach: **hosted embed**, not a Webflow rebuild

| Layer | Own in Webflow | Keep outside Webflow |
| --- | --- | --- |
| Home Misc hover preview + click CTA | Yes — CMS / interactions / lightbox or page link | — |
| Full desk room, monitor morph, sketchbook video, page turns | — | This Vite app (static build or Vercel) |
| Live project tabs (Rooted NYC, String of Pearls) | — | Existing project sites in iframes |

**Why not rebuild natively in Webflow**

- Hotspot % rects, cover-fit stages, reverse video playback, and spine page turns are stateful and timing-sensitive — painful in IX2 / custom code snippets alone.
- The zoom mp4 is large; Webflow’s asset uploader is a poor fit for iteration.
- Monitor iframes already work against live Vercel origins; an embed keeps that path unchanged.

### Suggested site map

1. **Home** — Misc tile: desk still as hover preview; click → full experience.
2. **`/work/misc` (or `/misc`)** — full-bleed embed of the built prototype (`iframe` or Webflow embed code pointing at the hosted build).
3. Optional later: deep-link query (`?focus=monitor` / `?focus=sketchbook`) if Home should land mid-scene.

### Hosting the prototype

1. `npm run build` → static assets under `dist/`.
2. Deploy to a stable URL (e.g. `misc.tsingliu.info` or a path on the portfolio host).
3. In Webflow, embed that URL full-viewport on the Misc page (`width/height: 100%`, no scrollbars on the shell).
4. Host **heavy media** (especially `sketchbook-zoom.mp4`) on a CDN or the same static host; point `config` / env at absolute URLs so Webflow never needs to re-upload the clip.

### Home Misc interaction (Webflow-owned)

- Hover: swap / crossfade to `desk-final.jpg` (or a short looping preview if you add one later).
- Click: navigate to the Misc page **or** open a full-screen overlay that loads the embed (prefer a real page for shareable URLs and mobile back-button behavior).

### Iframe / framing checklist

- Rooted NYC and String of Pearls currently allow embedding (no blocking `X-Frame-Options` on last check).
- After the portfolio origin changes (Webflow custom domain), re-check both sites still allow framing from that origin / CSP `frame-ancestors`.
- If a project blocks framing, open it in a new tab from the desktop chrome instead of the iframe.

### What stays out of the first Webflow ship

- Wall-frame interaction (Coming soon is fine).
- Extra browser tabs until URLs exist.
- Auth / CMS for sketchbook drawings (keep drawings as static assets unless you need editors to swap pages without a deploy).

### Migration sequence

1. Freeze V1 behavior in this repo (hotspots, tabs, zoom direction, page order).
2. Production-build + deploy the prototype to a public URL.
3. Add Webflow Misc page with full-bleed embed; wire Home hover → that page.
4. QA: desktop + mobile, monitor tabs, sketchbook enter/exit, Escape / close.
5. Only then consider peeling pieces into native Webflow (e.g. a simpler Home preview) — not the desk state machine.

### When a native Webflow rebuild *would* make sense

Only if you later strip the experience down to a single still + one click-through, or replace the video zoom with a short Lottie / Webflow video background and drop interactive page turns. The current prototype is past that threshold.
