import { useLayoutEffect, useRef } from 'react'
import {
  BROWSER_TABS,
  SCREEN_PIXELS,
  type AppTab,
} from '../lib/config'
import './DesktopBrowser.css'
import './MonitorPreview.css'

/**
 * Same aspect as the lit iMac panel / fullscreen browser so titlebar + tabs
 * take the same fraction of the screen when scaled into the bezel.
 */
const SCREEN_ASPECT = SCREEN_PIXELS.width / SCREEN_PIXELS.height
/** Typical desktop width — matches fullscreen chrome proportions (44px bar, 12px type). */
const DESKTOP_W = 1440
const DESKTOP_H = Math.round(DESKTOP_W / SCREEN_ASPECT)

type MonitorPreviewProps = {
  tabId: string
  className?: string
}

function resolveTab(tabId: string): AppTab {
  return BROWSER_TABS.find((t) => t.id === tabId) ?? BROWSER_TABS[0]
}

/** Navigate the top window so Webflow/Misc embeds leave the workstation. */
function leaveWorkstation(url: string) {
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
 * Mini browser on the desk iMac — identical chrome proportions to the
 * fullscreen browser, fitted exactly inside the lit LCD.
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
      // Exact fit to the lit panel — no overscale onto the photo’s LCD lip.
      const s = Math.min(w / DESKTOP_W, h / DESKTOP_H)
      const ox = (w - DESKTOP_W * s) / 2
      const oy = (h - DESKTOP_H * s) / 2
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
        >
          <div className="browser-titlebar">
            <div className="tab-strip" role="presentation">
              {BROWSER_TABS.map((t) =>
                t.leaveTo ? (
                  <button
                    key={t.id}
                    type="button"
                    className={`tab tab--leave ${t.id === tab.id ? 'is-active' : ''}`}
                    title="Back to portfolio · tsingliu.info"
                    aria-label={`${t.label} — leave workstation for tsingliu.info`}
                    onClick={(e) => {
                      e.stopPropagation()
                      leaveWorkstation(t.leaveTo!)
                    }}
                  >
                    <span className="tab-main">{t.label}</span>
                    <span className="tab-close tab-close-decoy" aria-hidden />
                  </button>
                ) : (
                  <span
                    key={t.id}
                    className={`tab ${t.id === tab.id ? 'is-active' : ''}`}
                    aria-hidden
                  >
                    <span className="tab-main">{t.label}</span>
                    <span className="tab-close tab-close-decoy" aria-hidden />
                  </span>
                ),
              )}
            </div>
            <span className="browser-close monitor-preview__close-decoy" aria-hidden>
              <span />
            </span>
          </div>

          <div className="browser-content" aria-hidden>
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
