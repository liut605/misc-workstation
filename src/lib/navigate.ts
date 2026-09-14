/** Duration of the workstation exit fade before navigating away (ms). */
export const LEAVE_FADE_MS = 520

let leaving = false

/** Navigate the top window so Webflow/Misc embeds leave the workstation. */
export function assignTop(url: string) {
  try {
    if (window.top && window.top !== window.self) {
      window.top.location.assign(url)
      return
    }
  } catch {
    // Cross-origin parent — fall through.
  }
  window.location.assign(url)
}

/**
 * Fade the Misc workstation out, then navigate to `url` (usually the portfolio).
 * Safe to call repeatedly — only the first leave runs.
 */
export function leaveWorkstation(url: string) {
  if (leaving) return
  leaving = true

  const root = document.getElementById('root')
  root?.classList.add('is-leaving')

  window.setTimeout(() => {
    assignTop(url)
  }, LEAVE_FADE_MS)
}
