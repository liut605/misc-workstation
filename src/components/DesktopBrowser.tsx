import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { BROWSER_TABS, type AppTab } from '../lib/config'
import './DesktopBrowser.css'

type DesktopBrowserProps = {
  active: boolean
  onExit: () => void
}

export function DesktopBrowser({ active, onExit }: DesktopBrowserProps) {
  const [tabs, setTabs] = useState(BROWSER_TABS)
  const [activeId, setActiveId] = useState(BROWSER_TABS[0].id)
  const shellRef = useRef<HTMLDivElement>(null)
  const activeTab = tabs.find((t) => t.id === activeId) ?? tabs[0]

  useEffect(() => {
    if (!shellRef.current) return
    gsap.to(shellRef.current, {
      opacity: active ? 1 : 0,
      scale: active ? 1 : 0.96,
      duration: active ? 0.55 : 0.35,
      ease: active ? 'power3.out' : 'power2.in',
      pointerEvents: active ? 'auto' : 'none',
    })
  }, [active])

  useEffect(() => {
    if (!active) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onExit()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active, onExit])

  return (
    <div
      ref={shellRef}
      className="desktop-shell"
      aria-hidden={!active}
      style={{ opacity: 0, pointerEvents: 'none' }}
    >
      <div className="desktop-wallpaper" aria-hidden="true" />

      <header className="desktop-menubar">
        <div className="menubar-left">
          <span className="apple-mark" aria-hidden="true" />
          <strong>Finder</strong>
          <span>File</span>
          <span>Edit</span>
          <span>View</span>
        </div>
        <div className="menubar-right">
          <time dateTime="2026-09-04">Fri 4:27 PM</time>
        </div>
      </header>

      <div className="desktop-stage">
        <div className="browser-window" role="dialog" aria-label="Browser">
          <div className="browser-titlebar">
            <div className="traffic">
              <button
                type="button"
                className="traffic-btn close"
                aria-label="Close browser and return to desk"
                onClick={onExit}
              />
              <span className="traffic-btn minimize" aria-hidden="true" />
              <span className="traffic-btn zoom" aria-hidden="true" />
            </div>
            <div className="tab-strip" role="tablist" aria-label="Browser tabs">
              {tabs.map((tab) => (
                <TabButton
                  key={tab.id}
                  tab={tab}
                  selected={tab.id === activeId}
                  onSelect={() => setActiveId(tab.id)}
                  onClose={() => {
                    if (tabs.length <= 1) return
                    const next = tabs.filter((t) => t.id !== tab.id)
                    setTabs(next)
                    if (activeId === tab.id) setActiveId(next[0].id)
                  }}
                />
              ))}
            </div>
          </div>

          <div className="browser-toolbar">
            <div className="nav-btns" aria-hidden="true">
              <span className="nav-chevron">‹</span>
              <span className="nav-chevron">›</span>
            </div>
            <div className="url-bar">
              <span className="lock" aria-hidden="true" />
              <span className="url-text">
                {activeTab.url ?? 'about:blank'}
              </span>
            </div>
          </div>

          <div className="browser-content">
            {activeTab.url ? (
              <iframe
                key={activeTab.id}
                title={activeTab.label}
                src={activeTab.url}
                className="app-frame"
                allow="fullscreen"
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

      <button type="button" className="exit-desk" onClick={onExit}>
        ← Back to desk
      </button>
    </div>
  )
}

function TabButton({
  tab,
  selected,
  onSelect,
  onClose,
}: {
  tab: AppTab
  selected: boolean
  onSelect: () => void
  onClose: () => void
}) {
  return (
    <div
      className={`tab ${selected ? 'is-active' : ''}`}
      role="tab"
      aria-selected={selected}
    >
      <button type="button" className="tab-main" onClick={onSelect}>
        {tab.label}
      </button>
      <button
        type="button"
        className="tab-close"
        aria-label={`Close ${tab.label}`}
        onClick={(e) => {
          e.stopPropagation()
          onClose()
        }}
      >
        ×
      </button>
    </div>
  )
}
