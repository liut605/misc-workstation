/** Percentage of the desk image occupied by the iMac screen content.
 *  Flushed to the inner edge of the black bezel (no gray gap). */
export const SCREEN_RECT = {
  left: 0.34651898734177217,
  top: 0.44187425860023727,
  width: 0.33188291139240506,
  height: 0.28113879003558717,
} as const

/** Native pixel size of the screen content area in desk-final.jpg */
export const SCREEN_PIXELS = { width: 839, height: 474 } as const

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
