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

    const screenAspect = SCREEN_RECT.width / SCREEN_RECT.height
    const vh = window.innerHeight
    const vw = window.innerWidth
    let endW = vw
    let endH = endW / screenAspect
    if (endH > vh) {
      endH = vh
      endW = endH * screenAspect
    }
    const endL = (vw - endW) / 2
    const endT = (vh - endH) / 2

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
          gsap.set(morph, { display: 'none' })
        },
      })
      tl.to(morph, {
        left: endL,
        top: endT,
        width: endW,
        height: endH,
        borderRadius: 0,
        duration: 0.95,
        ease: 'power3.inOut',
      })
      return () => {
        tl.kill()
      }
    }

    gsap.set(morph, {
      display: 'block',
      left: endL,
      top: endT,
      width: endW,
      height: endH,
      opacity: 1,
      borderRadius: 0,
    })
    const tl = gsap.timeline({
      onComplete: () => {
        setDeskMode('room')
        gsap.set(morph, { display: 'none' })
      },
    })
    tl.to(morph, {
      left: fromRect.left,
      top: fromRect.top,
      width: fromRect.width,
      height: fromRect.height,
      borderRadius: 2,
      duration: 0.85,
      ease: 'power3.inOut',
    })
    return () => {
      tl.kill()
    }
  }, [deskMode, mode, fromRect])

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

      <div ref={morphRef} className="screen-morph" aria-hidden>
        <img
          src="/browser-idle-screenshot.jpg"
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
