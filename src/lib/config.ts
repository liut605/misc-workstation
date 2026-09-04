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
   * Approach camera (2D) while zooming toward the open spread, then
   * crossfade to `public/sketchbook-overhead.jpg` (true top-down).
   * Keep rotateZ light — the overhead frame handles final alignment.
   */
  zoom: {
    scale: 4.0,
    rotateZ: 4,
    duration: 1.15,
    overheadFadeAt: 0.42,
  },
} as const

/**
 * Top-down sketchbook reader. Page faces are cream paper only (no khaki cover).
 * `leftPage` / `rightPage` are image-normalized rects inside the overhead still.
 */
export const SKETCHBOOK = {
  /** Union of both pages — used for nav placement / focus. */
  pageRect: {
    left: 0.1711482558139535,
    top: 0.11263020833333333,
    width: 0.6540697674418605,
    height: 0.7669270833333334,
  },
  leftPage: {
    left: 0.1711482558139535,
    top: 0.11263020833333333,
    width: 0.3223110465116279,
    height: 0.7669270833333334,
  },
  rightPage: {
    left: 0.4941860465116279,
    top: 0.11263020833333333,
    width: 0.33103197674418605,
    height: 0.7669270833333334,
  },
  /** Rounded paper corners — fraction of rendered page height. */
  pageRadiusRatio: 0.042,
  spreads: [
    {
      id: 'blank',
      left: '/sketchbook-spread-0-left.jpg',
      right: '/sketchbook-spread-0-right.jpg',
    },
    {
      id: 'circles',
      left: '/sketchbook-spread-1-left.jpg',
      right: '/sketchbook-spread-1-right.jpg',
    },
    {
      id: 'plant',
      left: '/sketchbook-spread-2-left.jpg',
      right: '/sketchbook-spread-2-right.jpg',
    },
    {
      id: 'portrait',
      left: '/sketchbook-spread-3-left.jpg',
      right: '/sketchbook-spread-3-right.jpg',
    },
  ],
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
