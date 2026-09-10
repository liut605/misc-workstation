import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { DeskScene, type DeskMode } from './components/DeskScene'
import { DesktopBrowser } from './components/DesktopBrowser'
import { HomeView } from './components/HomeView'
import { SCREEN_RECT } from './lib/config'
import './App.css'

type Mode = 'home' | 'desk' | 'desktop'

type ScreenRect = { top: number; left: number; width: number; height: number }

export default function App() {
  const [mode, setMode] = useState<Mode>('home')
  const [deskMode, setDeskMode] = useState<DeskMode>('room')
  const [fromRect, setFromRect] = useState<ScreenRect | null>(null)
  const zoomDirection = useRef<'in' | 'out'>('in')

  const sceneRef = useRef<HTMLDivElement>(null)
  const morphRef = useRef<HTMLDivElement>(null)

  const enterDesk = useCallback(() => {
    setMode('desk')
    setDeskMode('room')
  }, [])

  const backHome = useCallback(() => {
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

    // Morph must end at the true fullscreen desktop shell (100vw × 100dvh).
    // Letterboxing here caused a hard jump when DesktopBrowser mounted full-bleed.
    const vw = window.innerWidth
    const vh = window.innerHeight

    if (zoomDirection.current === 'in') {
      gsap.set(morph, {
        display: 'block',
        left: fromRect.left,
        top: fromRect.top,
        width: fromRect.width,
        height: fromRect.height,
        opacity: 1,
        borderRadius: 2,
      })
      const tl = gsap.timeline({
        onComplete: () => {
          setMode('desktop')
          setDeskMode('desktop')
          // Keep morph up one frame so the browser can paint underneath, then hide.
          requestAnimationFrame(() => {
            gsap.set(morph, { display: 'none', opacity: 0 })
          })
        },
      })
      tl.to(morph, {
        left: 0,
        top: 0,
        width: vw,
        height: vh,
        borderRadius: 0,
        duration: 1.05,
        ease: 'power3.inOut',
      })
      return () => {
        tl.kill()
      }
    }

    gsap.set(morph, {
      display: 'block',
      left: 0,
      top: 0,
      width: vw,
      height: vh,
      opacity: 1,
      borderRadius: 0,
    })
    const tl = gsap.timeline({
      onComplete: () => {
        setDeskMode('room')
        gsap.set(morph, { display: 'none', opacity: 0 })
      },
    })
    tl.to(morph, {
      left: fromRect.left,
      top: fromRect.top,
      width: fromRect.width,
      height: fromRect.height,
      borderRadius: 2,
      duration: 0.9,
      ease: 'power3.inOut',
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

  return (
    <div className="app-shell">
      {mode === 'home' && <HomeView onEnterMisc={enterDesk} />}

      {(mode === 'desk' || mode === 'desktop') && (
        <DeskScene
          mode={deskMode}
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

      {mode === 'desktop' && deskMode === 'desktop' && (
        <DesktopBrowser active onExit={closeDesktop} />
      )}
    </div>
  )
}
