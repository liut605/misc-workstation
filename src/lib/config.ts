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
