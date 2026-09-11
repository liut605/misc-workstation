import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { DeskScene, type DeskMode } from './components/DeskScene'
import { DesktopBrowser } from './components/DesktopBrowser'
import { HomeView } from './components/HomeView'
import { BROWSER_TABS, COMPUTER_RECT, SCREEN_RECT, SCREEN_ZOOM } from './lib/config'
import './App.css'

type Mode = 'home' | 'desk' | 'desktop'

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

/** Live iMac screen bounds (includes current dolly transform on the scene). */
function liveScreenRect(scene: HTMLElement): ScreenRect {
  const sr = scene.getBoundingClientRect()
  return {
    left: sr.left + SCREEN_RECT.left * sr.width,
    top: sr.top + SCREEN_RECT.top * sr.height,
    width: SCREEN_RECT.width * sr.width,
    height: SCREEN_RECT.height * sr.height,
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

/** Camera pose that pushes the whole iMac to fill the viewport. */
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

function applyWrapRect(el: HTMLElement, r: ScreenRect) {
  gsap.set(el, {
    top: r.top,
    left: r.left,
    width: r.width,
    height: r.height,
    opacity: 1,
  })
}

/**
 * Morph progress 0 = glued to the live screen bezel, 1 = fullscreen.
 * Recomputed every frame so chrome tracks the dollying monitor, then
 * expands (or collapses) into the final browser layout.
 */
function applyMorphWrap(wrap: HTMLElement, scene: HTMLElement, progress: number) {
  applyWrapRect(wrap, lerpRect(liveScreenRect(scene), fullscreenRect(), progress))
}

export default function App() {
  const [mode, setMode] = useState<Mode>('home')
  const [deskMode, setDeskMode] = useState<DeskMode>('room')
  const [fromRect, setFromRect] = useState<ScreenRect | null>(null)
  /** Keeps the browser mounted through enter/exit morphs. */
  const [browserOpen, setBrowserOpen] = useState(false)
  /** Survives close so the desk monitor + next enter restore the same page. */
  const [activeTabId, setActiveTabId] = useState(BROWSER_TABS[0].id)
  const zoomDirection = useRef<'in' | 'out'>('in')
  const dollyRef = useRef<DollyPose>(IDENTITY)

  const sceneRef = useRef<HTMLDivElement>(null)
  const browserWrapRef = useRef<HTMLDivElement>(null)

  const enterDesk = useCallback(() => {
    setMode('desk')
    setDeskMode('room')
  }, [])

  const backHome = useCallback(() => {
    setBrowserOpen(false)
    setFromRect(null)
    setMode('home')
    setDeskMode('room')
    const scene = sceneRef.current
    if (scene) {
      gsap.set(scene, {
        x: 0,
        y: 0,
        scale: 1,
        opacity: 1,
        transformOrigin: '50% 50%',
      })
    }
    dollyRef.current = IDENTITY
  }, [])

  const openDesktop = useCallback((rect: ScreenRect) => {
    zoomDirection.current = 'in'
    setFromRect(rect)
    setBrowserOpen(true)
    setDeskMode('zooming')
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

  useLayoutEffect(() => {
    if (deskMode !== 'zooming' || !browserOpen) return
    const scene = sceneRef.current
    const wrap = browserWrapRef.current
    if (!scene || !wrap) return

    if (zoomDirection.current === 'in') {
      gsap.set(scene, { x: 0, y: 0, scale: 1, opacity: 1 })
      const pose = computerDollyPose(scene)
      dollyRef.current = pose
      gsap.set(scene, { transformOrigin: pose.transformOrigin })
      applyMorphWrap(wrap, scene, 0)
      gsap.set(wrap, { pointerEvents: 'none' })

      const morph = { p: 0 }
      const dur = SCREEN_ZOOM.dollyDurationIn
      const tl = gsap.timeline({
        onComplete: () => {
          applyWrapRect(wrap, fullscreenRect())
          gsap.set(wrap, { pointerEvents: 'auto' })
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
          onUpdate: () => applyMorphWrap(wrap, scene, morph.p),
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

    // Exit: collapse browser onto the live screen while the desk pulls out.
    const pose = dollyRef.current
    gsap.set(scene, {
      transformOrigin: pose.transformOrigin,
      x: pose.x,
      y: pose.y,
      scale: pose.scale,
      opacity: SCREEN_ZOOM.deskDim,
    })
    applyMorphWrap(wrap, scene, 1)
    gsap.set(wrap, { pointerEvents: 'none' })

    const morph = { p: 1 }
    const dur = SCREEN_ZOOM.dollyDurationOut

    const tl = gsap.timeline({
      onComplete: () => {
        setBrowserOpen(false)
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
        onUpdate: () => applyMorphWrap(wrap, scene, morph.p),
      },
      0,
    )

    return () => {
      tl.kill()
    }
  }, [deskMode, browserOpen, fromRect])

  const showDesk =
    mode === 'desk' || mode === 'desktop' || browserOpen || deskMode === 'zooming'

  const wrapStyle =
    deskMode === 'desktop' || mode === 'desktop'
      ? ({ top: 0, left: 0, width: '100vw', height: '100dvh' } as const)
      : fromRect
        ? {
            top: fromRect.top,
            left: fromRect.left,
            width: fromRect.width,
            height: fromRect.height,
          }
        : ({ top: 0, left: 0, width: '100vw', height: '100dvh' } as const)

  return (
    <div className="app-shell">
      {mode === 'home' && <HomeView onEnterMisc={enterDesk} />}

      {showDesk && (
        <DeskScene
          mode={deskMode === 'desktop' ? 'desktop' : deskMode}
          monitorTabId={activeTabId}
          onOpenDesktop={openDesktop}
          onOpenSketchbook={openSketchbook}
          onExitSketchbook={exitSketchbook}
          onBackHome={backHome}
          sceneRef={sceneRef}
        />
      )}

      {browserOpen && (
        <div
          ref={browserWrapRef}
          className="desktop-browser-wrap"
          style={wrapStyle}
        >
          <DesktopBrowser
            active
            activeTabId={activeTabId}
            onActiveTabChange={setActiveTabId}
            onExit={closeDesktop}
          />
        </div>
      )}
    </div>
  )
}
