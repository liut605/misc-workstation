import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { DeskScene, type DeskMode } from './components/DeskScene'
import { DesktopBrowser } from './components/DesktopBrowser'
import { HomeView } from './components/HomeView'
import { BROWSER_TABS, COMPUTER_RECT, SCREEN_ZOOM } from './lib/config'
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

export default function App() {
  const [mode, setMode] = useState<Mode>('home')
  const [deskMode, setDeskMode] = useState<DeskMode>('room')
  const [fromRect, setFromRect] = useState<ScreenRect | null>(null)
  /** Keeps the browser mounted through enter/exit crossfades. */
  const [browserOpen, setBrowserOpen] = useState(false)
  /** Survives close so the desk monitor + next enter restore the same page. */
  const [activeTabId, setActiveTabId] = useState(BROWSER_TABS[0].id)
  const zoomDirection = useRef<'in' | 'out'>('in')
  const dollyRef = useRef<DollyPose>(IDENTITY)
  const pendingFadeIn = useRef(false)

  const sceneRef = useRef<HTMLDivElement>(null)
  const browserWrapRef = useRef<HTMLDivElement>(null)

  const enterDesk = useCallback(() => {
    setMode('desk')
    setDeskMode('room')
  }, [])

  const backHome = useCallback(() => {
    setBrowserOpen(false)
    setMode('home')
    setDeskMode('room')
    const scene = sceneRef.current
    if (scene) gsap.set(scene, { x: 0, y: 0, scale: 1, transformOrigin: '50% 50%' })
    dollyRef.current = IDENTITY
  }, [])

  const openDesktop = useCallback((rect: ScreenRect) => {
    zoomDirection.current = 'in'
    setFromRect(rect)
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

  // After browser mounts for enter, crossfade it in over the zoomed computer.
  useLayoutEffect(() => {
    if (!browserOpen || !pendingFadeIn.current) return
    const wrap = browserWrapRef.current
    if (!wrap) return
    pendingFadeIn.current = false
    gsap.fromTo(
      wrap,
      { opacity: 0 },
      { opacity: 1, duration: SCREEN_ZOOM.crossfade, ease: 'power2.inOut' },
    )
  }, [browserOpen])

  useLayoutEffect(() => {
    if (deskMode !== 'zooming' || mode !== 'desk') return
    const scene = sceneRef.current
    if (!scene) return

    const fade = SCREEN_ZOOM.crossfade

    if (zoomDirection.current === 'in') {
      // Dolly the whole desk photo into the iMac, then crossfade to the browser.
      gsap.set(scene, { x: 0, y: 0, scale: 1 })
      const pose = computerDollyPose(scene)
      dollyRef.current = pose
      gsap.set(scene, { transformOrigin: pose.transformOrigin })

      const tl = gsap.timeline({
        onComplete: () => {
          setMode('desktop')
          setDeskMode('desktop')
        },
      })
      tl.to(scene, {
        x: pose.x,
        y: pose.y,
        scale: pose.scale,
        duration: SCREEN_ZOOM.dollyDurationIn,
        ease: 'power3.inOut',
      })
      tl.add(() => {
        pendingFadeIn.current = true
        setBrowserOpen(true)
      })
      // Hold for the crossfade kicked off by the browserOpen effect above.
      tl.to({}, { duration: fade })

      return () => {
        tl.kill()
      }
    }

    // Exit: fade browser out over the already-zoomed computer, then pull back to the desk.
    const pose = dollyRef.current
    gsap.set(scene, {
      transformOrigin: pose.transformOrigin,
      x: pose.x,
      y: pose.y,
      scale: pose.scale,
    })

    const tl = gsap.timeline({
      onComplete: () => {
        setDeskMode('room')
        dollyRef.current = IDENTITY
      },
    })

    const wrap = browserWrapRef.current
    if (wrap) {
      gsap.set(wrap, { opacity: 1 })
      tl.to(wrap, {
        opacity: 0,
        duration: fade,
        ease: 'power2.inOut',
      })
    }
    tl.add(() => {
      setBrowserOpen(false)
    })
    tl.to(scene, {
      x: 0,
      y: 0,
      scale: 1,
      duration: SCREEN_ZOOM.dollyDurationOut,
      ease: 'power3.inOut',
    })

    return () => {
      tl.kill()
    }
  }, [deskMode, mode, fromRect])

  const showDesk =
    mode === 'desk' || mode === 'desktop' || browserOpen || deskMode === 'zooming'

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
        <div ref={browserWrapRef} className="desktop-browser-wrap">
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
