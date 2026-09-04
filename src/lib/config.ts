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
   * End-state camera: overhead reading pose.
   * The still is shot from in front of the desk; positive rotateX made the
   * book feel even lower/more oblique. Negative rotateX pitches toward
   * top-down (near edge recedes, far edge comes forward). rotateZ squares
   * the ~15° CCW page tilt. Scale leaves a ring of desk around the book.
   */
  zoom: {
    scale: 3.9,
    rotateZ: 15,
    rotateX: -46,
    rotateY: 8,
    perspective: 1600,
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
