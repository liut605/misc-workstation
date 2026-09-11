import { useLayoutEffect, useRef } from 'react'
import {
  BROWSER_TABS,
  SCREEN_PIXELS,
  type AppTab,
} from '../lib/config'
import './DesktopBrowser.css'
import './MonitorPreview.css'

/** Logical canvas for the desk preview — smaller than fullscreen so chrome stays readable when scaled into the bezel. */
const SCREEN_ASPECT = SCREEN_PIXELS.width / SCREEN_PIXELS.height
const DESKTOP_W = 960
const DESKTOP_H = Math.round(DESKTOP_W / SCREEN_ASPECT)

type MonitorPreviewProps = {
  tabId: string
  className?: string
}

function resolveTab(tabId: string): AppTab {
  return BROWSER_TABS.find((t) => t.id === tabId) ?? BROWSER_TABS[0]
}

/**
 * Mini browser on the desk iMac — same chrome + tabs as the fullscreen browser,
 * scaled into the bezel so zoom-out still shows the full tab strip.
 */
export function MonitorPreview({ tabId, className = '' }: MonitorPreviewProps) {
  const tab = resolveTab(tabId)
  const rootRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const root = rootRef.current
    const stage = stageRef.current
    if (!root || !stage) return

    stage.style.width = `${DESKTOP_W}px`
    stage.style.height = `${DESKTOP_H}px`

    const fit = () => {
      const w = root.clientWidth
      const h = root.clientHeight
      if (w <= 0 || h <= 0) return
      // Cover + overscale: contain-fit leaves hairline gaps; bias fill past
      // the bezel so top/right never show the screen backing.
      const s = Math.max(w / DESKTOP_W, h / DESKTOP_H) * 1.012
      // Prefer clipping bottom/left slightly so the tab strip stays inside.
      const ox = (w - DESKTOP_W * s) * 0.35
      const oy = (h - DESKTOP_H * s) * 0.2
      stage.style.transform = `translate(${ox}px, ${oy}px) scale(${s})`
    }

    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(root)
    return () => ro.disconnect()
  }, [tab.url, tabId])

  return (
    <div ref={rootRef} className={`monitor-preview ${className}`.trim()}>
      <div ref={stageRef} className="monitor-preview__scale">
        <div
          className="browser-window monitor-preview__window"
          style={{ width: DESKTOP_W, height: DESKTOP_H }}
          aria-hidden
        >
          <div className="browser-titlebar">
            <div className="tab-strip" role="presentation">
              {BROWSER_TABS.map((t) => (
                <span
                  key={t.id}
                  className={`tab ${t.id === tab.id ? 'is-active' : ''}`}
                >
                  <span className="tab-main">{t.label}</span>
                </span>
              ))}
            </div>
            <span className="browser-close monitor-preview__close-decoy" aria-hidden>
              <span />
            </span>
          </div>

          <div className="browser-content">
            {tab.url ? (
              <iframe
                title={`${tab.label} preview`}
                src={tab.url}
                className="app-frame"
                tabIndex={-1}
                loading="lazy"
              />
            ) : (
              <div className="tab-placeholder">
                <p className="placeholder-kicker">{tab.label}</p>
                <p>{tab.placeholder ?? 'Empty tab'}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
