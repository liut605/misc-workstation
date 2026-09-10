import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { DeskScene, type DeskMode } from './components/DeskScene'
import { DesktopBrowser } from './components/DesktopBrowser'
import { HomeView } from './components/HomeView'
import { SCREEN_RECT, SCREEN_ZOOM } from './lib/config'
import './App.css'

type Mode = 'home' | 'desk' | 'desktop'

type ScreenRect = { top: number; left: number; width: number; height: number }

export default function App() {
  const [mode, setMode] = useState<Mode>('home')
  const [deskMode, setDeskMode] = useState<DeskMode>('room')
  const [fromRect, setFromRect] = useState<ScreenRect | null>(null)
  /** Keeps the browser mounted through enter/exit morph crossfades. */
  const [browserOpen, setBrowserOpen] = useState(false)
  const zoomDirection = useRef<'in' | 'out'>('in')

  const sceneRef = useRef<HTMLDivElement>(null)
  const morphRef = useRef<HTMLDivElement>(null)

  const enterDesk = useCallback(() => {
    setMode('desk')
    setDeskMode('room')
  }, [])

  const backHome = useCallback(() => {
    setBrowserOpen(false)
    setMode('home')
    setDeskMode('room')
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

  useLayoutEffect(() => {
    if (deskMode !== 'zooming' || mode !== 'desk' || !fromRect) return
    const morph = morphRef.current
    if (!morph) return

    const vw = window.innerWidth
    const vh = window.innerHeight
    const fade = SCREEN_ZOOM.crossfade

    if (zoomDirection.current === 'in') {
      // Desk → morph (fade in) → expand → mount browser under morph → fade morph out.
      // Stay on deskMode === 'zooming' until the whole sequence finishes so this
      // effect's cleanup does not kill the timeline mid-crossfade.
      gsap.set(morph, {
        display: 'block',
        left: fromRect.left,
        top: fromRect.top,
        width: fromRect.width,
        height: fromRect.height,
        opacity: 0,
        borderRadius: 2,
      })
      const tl = gsap.timeline({
        onComplete: () => {
          gsap.set(morph, { display: 'none', opacity: 0 })
          setMode('desktop')
          setDeskMode('desktop')
        },
      })
      tl.to(morph, {
        opacity: 1,
        duration: fade,
        ease: 'power2.inOut',
      })
      tl.to(morph, {
        left: 0,
        top: 0,
        width: vw,
        height: vh,
        borderRadius: 0,
        duration: SCREEN_ZOOM.morphDurationIn,
        ease: 'power3.inOut',
      })
      tl.add(() => {
        setBrowserOpen(true)
      })
      tl.to(morph, {
        opacity: 0,
        duration: fade,
        ease: 'power2.inOut',
        delay: 0.05,
      })
      return () => {
        tl.kill()
      }
    }

    // Browser → morph (fade in over browser) → unmount browser → shrink → fade to desk.
    gsap.set(morph, {
      display: 'block',
      left: 0,
      top: 0,
      width: vw,
      height: vh,
      opacity: 0,
      borderRadius: 0,
    })
    const tl = gsap.timeline({
      onComplete: () => {
        setDeskMode('room')
        gsap.set(morph, { display: 'none', opacity: 0 })
      },
    })
    tl.to(morph, {
      opacity: 1,
      duration: fade,
      ease: 'power2.inOut',
    })
    tl.add(() => {
      setBrowserOpen(false)
    })
    tl.to(morph, {
      left: fromRect.left,
      top: fromRect.top,
      width: fromRect.width,
      height: fromRect.height,
      borderRadius: 2,
      duration: SCREEN_ZOOM.morphDurationOut,
      ease: 'power3.inOut',
    })
    tl.to(morph, {
      opacity: 0,
      duration: fade,
      ease: 'power2.inOut',
    })
    return () => {
      tl.kill()
    }
  }, [deskMode, mode, fromRect])

  // Crop the baked-in monitor region out of desk-final.jpg so the morph
  // matches the room photo (no separate screen-idle screenshot).
  const morphCropStyle = {
    ['--screen-l' as string]: String(SCREEN_RECT.left),
    ['--screen-t' as string]: String(SCREEN_RECT.top),
    ['--screen-w' as string]: String(SCREEN_RECT.width),
    ['--screen-h' as string]: String(SCREEN_RECT.height),
  }

  const showDesk =
    mode === 'desk' || mode === 'desktop' || browserOpen || deskMode === 'zooming'

  return (
    <div className="app-shell">
      {mode === 'home' && <HomeView onEnterMisc={enterDesk} />}

      {showDesk && (
        <DeskScene
          mode={deskMode === 'desktop' ? 'desktop' : deskMode}
          onOpenDesktop={openDesktop}
          onOpenSketchbook={openSketchbook}
          onExitSketchbook={exitSketchbook}
          onBackHome={backHome}
          sceneRef={sceneRef}
        />
      )}

      <div ref={morphRef} className="screen-morph" style={morphCropStyle} aria-hidden>
        <img
          src="/desk-final.jpg"
          alt=""
          className="screen-morph__img"
        />
      </div>

      {browserOpen && <DesktopBrowser active onExit={closeDesktop} />}
    </div>
  )
}
