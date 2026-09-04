import { useLayoutEffect, useRef, useState } from 'react'
import { DESK_IMAGE, SCREEN_RECT } from '../lib/config'
import './DeskScene.css'

const IMG_W = DESK_IMAGE.width
const IMG_H = DESK_IMAGE.height
const IMG_ASPECT = IMG_W / IMG_H

type ScreenRect = { top: number; left: number; width: number; height: number }

type DeskSceneProps = {
  mode: 'room' | 'zooming' | 'desktop'
  onOpenDesktop: (screenRect: ScreenRect) => void
  onBackHome: () => void
}

/**
 * Full-bleed desk: prefer filling height and cropping left/right, centered.
 * If the frame is still short on width, fill width and center vertically.
 */
function coverLayout(vw: number, vh: number) {
  // Pass 1 — fill height, center, crop left/right.
  let height = vh
  let width = height * IMG_ASPECT
  let top = 0
  let left = (vw - width) / 2

  if (width + 0.5 < vw) {
    // Pass 2 — not wide enough: fill width, center vertically.
    width = vw
    height = width / IMG_ASPECT
    left = 0
    top = (vh - height) / 2
  }

  // Tiny overscan to hide sub-pixel gaps.
  const overscan = 1.002
  const cx = left + width / 2
  const cy = top + height / 2
  width *= overscan
  height *= overscan
  left = cx - width / 2
  top = cy - height / 2

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
      scene.style.marginLeft = '0'
    }

    apply()
    window.addEventListener('resize', apply)
    window.visualViewport?.addEventListener('resize', apply)
    return () => {
      window.removeEventListener('resize', apply)
      window.visualViewport?.removeEventListener('resize', apply)
    }
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
