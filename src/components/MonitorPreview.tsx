import { BROWSER_TABS, type AppTab } from '../lib/config'
import './MonitorPreview.css'

type MonitorPreviewProps = {
  tabId: string
  className?: string
  /** When true, scale a desktop-sized page into the box so sites stay readable. */
  scaleDesktop?: boolean
}

function resolveTab(tabId: string): AppTab {
  return BROWSER_TABS.find((t) => t.id === tabId) ?? BROWSER_TABS[0]
}

/**
 * Last-viewed browser page, used on the desk iMac screen and during the
 * screen morph so zoom out/in preserves what the user was looking at.
 */
export function MonitorPreview({
  tabId,
  className = '',
  scaleDesktop = true,
}: MonitorPreviewProps) {
  const tab = resolveTab(tabId)

  return (
    <div className={`monitor-preview ${className}`.trim()}>
      {tab.url ? (
        scaleDesktop ? (
          <div className="monitor-preview__scale">
            <iframe
              title={`${tab.label} preview`}
              src={tab.url}
              className="monitor-preview__frame"
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
