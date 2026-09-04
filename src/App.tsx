import { useCallback, useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { DeskScene } from './components/DeskScene'
import { DesktopBrowser } from './components/DesktopBrowser'
import { HomeView } from './components/HomeView'
import './App.css'

type View = 'home' | 'desk'
type DeskMode = 'room' | 'zooming' | 'desktop'

type MorphRect = { top: number; left: number; width: number; height: number }

/** Cover the viewport with a rect that keeps the source aspect ratio. */
function coverRect(aspect: number, vw: number, vh: number): MorphRect {
  if (vw / vh > aspect) {
    const height = vw / aspect
    return { top: (vh - height) / 2, left: 0, width: vw, height }
  }
  const width = vh * aspect
  return { top: 0, left: (vw - width) / 2, width, height: vh }
}

function App() {
  const [view, setView] = useState<View>('home')
  const [deskMode, setDeskMode] = useState<DeskMode>('room')
  const [browserVisible, setBrowserVisible] = useState(false)
  const veilRef = useRef<HTMLDivElement>(null)
  const morphRef = useRef<HTMLDivElement>(null)
  const morphImgRef = useRef<HTMLImageElement>(null)
  const timelineRef = useRef<gsap.core.Timeline | null>(null)
  const screenRectRef = useRef<MorphRect | null>(null)

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
    screenRectRef.current = screenRect
    setDeskMode('zooming')
    setBrowserVisible(false)

    const aspect = screenRect.width / screenRect.height
    const end = coverRect(aspect, window.innerWidth, window.innerHeight)

    gsap.set(morph, {
      display: 'block',
      opacity: 1,
      top: screenRect.top,
      left: screenRect.left,
      width: screenRect.width,
      height: screenRect.height,
    })
    gsap.set(morphImg, { opacity: 1 })

    const tl = gsap.timeline({
      onComplete: () => {
        setDeskMode('desktop')
        setBrowserVisible(true)
        gsap.set(morph, { display: 'none' })
      },
    })
    timelineRef.current = tl

    // Smooth zoom only — same aspect in and out, no soft aspect morph.
    tl.to(morph, {
      top: end.top,
      left: end.left,
      width: end.width,
      height: end.height,
      duration: 0.85,
      ease: 'power2.inOut',
    })
  }, [])

  const exitDesktop = useCallback(() => {
    const morph = morphRef.current
    const morphImg = morphImgRef.current
    const screenRect = screenRectRef.current
    if (!morph || !morphImg || !screenRect) {
      setBrowserVisible(false)
      setDeskMode('room')
      return
    }

    timelineRef.current?.kill()
    setBrowserVisible(false)
    setDeskMode('zooming')

    const aspect = screenRect.width / screenRect.height
    const start = coverRect(aspect, window.innerWidth, window.innerHeight)

    gsap.set(morph, {
      display: 'block',
      opacity: 1,
      top: start.top,
      left: start.left,
      width: start.width,
      height: start.height,
    })
    gsap.set(morphImg, { opacity: 1 })

    const tl = gsap.timeline({
      onComplete: () => {
        gsap.set(morph, { display: 'none', opacity: 0 })
        setDeskMode('room')
      },
    })
    timelineRef.current = tl

    tl.to(morph, {
      top: screenRect.top,
      left: screenRect.left,
      width: screenRect.width,
      height: screenRect.height,
      duration: 0.85,
      ease: 'power2.inOut',
    })
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
            timelineRef.current?.kill()
            const morph = morphRef.current
            if (morph) gsap.set(morph, { display: 'none', opacity: 0 })
            setBrowserVisible(false)
            setDeskMode('room')
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
