import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
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

function PageArt({ paper, drawing }: { paper: string; drawing: string }) {
  return (
    <>
      <div
        className="page-paper"
        style={{ backgroundImage: `url(${paper})` }}
        aria-hidden
      />
      <div className="page-drawing-slot">
        <img className="page-drawing" src={drawing} alt="" draggable={false} />
      </div>
    </>
  )
}

function preloadUrls(urls: string[]) {
  return Promise.all(
    urls.map(
      (src) =>
        new Promise<void>((resolve) => {
          const img = new Image()
          img.onload = () => resolve()
          img.onerror = () => resolve()
          img.src = src
          void img.decode?.().then(() => resolve()).catch(() => resolve())
        }),
    ),
  )
}

/**
 * Interactive sketchbook: blank masked plates + multiply drawings + GSAP flip.
 */
export function SketchbookPages({ active }: SketchbookPagesProps) {
  const [index, setIndex] = useState(0)
  const [busy, setBusy] = useState(false)
  const leafRef = useRef<HTMLDivElement>(null)

  const spreads = SKETCHBOOK.spreads
  const last = spreads.length - 1
  const current = spreads[index]
  const nextSpread = spreads[Math.min(index + 1, last)]
  const prevSpread = spreads[Math.max(index - 1, 0)]
  const { leftPage, rightPage, pageRect, blankLeft, blankRight } = SKETCHBOOK

  const allDrawingUrls = useMemo(
    () => spreads.flatMap((s) => [s.left, s.right]),
    [spreads],
  )

  // Warm both pages of every spread (plus blank plates) as soon as the book opens.
  useEffect(() => {
    if (!active) return
    void preloadUrls([blankLeft, blankRight, ...allDrawingUrls])
  }, [active, blankLeft, blankRight, allDrawingUrls])

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

    const front = leaf.querySelector<HTMLImageElement>('.page-face--front .page-drawing')
    const back = leaf.querySelector<HTMLImageElement>('.page-face--back .page-drawing')
    if (front) front.src = spreads[index].right
    if (back) back.src = spreads[index + 1].left

    gsap.set(leaf, {
      rotationY: 0,
      autoAlpha: 1,
      transformOrigin: 'left center',
    })
    gsap.to(leaf, {
      rotationY: -180,
      duration: 0.95,
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

    const front = leaf.querySelector<HTMLImageElement>('.page-face--front .page-drawing')
    const back = leaf.querySelector<HTMLImageElement>('.page-face--back .page-drawing')
    if (front) front.src = spreads[index - 1].right
    if (back) back.src = spreads[index].left

    gsap.set(leaf, {
      rotationY: -180,
      autoAlpha: 1,
      transformOrigin: 'left center',
    })
    gsap.to(leaf, {
      rotationY: 0,
      duration: 0.95,
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
      {/* Keep every spread page decoded so both sides are ready before flips. */}
      <div className="sketchbook-preload" aria-hidden>
        {allDrawingUrls.map((src) => (
          <img key={src} src={src} alt="" />
        ))}
        <img src={blankLeft} alt="" />
        <img src={blankRight} alt="" />
      </div>

      <div className="page-plate page-plate--left" style={rectStyle(leftPage)} aria-hidden>
        <PageArt paper={blankLeft} drawing={current.left} />
      </div>
      {/* Under the flipping leaf: next spread’s right (or current if last). */}
      <div
        className="page-plate page-plate--right page-plate--under"
        style={rectStyle(rightPage)}
        aria-hidden
      >
        <PageArt
          paper={blankRight}
          drawing={index < last ? nextSpread.right : current.right}
        />
      </div>
      {/* Also keep current right mounted so both pages of this spread stay warm. */}
      <div
        className="page-plate page-plate--right page-plate--preload-right"
        style={rectStyle(rightPage)}
        aria-hidden
      >
        <PageArt paper={blankRight} drawing={current.right} />
      </div>
      <div
        className="page-plate page-plate--left page-plate--preload-left"
        style={rectStyle(leftPage)}
        aria-hidden
      >
        <PageArt
          paper={blankLeft}
          drawing={index < last ? nextSpread.left : current.left}
        />
      </div>
      {index > 0 && (
        <div
          className="page-plate page-plate--left page-plate--preload-left"
          style={rectStyle(leftPage)}
          aria-hidden
        >
          <PageArt paper={blankLeft} drawing={prevSpread.left} />
        </div>
      )}
      {index > 0 && (
        <div
          className="page-plate page-plate--right page-plate--preload-right"
          style={rectStyle(rightPage)}
          aria-hidden
        >
          <PageArt paper={blankRight} drawing={prevSpread.right} />
        </div>
      )}
      <button
        type="button"
        className="page-plate page-plate--right page-plate--hit"
        style={rectStyle(rightPage)}
        aria-label="Turn to next page"
        disabled={!active || busy || index >= last}
        onClick={turnForward}
      >
        <PageArt paper={blankRight} drawing={current.right} />
      </button>
      <button
        type="button"
        className="page-plate page-plate--left page-plate--hit-prev"
        style={rectStyle(leftPage)}
        aria-label="Turn to previous page"
        disabled={!active || busy || index <= 0}
        onClick={turnBack}
      />

      <div className="page-leaf-stage" style={rectStyle(rightPage)}>
        <div ref={leafRef} className="page-leaf" aria-hidden>
          <div className="page-face page-face--front">
            <PageArt paper={blankRight} drawing={current.right} />
          </div>
          <div className="page-face page-face--back">
            <PageArt
              paper={blankLeft}
              drawing={index < last ? nextSpread.left : current.left}
            />
          </div>
          <div className="page-leaf__shade" />
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
