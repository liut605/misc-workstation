import { useEffect, useRef } from 'react'
import { BROWSER_TABS, type AppTab } from '../lib/config'
import { leaveWorkstation } from '../lib/navigate'
import './DesktopBrowser.css'

type DesktopBrowserProps = {
  active: boolean
  activeTabId: string
  onActiveTabChange: (tabId: string) => void
  onExit: () => void
  /** Fires once the active tab’s document is ready (or immediately for placeholders). */
  onContentReady?: () => void
}

export function DesktopBrowser({
  active,
  activeTabId,
  onActiveTabChange,
  onExit,
  onContentReady,
}: DesktopBrowserProps) {
  const shellRef = useRef<HTMLDivElement>(null)
  const readySent = useRef(false)
  const activeTab =
    BROWSER_TABS.find((t) => t.id === activeTabId) ?? BROWSER_TABS[0]

  const signalReady = () => {
    if (readySent.current) return
    readySent.current = true
    onContentReady?.()
  }

  useEffect(() => {
    readySent.current = false
    if (!activeTab.url) {
      // Placeholder tabs are ready immediately.
      signalReady()
    }
  }, [activeTab.id, activeTab.url])

  useEffect(() => {
    if (!active) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onExit()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active, onExit])

  // Cross-origin iframes still fire load; failsafe so zoom never hangs.
  useEffect(() => {
    if (!activeTab.url) return
    const t = window.setTimeout(signalReady, 900)
    return () => window.clearTimeout(t)
  }, [activeTab.id, activeTab.url])

  const handleTabSelect = (tab: AppTab) => {
    if (tab.leaveTo) {
      leaveWorkstation(tab.leaveTo)
      return
    }
    onActiveTabChange(tab.id)
  }

  return (
    <div
      ref={shellRef}
      className="desktop-shell"
      aria-hidden={!active}
      style={{ opacity: active ? 1 : 0, pointerEvents: active ? 'auto' : 'none' }}
    >
      <div className="browser-window" role="dialog" aria-label="Browser">
        <div className="browser-titlebar">
          <div className="tab-strip" role="tablist" aria-label="Browser tabs">
            {BROWSER_TABS.map((tab) => (
              <TabButton
                key={tab.id}
                tab={tab}
                selected={tab.id === activeTab.id}
                onSelect={() => handleTabSelect(tab)}
              />
            ))}
          </div>
          <button
            type="button"
            className="browser-close"
            aria-label="Close browser and return to desk"
            onClick={onExit}
          >
            <span aria-hidden="true" />
          </button>
        </div>

        <div className="browser-content">
          {activeTab.url ? (
            <iframe
              key={activeTab.id}
              title={activeTab.label}
              src={activeTab.url}
              className="app-frame"
              allow="fullscreen"
              onLoad={signalReady}
            />
          ) : (
            <div className="tab-placeholder">
              <p className="placeholder-kicker">{activeTab.label}</p>
              <p>{activeTab.placeholder}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function TabButton({
  tab,
  selected,
  onSelect,
}: {
  tab: AppTab
  selected: boolean
  onSelect: () => void
}) {
  const leaves = Boolean(tab.leaveTo)
  return (
    <button
      type="button"
      className={`tab ${selected ? 'is-active' : ''} ${leaves ? 'tab--leave' : ''}`}
      role="tab"
      aria-selected={selected}
      aria-label={
        leaves
          ? `${tab.label} — leave workstation for tsingliu.info`
          : tab.label
      }
      title={leaves ? 'Back to Tsing Liu · tsingliu.info' : undefined}
      onClick={onSelect}
    >
      <span className="tab-main">{tab.label}</span>
    </button>
  )
}
