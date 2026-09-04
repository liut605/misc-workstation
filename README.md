# Misc Workstation Prototype

Interactive desk experience for Tsing Liu’s portfolio Misc page.

## What this prototype covers (V1)

1. **Home → Misc entry** — hover Misc to preview the desk still; click expands full-screen into the workstation.
2. **Desk room** — final desk photograph with the monitor showing a browser screenshot (Rooted NYC tabs UI).
3. **Zoom into desktop** — opens a desktop mockup with a browser:
   - **Rooted NYC** → live iframe at `https://rooted-nyc.tsingliu.info/`
   - **String of Pearls** + other tabs → placeholders until URLs are ready
4. Sketchbook and wall frames are **out of scope** for this pass.

## Run locally

```bash
npm install
npm run dev
```

Dev server: [http://127.0.0.1:43123](http://127.0.0.1:43123)

## Key files

- `public/desk-final.jpg` — room still
- `public/browser-idle-screenshot.jpg` — distant monitor content
- `src/lib/config.ts` — screen hotspot rect + tab URLs
- `src/components/DeskScene.tsx` — room + zoom
- `src/components/DesktopBrowser.tsx` — OS/browser chrome + iframe

## Webflow next step

Port this flow onto `tsingliu.info` Home Misc hover and `/work/misc` (or a dedicated static page), reusing the same assets and GSAP state machine via custom code / hosted embed.
