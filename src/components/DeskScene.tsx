import { useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { SCREEN_RECT } from '../lib/config'
import './DeskScene.css'

type ScreenRect = { top: number; left: number; width: number; height: number }

type DeskSceneProps = {
  mode: 'room' | 'zooming' | 'desktop'
  onOpenDesktop: (screenRect: ScreenRect) => void
  onBackHome: () => void
}

export function DeskScene({ mode, onOpenDesktop, onBackHome }: DeskSceneProps) {
  const stageRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<HTMLDivElement>(null)
  const hotspotRef = useRef<HTMLButtonElement>(null)
  const [hintVisible, setHintVisible] = useState(false)

  useLayoutEffect(() => {
    const scene = sceneRef.current
    if (!scene) return

    // Room stays still; zoom is handled by the morph overlay in App.
    if (mode === 'room') {
      gsap.set(scene, { scale: 1, xPercent: 0, yPercent: 0 })
    }
  }, [mode])

  const interactive = mode === 'room'
  const showChrome = mode === 'room'

  return (
    <div className={`desk-view ${mode !== 'room' ? 'is-zoomed' : ''}`}>
      {showChrome && (
        <button type="button" className="desk-back" onClick={onBackHome}>
          ← Home
        </button>
      )}

      <div ref={stageRef} className="desk-stage">
        <div ref={sceneRef} className="desk-scene">
          <img
            className="desk-photo"
            src="/desk-final.jpg"
            alt="Workstation desk with blank frames, monitor, sketchbook, and camera"
            draggable={false}
          />
          <img
            className="screen-idle"
            src="/browser-idle-screenshot.jpg"
            alt=""
            aria-hidden="true"
            style={{
              left: `${SCREEN_RECT.left * 100}%`,
              top: `${SCREEN_RECT.top * 100}%`,
              width: `${SCREEN_RECT.width * 100}%`,
              height: `${SCREEN_RECT.height * 100}%`,
              opacity: mode === 'room' ? 1 : 0,
            }}
          />
          <button
            ref={hotspotRef}
            type="button"
            className="screen-hotspot"
            aria-label="Click the screen to enter projects"
            disabled={!interactive}
            onMouseEnter={() => interactive && setHintVisible(true)}
            onMouseLeave={() => setHintVisible(false)}
            onFocus={() => interactive && setHintVisible(true)}
            onBlur={() => setHintVisible(false)}
            onClick={() => {
              const el = hotspotRef.current
              if (!el) return
              const r = el.getBoundingClientRect()
              onOpenDesktop({
                top: r.top,
                left: r.left,
                width: r.width,
                height: r.height,
              })
            }}
            style={{
              left: `${SCREEN_RECT.left * 100}%`,
              top: `${SCREEN_RECT.top * 100}%`,
              width: `${SCREEN_RECT.width * 100}%`,
              height: `${SCREEN_RECT.height * 100}%`,
            }}
          />
        </div>
      </div>

      {showChrome && (
        <p
          className={`desk-hint ${hintVisible ? 'is-visible' : ''}`}
          aria-hidden={!hintVisible}
        >
          Click the screen to enter projects
        </p>
      )}
    </div>
  )
}
