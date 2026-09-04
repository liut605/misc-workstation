import { useRef } from 'react'
import gsap from 'gsap'
import './HomeView.css'

type HomeViewProps = {
  onEnterMisc: (previewEl: HTMLElement) => void
}

export function HomeView({ onEnterMisc }: HomeViewProps) {
  const previewRef = useRef<HTMLDivElement>(null)

  return (
    <div className="home">
      <header className="home-header">
        <p className="brand">Tsing Liu</p>
        <p className="home-lede">
          Prototype bridge for the Misc workstation — hover Misc, then click to
          enter the desk.
        </p>
      </header>

      <div className="project-rail">
        <article className="project-card is-muted" aria-disabled="true">
          <span className="project-num">01</span>
          <h2>Selected Work</h2>
          <p>Stand-in tile for the rest of the portfolio grid.</p>
        </article>

        <button
          type="button"
          className="project-card misc-card"
          onMouseEnter={() => {
            if (!previewRef.current) return
            gsap.to(previewRef.current, {
              opacity: 1,
              y: 0,
              duration: 0.35,
              ease: 'power2.out',
            })
          }}
          onMouseLeave={() => {
            if (!previewRef.current) return
            gsap.to(previewRef.current, {
              opacity: 0,
              y: 12,
              duration: 0.28,
              ease: 'power2.in',
            })
          }}
          onFocus={() => {
            if (!previewRef.current) return
            gsap.to(previewRef.current, { opacity: 1, y: 0, duration: 0.3 })
          }}
          onBlur={() => {
            if (!previewRef.current) return
            gsap.to(previewRef.current, { opacity: 0, y: 12, duration: 0.25 })
          }}
          onClick={(e) => {
            const preview = previewRef.current
            if (preview) onEnterMisc(preview)
            else onEnterMisc(e.currentTarget)
          }}
        >
          <span className="project-num">05</span>
          <h2>Misc.</h2>
          <p>Fine art series, desk experiments, and live web apps.</p>
          <div
            ref={previewRef}
            className="misc-preview"
            style={{ opacity: 0, transform: 'translateY(12px)' }}
          >
            <img src="/desk-final.jpg" alt="" />
            <span>Enter workstation</span>
          </div>
        </button>

        <article className="project-card is-muted" aria-disabled="true">
          <span className="project-num">06</span>
          <h2>More soon</h2>
          <p>Placeholder for neighboring projects on the home grid.</p>
        </article>
      </div>
    </div>
  )
}
