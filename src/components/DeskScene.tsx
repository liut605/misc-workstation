import { useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { DESK_IMAGE, NOTEBOOK, SCREEN_RECT } from '../lib/config'
import './DeskScene.css'

const IMG_W = DESK_IMAGE.width
const IMG_H = DESK_IMAGE.height
const IMG_ASPECT = IMG_W / IMG_H

type ScreenRect = { top: number; left: number; width: number; height: number }

export type DeskMode = 'room' | 'zooming' | 'desktop' | 'sketchbook'

type DeskSceneProps = {
  mode: DeskMode
  onOpenDesktop: (screenRect: ScreenRect) => void
  onOpenSketchbook: () => void
  onExitSketchbook: () => void
  onBackHome: () => void
  sceneRef?: React.RefObject<HTMLDivElement | null>
}

/**
 * Full-bleed desk: prefer filling height and cropping left/right, centered.
 * If the frame is still short on width, fill width and center vertically.
 */
function coverLayout(vw: number, vh: number) {
  let height = vh
  let width = height * IMG_ASPECT
  let top = 0
  let left = (vw - width) / 2

  if (width + 0.5 < vw) {
    width = vw
    height = width / IMG_ASPECT
    left = 0
    top = (vh - height) / 2
  }

  const overscan = 1.002
  const cx = left + width / 2
  const cy = top + height / 2
  width *= overscan
  height *= overscan
  left = cx - width / 2
  top = cy - height / 2

  return { width, height, top, left }
}

export function DeskScene({
  mode,
  onOpenDesktop,
  onOpenSketchbook,
  onExitSketchbook,
  onBackHome,
  sceneRef: externalSceneRef,
}: DeskSceneProps) {
  const internalSceneRef = useRef<HTMLDivElement>(null)
  const sceneRef = externalSceneRef ?? internalSceneRef
  const hotspotRef = useRef<HTMLButtonElement>(null)
  const notebookHotspotRef = useRef<HTMLButtonElement>(null)
  const notebookFocusRef = useRef<HTMLSpanElement>(null)
  const overheadRef = useRef<HTMLDivElement>(null)
  const [hintVisible, setHintVisible] = useState(false)
  const [notebookHint, setNotebookHint] = useState(false)
  const sketchTlRef = useRef<gsap.core.Timeline | null>(null)

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
  }, [sceneRef])

  // Sketchbook: 2D dolly toward the book, then crossfade to true top-down frame.
  useLayoutEffect(() => {
    const scene = sceneRef.current
    const focus = notebookFocusRef.current
    const overhead = overheadRef.current
    if (!scene || !focus || !overhead) return

    sketchTlRef.current?.kill()

    const origin = `${NOTEBOOK.centerX * 100}% ${NOTEBOOK.centerY * 100}%`
    gsap.set(scene, { transformOrigin: origin, force3D: true })

    if (mode === 'sketchbook') {
      gsap.set(scene, { x: 0, y: 0, scale: 1, rotation: 0 })
      gsap.set(overhead, { autoAlpha: 0, scale: 1.06 })

      const focusBox = focus.getBoundingClientRect()
      const focusCx = focusBox.left + focusBox.width / 2
      const focusCy = focusBox.top + focusBox.height / 2
      const scale = NOTEBOOK.zoom.scale
      const dx = window.innerWidth / 2 - focusCx
      const dy = window.innerHeight / 2 - focusCy
      const dur = NOTEBOOK.zoom.duration

      const tl = gsap.timeline()
      sketchTlRef.current = tl
      tl.to(
        scene,
        {
          x: dx,
          y: dy,
          scale,
          rotation: NOTEBOOK.zoom.rotateZ,
          duration: dur,
          ease: 'power2.inOut',
        },
        0,
      )
      tl.to(
        overhead,
        {
          autoAlpha: 1,
          scale: 1,
          duration: dur * 0.55,
          ease: 'power2.out',
        },
        dur * NOTEBOOK.zoom.overheadFadeAt,
      )
    } else if (mode === 'room') {
      const overheadVisible = Number(gsap.getProperty(overhead, 'autoAlpha')) > 0.01
      const currentScale = Number(gsap.getProperty(scene, 'scale'))
      if (!overheadVisible && currentScale === 1) {
        gsap.set(scene, { x: 0, y: 0, scale: 1, rotation: 0 })
        gsap.set(overhead, { autoAlpha: 0, scale: 1.06 })
        return
      }
      const tl = gsap.timeline()
      sketchTlRef.current = tl
      tl.to(overhead, {
        autoAlpha: 0,
        scale: 1.04,
        duration: 0.4,
        ease: 'power2.in',
      })
      tl.to(
        scene,
        {
          x: 0,
          y: 0,
          scale: 1,
          rotation: 0,
          duration: 1.0,
          ease: 'power2.inOut',
        },
        0.15,
      )
    }

    return () => {
      sketchTlRef.current?.kill()
    }
  }, [mode, sceneRef])

  useLayoutEffect(() => {
    if (mode !== 'sketchbook') return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onExitSketchbook()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mode, onExitSketchbook])

  const interactive = mode === 'room'
  const showChrome = mode === 'room'
  const inSketchbook = mode === 'sketchbook'

  return (
    <div
      className={`desk-view ${mode !== 'room' ? 'is-zoomed' : ''} ${inSketchbook ? 'is-sketchbook' : ''}`}
    >
      {showChrome && (
        <button type="button" className="desk-back" onClick={onBackHome}>
          ← Home
        </button>
      )}

      {inSketchbook && (
        <button
          type="button"
          className="sketch-exit"
          aria-label="Exit sketchbook"
          onClick={onExitSketchbook}
        >
          <span aria-hidden="true" />
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

          <span
            ref={notebookFocusRef}
            className="notebook-focus"
            style={{
              left: `${NOTEBOOK.centerX * 100}%`,
              top: `${NOTEBOOK.centerY * 100}%`,
            }}
            aria-hidden="true"
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

          <button
            ref={notebookHotspotRef}
            type="button"
            className="notebook-hotspot"
            aria-label="Open sketchbook"
            disabled={!interactive}
            onMouseEnter={() => interactive && setNotebookHint(true)}
            onMouseLeave={() => setNotebookHint(false)}
            onFocus={() => interactive && setNotebookHint(true)}
            onBlur={() => setNotebookHint(false)}
            onClick={onOpenSketchbook}
            style={{
              left: `${NOTEBOOK.left * 100}%`,
              top: `${NOTEBOOK.top * 100}%`,
              width: `${NOTEBOOK.width * 100}%`,
              height: `${NOTEBOOK.height * 100}%`,
            }}
          />
        </div>
      </div>

      <div
        ref={overheadRef}
        className="sketchbook-overhead"
        aria-hidden={!inSketchbook}
      >
        <img
          src="/sketchbook-overhead.jpg"
          alt=""
          draggable={false}
        />
      </div>

      {showChrome && hintVisible && (
        <p className="desk-hint is-visible">Click the screen to enter projects</p>
      )}
      {showChrome && notebookHint && !hintVisible && (
        <p className="desk-hint is-visible">Click the sketchbook to look closer</p>
      )}
    </div>
  )
}
