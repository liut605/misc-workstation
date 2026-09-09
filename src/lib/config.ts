/** Percentage of desk-final.jpg occupied by the iMac screen (16:9). */
export const SCREEN_RECT = {
  left: 0.36664244186046513,
  top: 0.44140625,
  width: 0.2805232558139535,
  height: 0.283203125,
} as const

export const SCREEN_PIXELS = { width: 772, height: 435 } as const

/** Native desk photo size */
export const DESK_IMAGE = { width: 2752, height: 1536 } as const

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
  left: 0.12,
  top: 0.62,
  width: 0.3,
  height: 0.34,
  /** Visual center of the open spread (for camera aim). */
  centerX: 0.265,
  centerY: 0.86,
  /**
   * Enter/exit uses Flow zoom clip (`zoomVideo`), then hands off to
   * `public/sketchbook-overhead.jpg` for interactive page turns.
   * Legacy 2D dolly kept only as a no-video fallback.
   */
  zoomVideo: '/sketchbook-zoom.mp4',
  /** Start crossfade to overhead this many seconds before clip end. */
  zoomHandoffLead: 0.35,
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
  /** Full-frame manual left mask aligned to sketchbook-overhead.jpg (1376×768). */
  leftMask: '/sketchbook-mask-left.png',
  /** Set when the right-page mask is uploaded. */
  rightMask: null as string | null,
  /** Union of both pages — used for nav placement / focus. */
  pageRect: {
    left: 0.20784883720930233,
    top: 0.109375,
    width: 0.5850290697674418,
    height: 0.7786458333333334,
  },
  /** From manual left-page mask alpha bbox on the 1376×768 overhead. */
  leftPage: {
    left: 0.20784883720930233,
    top: 0.109375,
    width: 0.2936046511627907,
    height: 0.7786458333333334,
  },
  /** Approximate right plate until the right mask arrives. */
  rightPage: {
    left: 0.501453488372093,
    top: 0.109375,
    width: 0.2914244186046512,
    height: 0.7786458333333334,
  },
} as const

export type AppTab = {
  id: string
  label: string
  url: string | null
  placeholder?: string
}

export const BROWSER_TABS: AppTab[] = [
  {
    id: 'rooted-nyc',
    label: 'Rooted NYC',
    url: 'https://rooted-nyc.tsingliu.info/',
  },
  {
    id: 'string-of-pearls',
    label: 'String of Pearls',
    url: null,
    placeholder: 'Link coming once the prototype is ready.',
  },
  {
    id: 'placeholder-a',
    label: 'Studio Notes',
    url: null,
    placeholder: 'Placeholder tab — URL TBD.',
  },
  {
    id: 'placeholder-b',
    label: 'New Tab',
    url: null,
    placeholder: 'Another experiment will land here.',
  },
]
