import { useLayoutEffect, useRef, useState } from 'react'
import { SCREEN_RECT } from '../lib/config'
import './DeskScene.css'

/** Native desk photo dimensions */
const IMG_W = 2528
const IMG_H = 1686

type ScreenRect = { top: number; left: number; width: number; height: number }

type DeskSceneProps = {
  mode: 'room' | 'zooming' | 'desktop'
  onOpenDesktop: (screenRect: ScreenRect) => void
  onBackHome: () => void
}

function coverLayout(vw: number, vh: number) {
  // Scale to cover the viewport fully.
  const scale = Math.max(vw / IMG_W, vh / IMG_H)
  const width = IMG_W * scale
  const height = IMG_H * scale

  // First pass: pin to the top, crop the bottom (and center horizontally).
  let top = 0
  const left = (vw - width) / 2

  // Last resort: if anything still short of full height (shouldn't happen with
  // cover), shift upward so we crop the top instead of leaving a gap.
  if (top + height < vh) {
    top = vh - height
  }

  return { width, height, top, left }
}

export function DeskScene({ mode, onOpenDesktop, onBackHome }: DeskSceneProps) {
  const sceneRef = useRef<HTMLDivElement>(null)
  const hotspotRef = useRef<HTMLButtonElement>(null)
  const [hintVisible, setHintVisible] = useState(false)

  useLayoutEffect(() => {
    const scene = sceneRef.current
    if (!scene) return

    const apply = () => {
      const { width, height, top, left } = coverLayout(
        window.innerWidth,
        window.innerHeight,
      )
      scene.style.width = `${width}px`
      scene.style.height = `${height}px`
      scene.style.top = `${top}px`
      scene.style.left = `${left}px`
    }

    apply()
    window.addEventListener('resize', apply)
    return () => window.removeEventListener('resize', apply)
  }, [])

  const interactive = mode === 'room'
  const showChrome = mode === 'room'

  return (
    <div className={`desk-view ${mode !== 'room' ? 'is-zoomed' : ''}`}>
      {showChrome && (
        <button type="button" className="desk-back" onClick={onBackHome}>
          ← Home
        </button>
      )}

      <div className="desk-stage">
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
