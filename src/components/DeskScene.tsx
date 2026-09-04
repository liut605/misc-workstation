import { useLayoutEffect, useRef, useState } from 'react'
import { SCREEN_RECT } from '../lib/config'
import './DeskScene.css'

/** Native desk photo dimensions */
const IMG_W = 2528
const IMG_H = 1686
const IMG_ASPECT = IMG_W / IMG_H

type ScreenRect = { top: number; left: number; width: number; height: number }

type DeskSceneProps = {
  mode: 'room' | 'zooming' | 'desktop'
  onOpenDesktop: (screenRect: ScreenRect) => void
  onBackHome: () => void
}

/**
 * Fill the viewport with the desk photo (no letterboxing).
 * 1) Scale to cover width; crop the bottom edge of the desk if needed.
 * 2) If that still leaves vertical gaps, scale to cover height (crop sides)
 *    and shift up as a last resort so any leftover overflow crops the top.
 */
function coverLayout(vw: number, vh: number) {
  // Pass 1 — fill width, pin top, crop bottom.
  let width = vw
  let height = vw / IMG_ASPECT
  let top = 0
  let left = 0

  if (height + 0.5 < vh) {
    // Pass 2 — still not tall enough: fill height, crop sides.
    height = vh
    width = vh * IMG_ASPECT
    left = (vw - width) / 2
    top = 0

    // Last resort — if anything still overshoots vertically, pin to the
    // bottom edge so the overflow crops the top of the frame.
    if (top + height > vh + 0.5) {
      top = vh - height
    }
  }

  // Tiny overscan avoids sub-pixel hairlines at the edges.
  const overscan = 1.002
  const cx = left + width / 2
  const cy = top + height / 2
  width *= overscan
  height *= overscan
  left = cx - width / 2
  top = cy - height / 2

  // Re-assert crop priority after overscan: prefer bottom crop (top <= 0),
  // only allow top crop if the bottom is already flush.
  if (top > 0) top = 0
  if (top + height < vh) top = vh - height

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
      const vw = window.innerWidth
      const vh = window.innerHeight
      const { width, height, top, left } = coverLayout(vw, vh)
      scene.style.width = `${width}px`
      scene.style.height = `${height}px`
      scene.style.top = `${top}px`
      scene.style.left = `${left}px`
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
