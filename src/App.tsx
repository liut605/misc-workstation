import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { DeskScene, type DeskMode } from './components/DeskScene'
import { DesktopBrowser } from './components/DesktopBrowser'
import { LaptopOnlyGate } from './components/LaptopOnlyGate'
import { BROWSER_TABS, COMPUTER_RECT, SCREEN_FRAME_RECT, SCREEN_RECT, SCREEN_ZOOM } from './lib/config'
import './App.css'

type Mode = 'desk' | 'desktop'

type ScreenRect = { top: number; left: number; width: number; height: number }

type DollyPose = {
  x: number
  y: number
  scale: number
  transformOrigin: string
}

const IDENTITY: DollyPose = {
  x: 0,
  y: 0,
  scale: 1,
  transformOrigin: '50% 50%',
}

function fullscreenRect(): ScreenRect {
  return {
    top: 0,
    left: 0,
    width: window.innerWidth,
    height: window.innerHeight,
  }
}

function liveScreenRect(scene: HTMLElement): ScreenRect {
  const sr = scene.getBoundingClientRect()
  return {
    left: sr.left + SCREEN_RECT.left * sr.width,
    top: sr.top + SCREEN_RECT.top * sr.height,
    width: SCREEN_RECT.width * sr.width,
    height: SCREEN_RECT.height * sr.height,
  }
}

function liveScreenFrameRect(scene: HTMLElement): ScreenRect {
  const sr = scene.getBoundingClientRect()
  return {
    left: sr.left + SCREEN_FRAME_RECT.left * sr.width,
    top: sr.top + SCREEN_FRAME_RECT.top * sr.height,
    width: SCREEN_FRAME_RECT.width * sr.width,
    height: SCREEN_FRAME_RECT.height * sr.height,
  }
}

function lerpRect(a: ScreenRect, b: ScreenRect, t: number): ScreenRect {
  return {
    left: a.left + (b.left - a.left) * t,
    top: a.top + (b.top - a.top) * t,
    width: a.width + (b.width - a.width) * t,
    height: a.height + (b.height - a.height) * t,
  }
}

/** 1 while bezel should stay, 0 once the zoom is nearly finished. */
function bezelStrength(progress: number) {
  const start = SCREEN_ZOOM.bezelFadeStart
  if (progress <= start) return 1
  const t = (progress - start) / Math.max(1e-6, 1 - start)
  // Ease out so the black frame holds, then drops away quickly at the end.
  return 1 - (t * t * (3 - 2 * t))
}

function computerDollyPose(scene: HTMLElement): DollyPose {
  const sr = scene.getBoundingClientRect()
  const vw = window.innerWidth
  const vh = window.innerHeight
  const rect = {
    left: sr.left + COMPUTER_RECT.left * sr.width,
    top: sr.top + COMPUTER_RECT.top * sr.height,
    width: COMPUTER_RECT.width * sr.width,
    height: COMPUTER_RECT.height * sr.height,
  }
  const cx = rect.left + rect.width / 2
  const cy = rect.top + rect.height / 2
  const ox = ((cx - sr.left) / sr.width) * 100
  const oy = ((cy - sr.top) / sr.height) * 100
  const scale =
    Math.max(vw / Math.max(rect.width, 1), vh / Math.max(rect.height, 1)) *
    SCREEN_ZOOM.overscale

  return {
    transformOrigin: `${ox}% ${oy}%`,
    x: vw / 2 - cx,
    y: vh / 2 - cy,
    scale,
  }
}

/**
 * Morph the browser from the live LCD (thin black bezel + scaled chrome/page)
 * into fullscreen. Scale (not reflow) so tab labels, the close icon, and
 * in-page type like “NYC is home” / “Skip” grow with the zoom.
 */
function applyMorphWrap(
  wrap: HTMLElement,
  stage: HTMLElement,
  scene: HTMLElement,
  progress: number,
) {
  const screen = liveScreenRect(scene)
  // Black frame = LCD lip only (from screen+bezel reference), not the silver chassis.
  const frame = liveScreenFrameRect(scene)
  const full = fullscreenRect()
  const keep = bezelStrength(progress)
  const outer = lerpRect(frame, full, progress)

  const basePad = {
    top: Math.max(0, screen.top - frame.top),
    left: Math.max(0, screen.left - frame.left),
    right: Math.max(0, frame.left + frame.width - (screen.left + screen.width)),
    bottom: Math.max(0, frame.top + frame.height - (screen.top + screen.height)),
  }

  const growX = outer.width / Math.max(frame.width, 1)
  const growY = outer.height / Math.max(frame.height, 1)
  const padT = basePad.top * growY * keep
  const padL = basePad.left * growX * keep
  const padR = basePad.right * growX * keep
  const padB = basePad.bottom * growY * keep

  const innerW = Math.max(1, outer.width - padL - padR)
  const innerH = Math.max(1, outer.height - padT - padB)
  const scaleX = innerW / Math.max(full.width, 1)
  const scaleY = innerH / Math.max(full.height, 1)

  gsap.set(wrap, {
    top: outer.top,
    left: outer.left,
    width: outer.width,
    height: outer.height,
    paddingTop: padT,
    paddingRight: padR,
    paddingBottom: padB,
    paddingLeft: padL,
    backgroundColor: keep > 0.02 ? '#050505' : '#ffffff',
    borderRadius: keep * 4,
    boxSizing: 'border-box',
  })

  gsap.set(stage, {
    width: full.width,
    height: full.height,
    x: 0,
    y: 0,
    scaleX,
    scaleY,
    transformOrigin: '0 0',
  })
}

function settleFullscreen(wrap: HTMLElement, stage: HTMLElement) {
  const full = fullscreenRect()
  gsap.set(wrap, {
    top: 0,
    left: 0,
    width: full.width,
    height: full.height,
    paddingTop: 0,
    paddingRight: 0,
    paddingBottom: 0,
    paddingLeft: 0,
    backgroundColor: '#ffffff',
    borderRadius: 0,
  })
  gsap.set(stage, {
    width: full.width,
    height: full.height,
    x: 0,
    y: 0,
    scaleX: 1,
    scaleY: 1,
    transformOrigin: '0 0',
  })
}

export default function App() {
  const [, setMode] = useState<Mode>('desk')
  const [deskMode, setDeskMode] = useState<DeskMode>('room')
  const [fromRect, setFromRect] = useState<ScreenRect | null>(null)
  const [browserOpen, setBrowserOpen] = useState(false)
  /** Live browser tab document is ready — don’t reveal over the desk preview until then. */
  const [browserReady, setBrowserReady] = useState(false)
  const [activeTabId, setActiveTabId] = useState(BROWSER_TABS[0].id)
  const zoomDirection = useRef<'in' | 'out'>('in')
  const dollyRef = useRef<DollyPose>(IDENTITY)
  const awaitingReady = useRef(false)

  const sceneRef = useRef<HTMLDivElement>(null)
  const browserWrapRef = useRef<HTMLDivElement>(null)
  const browserStageRef = useRef<HTMLDivElement>(null)

  // Fade the workstation in after first paint (and after the desk image is ready when possible).
  useEffect(() => {
    let cancelled = false
    const root = document.getElementById('root')
    if (!root) return

    const reveal = () => {
      if (cancelled) return
      // Double rAF so the initial opacity:0 frame is committed before transitioning.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (!cancelled) root.classList.add('is-ready')
        })
      })
    }

    const img = document.querySelector<HTMLImageElement>('.desk-photo, img[src*="desk-final"]')
    if (img && !img.complete) {
      const onLoad = () => reveal()
      img.addEventListener('load', onLoad, { once: true })
      // Don't hang forever if the image errors.
      const fallback = window.setTimeout(reveal, 1200)
      return () => {
        cancelled = true
        img.removeEventListener('load', onLoad)
        window.clearTimeout(fallback)
      }
    }

    reveal()
    return () => {
      cancelled = true
    }
  }, [])

  const openDesktop = useCallback((rect: ScreenRect) => {
    zoomDirection.current = 'in'
    awaitingReady.current = true
    setBrowserReady(false)
    setFromRect(rect)
    setBrowserOpen(true)
    setDeskMode('zooming')
  }, [])

  const onBrowserContentReady = useCallback(() => {
    if (!awaitingReady.current) return
    awaitingReady.current = false
    setBrowserReady(true)
  }, [])

  const closeDesktop = useCallback(() => {
    zoomDirection.current = 'out'
    setMode('desk')
    setDeskMode('zooming')
  }, [])

  const openSketchbook = useCallback(() => {
    setDeskMode('sketchbook')
  }, [])

  const exitSketchbook = useCallback(() => {
    setDeskMode('room')
  }, [])

  // Park the morph wrap on the LCD as soon as it mounts (still invisible).
  useLayoutEffect(() => {
    if (!browserOpen) return
    const scene = sceneRef.current
    const wrap = browserWrapRef.current
    const stage = browserStageRef.current
    if (!scene || !wrap || !stage) return
    if (zoomDirection.current === 'in' && deskMode === 'zooming' && !browserReady) {
      gsap.set(scene, { x: 0, y: 0, scale: 1, opacity: 1 })
      applyMorphWrap(wrap, stage, scene, 0)
      gsap.set(wrap, { opacity: 0, pointerEvents: 'none', visibility: 'visible' })
    }
  }, [browserOpen, deskMode, browserReady, fromRect])

  useLayoutEffect(() => {
    if (deskMode !== 'zooming' || !browserOpen) return
    const scene = sceneRef.current
    const wrap = browserWrapRef.current
    const stage = browserStageRef.current
    if (!scene || !wrap || !stage) return

    if (zoomDirection.current === 'in') {
      // Stay invisible over the desk preview until the tab document has painted.
      if (!browserReady) return

      gsap.set(scene, { x: 0, y: 0, scale: 1, opacity: 1 })
      const pose = computerDollyPose(scene)
      dollyRef.current = pose
      gsap.set(scene, { transformOrigin: pose.transformOrigin })
      applyMorphWrap(wrap, stage, scene, 0)
      // Hard cut from warm desk preview → warm live browser (no fade-through-white).
      gsap.set(wrap, { opacity: 1, pointerEvents: 'none', visibility: 'visible' })

      const morph = { p: 0 }
      const dur = SCREEN_ZOOM.dollyDurationIn
      const tl = gsap.timeline({
        onComplete: () => {
          settleFullscreen(wrap, stage)
          gsap.set(wrap, { pointerEvents: 'auto', opacity: 1 })
          setMode('desktop')
          setDeskMode('desktop')
        },
      })

      tl.to(
        scene,
        {
          x: pose.x,
          y: pose.y,
          scale: pose.scale,
          duration: dur,
          ease: 'power2.inOut',
        },
        0,
      )
      tl.to(
        morph,
        {
          p: 1,
          duration: dur,
          ease: 'power2.inOut',
          onUpdate: () => applyMorphWrap(wrap, stage, scene, morph.p),
        },
        0,
      )
      tl.to(
        scene,
        {
          opacity: SCREEN_ZOOM.deskDim,
          duration: dur * 0.45,
          ease: 'power1.in',
        },
        dur * 0.55,
      )

      return () => {
        tl.kill()
      }
    }

    const pose = dollyRef.current
    gsap.set(scene, {
      transformOrigin: pose.transformOrigin,
      x: pose.x,
      y: pose.y,
      scale: pose.scale,
      opacity: SCREEN_ZOOM.deskDim,
    })
    applyMorphWrap(wrap, stage, scene, 1)
    gsap.set(wrap, { opacity: 1, pointerEvents: 'none', visibility: 'visible' })

    const morph = { p: 1 }
    const dur = SCREEN_ZOOM.dollyDurationOut

    const tl = gsap.timeline({
      onComplete: () => {
        setBrowserOpen(false)
        setBrowserReady(false)
        setDeskMode('room')
        dollyRef.current = IDENTITY
        gsap.set(scene, { x: 0, y: 0, scale: 1, opacity: 1 })
      },
    })

    tl.to(
      scene,
      {
        opacity: 1,
        duration: dur * 0.35,
        ease: 'power1.out',
      },
      0,
    )
    tl.to(
      scene,
      {
        x: 0,
        y: 0,
        scale: 1,
        duration: dur,
        ease: 'power2.inOut',
      },
      0,
    )
    tl.to(
      morph,
      {
        p: 0,
        duration: dur,
        ease: 'power2.inOut',
        onUpdate: () => applyMorphWrap(wrap, stage, scene, morph.p),
      },
      0,
    )
    // Drop opacity only at the very end so the desk preview is already underneath.
    tl.to(wrap, { opacity: 0, duration: 0.08, ease: 'power1.in' }, dur - 0.08)

    return () => {
      tl.kill()
    }
  }, [deskMode, browserOpen, fromRect, browserReady])

  return (
    <LaptopOnlyGate>
      <div className="app-shell">
        <DeskScene
          mode={deskMode === 'desktop' ? 'desktop' : deskMode}
          monitorTabId={activeTabId}
          onOpenDesktop={openDesktop}
          onOpenSketchbook={openSketchbook}
          onExitSketchbook={exitSketchbook}
          sceneRef={sceneRef}
        />

        {browserOpen && (
          <div ref={browserWrapRef} className="desktop-browser-wrap">
            <div ref={browserStageRef} className="desktop-browser-stage">
              <DesktopBrowser
                active
                activeTabId={activeTabId}
                onActiveTabChange={setActiveTabId}
                onExit={closeDesktop}
                onContentReady={onBrowserContentReady}
              />
            </div>
          </div>
        )}
      </div>
    </LaptopOnlyGate>
  )
}
