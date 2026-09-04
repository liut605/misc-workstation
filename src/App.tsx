import { useCallback, useRef, useState } from 'react'
import gsap from 'gsap'
import { DeskScene } from './components/DeskScene'
import { DesktopBrowser } from './components/DesktopBrowser'
import { HomeView } from './components/HomeView'
import './App.css'

type View = 'home' | 'desk'
type DeskMode = 'room' | 'zooming' | 'desktop'

function App() {
  const [view, setView] = useState<View>('home')
  const [deskMode, setDeskMode] = useState<DeskMode>('room')
  const veilRef = useRef<HTMLDivElement>(null)

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

  const openDesktop = useCallback(() => {
    setDeskMode('zooming')
    window.setTimeout(() => setDeskMode('desktop'), 780)
  }, [])

  const exitDesktop = useCallback(() => {
    setDeskMode('room')
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
            setDeskMode('room')
            setView('home')
          }}
        />
      )}

      <DesktopBrowser
        active={deskMode === 'desktop'}
        onExit={exitDesktop}
      />

      <div ref={veilRef} className="transition-veil" aria-hidden="true" />
    </div>
  )
}

export default App
