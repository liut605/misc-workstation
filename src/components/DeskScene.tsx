import { useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import { SCREEN_RECT } from '../lib/config'
import './DeskScene.css'

type DeskSceneProps = {
  mode: 'room' | 'zooming' | 'desktop'
  onOpenDesktop: () => void
  onBackHome: () => void
}

export function DeskScene({ mode, onOpenDesktop, onBackHome }: DeskSceneProps) {
  const stageRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const scene = sceneRef.current
    const stage = stageRef.current
    if (!scene || !stage) return

    const screenCx = (SCREEN_RECT.left + SCREEN_RECT.width / 2) * 100
    const screenCy = (SCREEN_RECT.top + SCREEN_RECT.height / 2) * 100
    scene.style.transformOrigin = `${screenCx}% ${screenCy}%`

    const fitScale = () => {
      // Scale so the monitor screen covers the full viewport (cover, not contain).
      const naturalW = scene.offsetWidth
      const naturalH = scene.offsetHeight
      const screenW = naturalW * SCREEN_RECT.width
      const screenH = naturalH * SCREEN_RECT.height
      const scaleX = window.innerWidth / screenW
      const scaleY = window.innerHeight / screenH
      return Math.max(scaleX, scaleY) * 1.02
    }

    if (mode === 'room') {
      gsap.to(scene, {
        scale: 1,
        xPercent: 0,
        yPercent: 0,
        duration: 0.7,
        ease: 'power3.inOut',
      })
    } else if (mode === 'zooming' || mode === 'desktop') {
      const scale = fitScale()
      gsap.to(scene, {
        scale,
        duration: mode === 'desktop' ? 0 : 0.85,
        ease: 'power3.inOut',
      })
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
              opacity: mode === 'desktop' ? 0 : 1,
            }}
          />
          <button
            type="button"
            className="screen-hotspot"
            aria-label="Zoom into desktop"
            disabled={!interactive}
            onClick={onOpenDesktop}
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
        <p className="desk-hint">Click the monitor to open the desktop</p>
      )}
    </div>
  )
}
