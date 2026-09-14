# Misc Workstation

Interactive desk experience for Tsing Liu’s portfolio **Misc** page. Lands directly on the desk (no Home entry). Built for **laptop / desktop** viewports; narrower screens show a “view on a laptop” notice.

## What’s in V1

1. **Desk room** — final desk photograph with a live monitor preview.
2. **Zoom into desktop** — tabbed browser:
   - **Rooted NYC** → `https://rooted-nyc.tsingliu.info/`
   - **String of Pearls** → `https://string-of-pearls.tsingliu.info/`
   - **Tsing Liu** → leaves the workstation for `https://tsingliu.info/` (also clickable on the desk monitor tab)
3. **Sketchbook zoom** — Flow zoom video + overhead page turns.
4. Wall frames — **Coming soon** hover hint.

## Run locally

```bash
npm install
npm run dev
```

Dev server: [http://127.0.0.1:43123](http://127.0.0.1:43123)

## Deploy on Vercel

1. Push this repo to GitHub.
2. In Vercel → **Add New Project** → import the repo.
3. Framework preset: **Vite** (build `npm run build`, output `dist`).
4. Deploy. Optionally attach a Vercel subdomain, then embed that URL from Webflow on `misc.tsingliu.info`.

`vercel.json` allows framing from `tsingliu.info` / `*.tsingliu.info` / Webflow origins so the Misc page can iframe this build full-bleed.

### Webflow embed (`misc.tsingliu.info`)

On the Misc page, use an Embed (or custom code) with a full-viewport iframe pointing at the Vercel URL, e.g.:

```html
<iframe
  src="https://YOUR-PROJECT.vercel.app"
  title="Misc workstation"
  style="position:fixed;inset:0;width:100%;height:100%;border:0;"
  allow="fullscreen"
></iframe>
```

Keep Home → Misc navigation in Webflow; this app is only the Misc window.

## Key files

- `public/desk-final.jpg` — room still
- `public/sketchbook-zoom.mp4` — Flow zoom-out (enter plays reverse)
- `public/sketchbook-overhead.jpg` — top-down still for page turns
- `src/lib/config.ts` — hotspot rects, zoom path, tab URLs
- `src/components/DeskScene.tsx` — room + monitor + sketchbook
- `src/components/LaptopOnlyGate.tsx` — non-desktop notice
- `src/components/DesktopBrowser.tsx` — OS/browser chrome + iframe
