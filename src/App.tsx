import { useCallback, useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { DeskScene } from './components/DeskScene'
import { DesktopBrowser } from './components/DesktopBrowser'
import { HomeView } from './components/HomeView'
import './App.css'

type View = 'home' | 'desk'
type DeskMode = 'room' | 'zooming' | 'desktop'

type MorphRect = { top: number; left: number; width: number; height: number }

function App() {
  const [view, setView] = useState<View>('home')
  const [deskMode, setDeskMode] = useState<DeskMode>('room')
  const [browserVisible, setBrowserVisible] = useState(false)
  const veilRef = useRef<HTMLDivElement>(null)
  const morphRef = useRef<HTMLDivElement>(null)
  const morphImgRef = useRef<HTMLImageElement>(null)
  const timelineRef = useRef<gsap.core.Timeline | null>(null)

  const enterMisc = useCallback((previewEl: HTMLElement) => {
    const veil = veilRef.current
    if (!veil) {
      setView('desk')
      setDeskMode('room')
      return
    }

    const rect = previewEl.getBoundingClientRect()
    gsap.set(veil, {
      display: 'block',
      opacity: 1,
      borderRadius: 16,
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
      backgroundImage: 'url(/desk-final.jpg)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    })

    const tl = gsap.timeline({
      onComplete: () => {
        setView('desk')
        setDeskMode('room')
        gsap.to(veil, {
          opacity: 0,
          duration: 0.25,
          onComplete: () => {
            gsap.set(veil, { display: 'none' })
          },
        })
      },
    })

    tl.to(veil, {
      top: 0,
      left: 0,
      width: window.innerWidth,
      height: window.innerHeight,
      borderRadius: 0,
      duration: 0.7,
      ease: 'power3.inOut',
    })
  }, [])

  const openDesktop = useCallback((screenRect: MorphRect) => {
    const morph = morphRef.current
    const morphImg = morphImgRef.current
    if (!morph || !morphImg) {
      setDeskMode('desktop')
      setBrowserVisible(true)
      return
    }

    timelineRef.current?.kill()
    setDeskMode('zooming')
    setBrowserVisible(false)

    gsap.set(morph, {
      display: 'block',
      opacity: 1,
      top: screenRect.top,
      left: screenRect.left,
      width: screenRect.width,
      height: screenRect.height,
      borderRadius: 2,
    })
    gsap.set(morphImg, { opacity: 1 })

    const tl = gsap.timeline({
      onComplete: () => {
        setDeskMode('desktop')
        gsap.set(morph, { display: 'none', opacity: 0 })
      },
    })
    timelineRef.current = tl

    // Morph screen rect → fullscreen; aspect ratio eases with the bounds.
    tl.to(
      morph,
      {
        top: 0,
        left: 0,
        width: window.innerWidth,
        height: window.innerHeight,
        borderRadius: 0,
        duration: 1.15,
        ease: 'power2.inOut',
      },
      0,
    )

    // Bring live browser under the morph mid-way, then dissolve the still.
    tl.call(
      () => {
        setDeskMode('desktop')
        setBrowserVisible(true)
      },
      [],
      0.45,
    )

    tl.to(
      morphImg,
      {
        opacity: 0,
        duration: 0.55,
        ease: 'power1.inOut',
      },
      0.65,
    )
  }, [])

  const exitDesktop = useCallback(() => {
    timelineRef.current?.kill()
    const morph = morphRef.current
    if (morph) gsap.set(morph, { display: 'none', opacity: 0 })
    setBrowserVisible(false)
    setDeskMode('room')
  }, [])

  useEffect(() => {
    return () => {
      timelineRef.current?.kill()
    }
  }, [])

  return (
    <div className="app-root">
      {view === 'home' ? (
        <HomeView onEnterMisc={enterMisc} />
      ) : (
        <DeskScene
          mode={deskMode}
          onOpenDesktop={openDesktop}
          onBackHome={() => {
            exitDesktop()
            setView('home')
          }}
        />
      )}

      <DesktopBrowser active={browserVisible} onExit={exitDesktop} />

      <div
        ref={morphRef}
        className="screen-morph"
        aria-hidden="true"
        style={{ display: 'none' }}
      >
        <img
          ref={morphImgRef}
          src="/browser-idle-screenshot.jpg"
          alt=""
          className="screen-morph-img"
        />
      </div>

      <div ref={veilRef} className="transition-veil" aria-hidden="true" />
    </div>
  )
}

export default App
