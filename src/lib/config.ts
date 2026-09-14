/** Percentage of desk-final.jpg occupied by the iMac screen (16:9). */
export const SCREEN_RECT = {
  left: 0.36664244186046513,
  top: 0.4410807291666667,
  width: 0.2805232558139535,
  height: 0.283203125,
} as const

export const SCREEN_PIXELS = { width: 1544, height: 870 } as const

/**
 * Black LCD bezel around the lit panel — pads as a fraction of SCREEN_RECT
 * size, measured from the monitor screen+bezel reference crop.
 */
export const SCREEN_BEZEL = {
  left: 0.022,
  right: 0.022,
  top: 0.043,
  bottom: 0.043,
} as const

/** Lit screen + black LCD lip only (not the silver iMac chassis). */
export const SCREEN_FRAME_RECT = {
  left: SCREEN_RECT.left - SCREEN_RECT.width * SCREEN_BEZEL.left,
  top: SCREEN_RECT.top - SCREEN_RECT.height * SCREEN_BEZEL.top,
  width: SCREEN_RECT.width * (1 + SCREEN_BEZEL.left + SCREEN_BEZEL.right),
  height: SCREEN_RECT.height * (1 + SCREEN_BEZEL.top + SCREEN_BEZEL.bottom),
} as const

/**
 * Whole iMac (bezel + chin), image-normalized — camera dolly target so
 * enter/exit feel like pushing into the computer, not enlarging the screen alone.
 */
export const COMPUTER_RECT = {
  left: 0.342,
  top: 0.348,
  width: 0.33,
  height: 0.455,
} as const

/** Monitor click → fullscreen browser camera + chrome morph. */
export const SCREEN_ZOOM = {
  /** Desk dolly + browser FLIP share this duration (enter). */
  dollyDurationIn: 1.45,
  /** Desk dolly + browser FLIP share this duration (exit). */
  dollyDurationOut: 1.25,
  /** Soften the desk under the expanding browser near the end of enter. */
  deskDim: 0.28,
  /** Push slightly past a perfect cover-fit so the move reads as a real lean-in. */
  overscale: 1.08,
  /**
   * Keep the black iMac bezel through most of the morph; fade it only after
   * this progress (0–1) so the frame disappears near completion.
   */
  bezelFadeStart: 0.78,
} as const

/**
 * Gallery wall hover region (image-normalized). Screen + notebook hotspots
 * sit above this so they keep their own hints / clicks.
 */
export const WALL = {
  left: 0,
  top: 0,
  width: 1,
  height: 0.68,
} as const

/** Native desk photo size */
export const DESK_IMAGE = { width: 5504, height: 3072 } as const

/** Native sketchbook overhead / mask size */
export const OVERHEAD_IMAGE = { width: 1376, height: 768 } as const

/**
 * Open sketchbook on the left of the desk (image-normalized 0–1).
 *
 * Perspective notes (from desk-final.jpg):
 * - Book sits left of the iMac, lower third of frame, on the wood desk.
 * - Open blank spread; no pen in current still.
 * - Strong foreshortening: near (bottom) edge wider than far (top) edge —
 *   classic top-down-from-slightly-in-front desk photo.
 * - Spine runs roughly vertical with a slight CCW tilt (~12–16°) in frame;
 *   clockwise rotateZ ~14° brings pages level for reading.
 * - Hotspot AABB is generous for click; zoom centers on the open spread.
 */
export const NOTEBOOK = {
  /** Generous click AABB around the open book. */
  left: 0.15,
  top: 0.78,
  width: 0.28,
  height: 0.18,
  /** Visual center of the open spread — aligned to the marked book box. */
  centerX: 0.279,
  centerY: 0.889,
  /**
   * Enter/exit uses Flow zoom clip (`zoomVideo`), then hands off to
   * `public/sketchbook-overhead.jpg` for interactive page turns.
   * Legacy 2D dolly kept only as a no-video fallback.
   */
  zoomVideo: '/sketchbook-zoom.mp4',
  /**
   * Clip timeline is book → desk (zoom out). Enter plays it reverse;
   * exit plays it forward.
   */
  zoomVideoIsZoomOut: true,
  /** Playback rate for zoom in/out clip (2 = twice real-time). */
  zoomPlaybackRate: 2,
  /**
   * Skip media time at the book end of the clip (end of zoom-in / start of zoom-out).
   */
  zoomEdgeSkipBook: 0.2,
  /**
   * Skip media time at the desk end of the clip (start of zoom-in / end of zoom-out).
   * Kept shorter than the book skip so enter/exit don’t jump too far off the desk still.
   */
  zoomEdgeSkipDesk: 0.1,
  /** Instant cut to overhead this many seconds before the book end of the clip (media time). Keep tiny — only enough to avoid decoder edge glitches. */
  zoomHandoffLead: 0.02,
  /** Crossfade duration for every video ↔ workstation / interactive-book handoff. */
  zoomHandoffFade: 0.4,
  zoom: {
    scale: 4.0,
    rotateZ: 4,
    duration: 1.15,
    overheadFadeAt: 0.42,
  },
} as const

/**
 * Top-down sketchbook reader.
 * Silhouettes come from manual full-frame PNG masks (same size as overhead).
 * Auto-cropped page JPGs have been removed.
 */
export const SKETCHBOOK = {
  /** Full-frame manual masks aligned to sketchbook-overhead.jpg (1376×768). */
  leftMask: '/sketchbook-mask-left.png',
  rightMask: '/sketchbook-mask-right.png',
  /** Union of both pages — used for nav placement / focus. */
  pageRect: {
    left: 0.20784883720930233,
    top: 0.109375,
    width: 0.5872093023255813,
    height: 0.7799479166666666,
  },
  /**
   * Page plates: cropped from the full-frame masks using each mask’s alpha bbox,
   * then placed with image-normalized % inside the overhead cover-fit stage
   * (same coordinate space as sketchbook-overhead.jpg pixels).
   */
  leftPage: {
    left: 0.20784883720930233,
    top: 0.109375,
    width: 0.2936046511627907,
    height: 0.7786458333333334,
  },
  /** From manual right-page mask alpha bbox. */
  rightPage: {
    left: 0.5,
    top: 0.11328125,
    width: 0.29505813953488375,
    height: 0.7760416666666666,
  },
  /** Blank cream plates (manual mask crops) under multiply drawings. */
  blankLeft: '/sketchbook-page-blank-left.png',
  blankRight: '/sketchbook-page-blank-right.png',
  /**
   * Drawing spreads — shown side-by-side (left | right).
   * Order: 6|5, then 1|2, then 3|4.
   */
  spreads: [
    {
      id: '6-5',
      left: '/drawings/drawing-6.jpg',
      right: '/drawings/drawing-5.jpg',
    },
    {
      id: '1-2',
      left: '/drawings/drawing-1.jpg',
      right: '/drawings/drawing-2.jpg',
    },
    {
      id: '3-4',
      left: '/drawings/drawing-3.jpg',
      right: '/drawings/drawing-4.jpg',
    },
  ],
} as const

export type AppTab = {
  id: string
  label: string
  url: string | null
  placeholder?: string
  /**
   * Leave the Misc workstation entirely (breaks out of a parent iframe).
   * Used for the meta “back to portfolio” tab on the monitor.
   */
  leaveTo?: string
}

export const PORTFOLIO_URL = 'https://tsingliu.info/'

export const BROWSER_TABS: AppTab[] = [
  {
    id: 'rooted-nyc',
    label: 'Rooted NYC',
    url: 'https://rooted-nyc.tsingliu.info/',
  },
  {
    id: 'string-of-pearls',
    label: 'String of Pearls',
    url: 'https://string-of-pearls.tsingliu.info/',
  },
  {
    id: 'placeholder-a',
    label: 'Studio Notes',
    url: null,
    placeholder: 'Placeholder tab — URL TBD.',
  },
  {
    id: 'portfolio',
    label: 'Portfolio',
    url: null,
    leaveTo: PORTFOLIO_URL,
    placeholder: 'Return to tsingliu.info',
  },
]
