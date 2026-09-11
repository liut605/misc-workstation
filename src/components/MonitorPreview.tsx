import { useLayoutEffect, useRef } from 'react'
import {
  BROWSER_TABS,
  SCREEN_PIXELS,
  type AppTab,
} from '../lib/config'
import './MonitorPreview.css'

/** Desktop canvas matching the iMac screen aspect (from SCREEN_PIXELS). */
const SCREEN_ASPECT = SCREEN_PIXELS.width / SCREEN_PIXELS.height
const DESKTOP_W = 1440
const DESKTOP_H = Math.round(DESKTOP_W / SCREEN_ASPECT)

type MonitorPreviewProps = {
  tabId: string
  className?: string
  /** Scale a desktop-sized page into the box so sites stay readable and fill the screen. */
  scaleDesktop?: boolean
}

function resolveTab(tabId: string): AppTab {
  return BROWSER_TABS.find((t) => t.id === tabId) ?? BROWSER_TABS[0]
}

/**
 * Last-viewed browser page on the desk iMac screen.
 * Uses the same aspect ratio as SCREEN_PIXELS so the preview fills the bezel.
 */
export function MonitorPreview({
  tabId,
  className = '',
  scaleDesktop = true,
}: MonitorPreviewProps) {
  const tab = resolveTab(tabId)
  const rootRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    if (!scaleDesktop || !tab.url) return
    const root = rootRef.current
    const stage = stageRef.current
    if (!root || !stage) return

    stage.style.width = `${DESKTOP_W}px`
    stage.style.height = `${DESKTOP_H}px`

    const fit = () => {
      const w = root.clientWidth
      const h = root.clientHeight
      if (w <= 0 || h <= 0) return
      // Aspects match the monitor, so this fills the screen edge-to-edge.
      const s = Math.min(w / DESKTOP_W, h / DESKTOP_H)
      const ox = (w - DESKTOP_W * s) / 2
      const oy = (h - DESKTOP_H * s) / 2
      stage.style.transform = `translate(${ox}px, ${oy}px) scale(${s})`
    }

    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(root)
    return () => ro.disconnect()
  }, [scaleDesktop, tab.url, tabId])

  return (
    <div ref={rootRef} className={`monitor-preview ${className}`.trim()}>
      {tab.url ? (
        scaleDesktop ? (
          <div ref={stageRef} className="monitor-preview__scale">
            <iframe
              title={`${tab.label} preview`}
              src={tab.url}
              className="monitor-preview__frame"
              style={{ width: DESKTOP_W, height: DESKTOP_H }}
              tabIndex={-1}
              loading="lazy"
            />
          </div>
        ) : (
          <iframe
            title={`${tab.label} preview`}
            src={tab.url}
            className="monitor-preview__frame monitor-preview__frame--fill"
            tabIndex={-1}
            loading="lazy"
          />
        )
      ) : (
        <div className="monitor-preview__placeholder">
          <p className="monitor-preview__kicker">{tab.label}</p>
          <p>{tab.placeholder ?? 'Empty tab'}</p>
        </div>
      )}
    </div>
  )
}
