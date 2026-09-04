import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { BROWSER_TABS, type AppTab } from '../lib/config'
import './DesktopBrowser.css'

type DesktopBrowserProps = {
  active: boolean
  onExit: () => void
}

export function DesktopBrowser({ active, onExit }: DesktopBrowserProps) {
  const [tabs] = useState(BROWSER_TABS)
  const [activeId, setActiveId] = useState(BROWSER_TABS[0].id)
  const shellRef = useRef<HTMLDivElement>(null)
  const activeTab = tabs.find((t) => t.id === activeId) ?? tabs[0]

  useEffect(() => {
    if (!shellRef.current) return
    gsap.to(shellRef.current, {
      opacity: active ? 1 : 0,
      scale: active ? 1 : 0.98,
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
      <div className="browser-window" role="dialog" aria-label="Browser">
        <div className="browser-titlebar">
          <div className="tab-strip" role="tablist" aria-label="Browser tabs">
            {tabs.map((tab) => (
              <TabButton
                key={tab.id}
                tab={tab}
                selected={tab.id === activeId}
                onSelect={() => setActiveId(tab.id)}
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
  return (
    <button
      type="button"
      className={`tab ${selected ? 'is-active' : ''}`}
      role="tab"
      aria-selected={selected}
      onClick={onSelect}
    >
      <span className="tab-main">{tab.label}</span>
    </button>
  )
}
