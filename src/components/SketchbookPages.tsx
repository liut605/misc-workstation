import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { SKETCHBOOK } from '../lib/config'
import './SketchbookPages.css'

type SketchbookPagesProps = {
  active: boolean
}

export function SketchbookPages({ active }: SketchbookPagesProps) {
  const [index, setIndex] = useState(0)
  const [busy, setBusy] = useState(false)
  const leafRef = useRef<HTMLDivElement>(null)

  const spreads = SKETCHBOOK.spreads
  const last = spreads.length - 1
  const current = spreads[index]
  const next = spreads[Math.min(index + 1, last)]
  const { left, top, width, height } = SKETCHBOOK.pageRect

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
    if (front) {
      front.style.backgroundImage = `url(${spreads[index].right})`
    }
    if (back) {
      back.style.backgroundImage = `url(${spreads[index + 1].left})`
    }

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
    if (front) {
      front.style.backgroundImage = `url(${spreads[index - 1].right})`
    }
    if (back) {
      back.style.backgroundImage = `url(${spreads[index].left})`
    }

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
      <div
        className="sketchbook-pages__stage"
        style={{
          left: `${left * 100}%`,
          top: `${top * 100}%`,
          width: `${width * 100}%`,
          height: `${height * 100}%`,
        }}
      >
        <div
          className="page-half page-half--left"
          style={{ backgroundImage: `url(${current.left})` }}
          aria-hidden
        />
        <div
          className="page-half page-half--right page-half--under"
          style={{
            backgroundImage: `url(${index < last ? next.right : current.right})`,
          }}
          aria-hidden
        />
        <button
          type="button"
          className="page-half page-half--right page-half--hit"
          style={{ backgroundImage: `url(${current.right})` }}
          aria-label="Turn to next page"
          disabled={!active || busy || index >= last}
          onClick={turnForward}
        />
        <button
          type="button"
          className="page-half page-half--left page-half--hit-prev"
          aria-label="Turn to previous page"
          disabled={!active || busy || index <= 0}
          onClick={turnBack}
        />
        <div ref={leafRef} className="page-leaf" aria-hidden>
          <div className="page-face page-face--front" />
          <div className="page-face page-face--back" />
          <div className="page-leaf__shade" />
        </div>
      </div>

      <div className="sketchbook-pages__nav">
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
