import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { SKETCHBOOK } from '../lib/config'
import './SketchbookPages.css'

type SketchbookPagesProps = {
  active: boolean
}

function rectStyle(r: { left: number; top: number; width: number; height: number }) {
  return {
    left: `${r.left * 100}%`,
    top: `${r.top * 100}%`,
    width: `${r.width * 100}%`,
    height: `${r.height * 100}%`,
  }
}

export function SketchbookPages({ active }: SketchbookPagesProps) {
  const [index, setIndex] = useState(0)
  const [busy, setBusy] = useState(false)
  const [radiusPx, setRadiusPx] = useState(28)
  const leafRef = useRef<HTMLDivElement>(null)
  const measureRef = useRef<HTMLDivElement>(null)

  const spreads = SKETCHBOOK.spreads
  const last = spreads.length - 1
  const current = spreads[index]
  const next = spreads[Math.min(index + 1, last)]
  const { leftPage, rightPage, pageRect, pageRadiusRatio } = SKETCHBOOK
  const round = { borderRadius: pageRadiusRatio > 0 ? `${radiusPx}px` : '0px' }

  useLayoutEffect(() => {
    const el = measureRef.current
    if (!el) return
    const update = () => {
      if (pageRadiusRatio <= 0) {
        setRadiusPx(0)
        return
      }
      setRadiusPx(Math.max(16, el.getBoundingClientRect().height * pageRadiusRatio))
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [pageRadiusRatio, active])

  useLayoutEffect(() => {
    if (!active) {
      setIndex(0)
      setBusy(false)
      if (leafRef.current) {
        gsap.set(leafRef.current, { rotationY: 0, autoAlpha: 0 })
      }
    }
  }, [active])

  const turnForward = useCallback(() => {
    if (!active || busy || index >= last) return
    const leaf = leafRef.current
    if (!leaf) return
    setBusy(true)

    const front = leaf.querySelector<HTMLElement>('.page-face--front')
    const back = leaf.querySelector<HTMLElement>('.page-face--back')
    if (front) front.style.backgroundImage = `url(${spreads[index].right})`
    if (back) back.style.backgroundImage = `url(${spreads[index + 1].left})`

    gsap.set(leaf, {
      rotationY: 0,
      autoAlpha: 1,
      transformOrigin: 'left center',
    })
    gsap.to(leaf, {
      rotationY: -180,
      duration: 0.9,
      ease: 'power2.inOut',
      onComplete: () => {
        setIndex((i) => i + 1)
        gsap.set(leaf, { rotationY: 0, autoAlpha: 0 })
        setBusy(false)
      },
    })
  }, [active, busy, index, last, spreads])

  const turnBack = useCallback(() => {
    if (!active || busy || index <= 0) return
    const leaf = leafRef.current
    if (!leaf) return
    setBusy(true)

    const front = leaf.querySelector<HTMLElement>('.page-face--front')
    const back = leaf.querySelector<HTMLElement>('.page-face--back')
    if (front) front.style.backgroundImage = `url(${spreads[index - 1].right})`
    if (back) back.style.backgroundImage = `url(${spreads[index].left})`

    gsap.set(leaf, {
      rotationY: -180,
      autoAlpha: 1,
      transformOrigin: 'left center',
    })
    gsap.to(leaf, {
      rotationY: 0,
      duration: 0.9,
      ease: 'power2.inOut',
      onComplete: () => {
        setIndex((i) => i - 1)
        gsap.set(leaf, { rotationY: 0, autoAlpha: 0 })
        setBusy(false)
      },
    })
  }, [active, busy, index, spreads])

  useLayoutEffect(() => {
    if (!active) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault()
        turnForward()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        turnBack()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active, turnForward, turnBack])

  return (
    <div className={`sketchbook-pages ${active ? 'is-active' : ''}`}>
      {/* Measure plate for corner radius that tracks rendered page height */}
      <div
        ref={measureRef}
        className="page-plate page-plate--left"
        style={{
          ...rectStyle(leftPage),
          ...round,
          backgroundImage: `url(${current.left})`,
        }}
        aria-hidden
      />
      <div
        className="page-plate page-plate--right page-plate--under"
        style={{
          ...rectStyle(rightPage),
          ...round,
          backgroundImage: `url(${index < last ? next.right : current.right})`,
        }}
        aria-hidden
      />
      <button
        type="button"
        className="page-plate page-plate--right page-plate--hit"
        style={{
          ...rectStyle(rightPage),
          ...round,
          backgroundImage: `url(${current.right})`,
        }}
        aria-label="Turn to next page"
        disabled={!active || busy || index >= last}
        onClick={turnForward}
      />
      <button
        type="button"
        className="page-plate page-plate--left page-plate--hit-prev"
        style={{ ...rectStyle(leftPage), ...round }}
        aria-label="Turn to previous page"
        disabled={!active || busy || index <= 0}
        onClick={turnBack}
      />

      <div className="page-leaf-stage" style={{ ...rectStyle(rightPage), ...round }}>
        <div ref={leafRef} className="page-leaf" aria-hidden>
          <div className="page-face page-face--front" style={round} />
          <div className="page-face page-face--back" style={round} />
          <div className="page-leaf__shade" style={round} />
        </div>
      </div>

      <div
        className="sketchbook-pages__nav"
        style={{
          left: `${(pageRect.left + pageRect.width / 2) * 100}%`,
          top: `${(pageRect.top + pageRect.height) * 100}%`,
        }}
      >
        <button
          type="button"
          className="sketchbook-nav-btn"
          onClick={turnBack}
          disabled={!active || busy || index <= 0}
          aria-label="Previous page"
        >
          ‹
        </button>
        <span className="sketchbook-pages__count">
          {index + 1} / {spreads.length}
        </span>
        <button
          type="button"
          className="sketchbook-nav-btn"
          onClick={turnForward}
          disabled={!active || busy || index >= last}
          aria-label="Next page"
        >
          ›
        </button>
      </div>
    </div>
  )
}
