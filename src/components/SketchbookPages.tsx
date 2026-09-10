import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import gsap from 'gsap'
import { SKETCHBOOK } from '../lib/config'
import './SketchbookPages.css'

type SketchbookPagesProps = {
  active: boolean
}

type FlipDirection = 'forward' | 'back'

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
  const unique = [...new Set(urls.filter(Boolean))]
  return Promise.all(
    unique.map(
      (src) =>
        new Promise<void>((resolve) => {
          const img = new Image()
          const done = () => resolve()
          img.onload = () => {
            if (img.decode) {
              void img.decode().then(done).catch(done)
            } else {
              done()
            }
          }
          img.onerror = done
          img.src = src
          if (img.complete && img.naturalWidth > 0) {
            if (img.decode) {
              void img.decode().then(done).catch(done)
            } else {
              done()
            }
          }
        }),
    ),
  )
}

/**
 * Interactive sketchbook: blank masked plates + multiply drawings + GSAP flip.
 *
 * Layer rules during a turn (so both destination drawings are visible immediately):
 * - Forward: hide the right hit plate so the under-right (next.right) shows through;
 *   leaf back carries next.left onto the left page. Commit index before hiding the leaf.
 * - Back: swap the left base to prev.left under the leaf at -180; leaf front carries
 *   prev.right onto the right page. Commit index before hiding the leaf.
 */
export function SketchbookPages({ active }: SketchbookPagesProps) {
  const [index, setIndex] = useState(0)
  const [busy, setBusy] = useState(false)
  const [flip, setFlip] = useState<FlipDirection | null>(null)
  const leafRef = useRef<HTMLDivElement>(null)
  const hitRightRef = useRef<HTMLButtonElement>(null)

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

  // Warm every spread drawing (plus blank plates) as soon as the book opens.
  useEffect(() => {
    if (!active) return
    void preloadUrls([blankLeft, blankRight, ...allDrawingUrls])
  }, [active, blankLeft, blankRight, allDrawingUrls])

  useLayoutEffect(() => {
    if (!active) {
      setIndex(0)
      setBusy(false)
      setFlip(null)
      if (leafRef.current) {
        gsap.set(leafRef.current, { rotationY: 0, autoAlpha: 0 })
      }
      if (hitRightRef.current) {
        gsap.set(hitRightRef.current, { autoAlpha: 1 })
      }
    }
  }, [active])

  // Left base: during a back-flip, show the destination left under the leaf.
  const leftDrawing = flip === 'back' && index > 0 ? prevSpread.left : current.left
  // Right under: always the page revealed by a forward flip (or current on the last spread).
  const rightUnderDrawing = index < last ? nextSpread.right : current.right
  // Visible right content when idle / after commit.
  const rightDrawing = current.right

  const turnForward = useCallback(async () => {
    if (!active || busy || index >= last) return
    const leaf = leafRef.current
    if (!leaf) return

    const from = spreads[index]
    const dest = spreads[index + 1]
    setBusy(true)
    setFlip('forward')

    // Both destination drawings must be decoded before the leaf moves.
    await preloadUrls([dest.left, dest.right, from.right])

    const front = leaf.querySelector<HTMLImageElement>('.page-face--front .page-drawing')
    const back = leaf.querySelector<HTMLImageElement>('.page-face--back .page-drawing')
    if (front) front.src = from.right
    if (back) back.src = dest.left

    // Hide the old right hit plate so under-right (dest.right) is what shows through.
    if (hitRightRef.current) {
      gsap.set(hitRightRef.current, { autoAlpha: 0 })
    }

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
        // Commit the new spread while the leaf still covers the handoff.
        flushSync(() => {
          setIndex((i) => i + 1)
          setFlip(null)
        })
        gsap.set(leaf, { rotationY: 0, autoAlpha: 0 })
        if (hitRightRef.current) {
          gsap.set(hitRightRef.current, { autoAlpha: 1 })
        }
        setBusy(false)
      },
    })
  }, [active, busy, index, last, spreads])

  const turnBack = useCallback(async () => {
    if (!active || busy || index <= 0) return
    const leaf = leafRef.current
    if (!leaf) return

    const from = spreads[index]
    const dest = spreads[index - 1]
    setBusy(true)

    // Both destination drawings must be decoded before the leaf moves.
    await preloadUrls([dest.left, dest.right, from.left])

    const front = leaf.querySelector<HTMLImageElement>('.page-face--front .page-drawing')
    const back = leaf.querySelector<HTMLImageElement>('.page-face--back .page-drawing')
    if (front) front.src = dest.right
    if (back) back.src = from.left

    // Cover the left with the leaf first, then swap the base to dest.left underneath.
    gsap.set(leaf, {
      rotationY: -180,
      autoAlpha: 1,
      transformOrigin: 'left center',
    })
    flushSync(() => {
      setFlip('back')
    })

    // Hide old right while the leaf carries dest.right onto the right plate.
    if (hitRightRef.current) {
      gsap.set(hitRightRef.current, { autoAlpha: 0 })
    }

    gsap.to(leaf, {
      rotationY: 0,
      duration: 0.95,
      ease: 'power2.inOut',
      onComplete: () => {
        flushSync(() => {
          setIndex((i) => i - 1)
          setFlip(null)
        })
        gsap.set(leaf, { rotationY: 0, autoAlpha: 0 })
        if (hitRightRef.current) {
          gsap.set(hitRightRef.current, { autoAlpha: 1 })
        }
        setBusy(false)
      },
    })
  }, [active, busy, index, spreads])

  useLayoutEffect(() => {
    if (!active) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault()
        void turnForward()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        void turnBack()
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
          <img key={src} src={src} alt="" decoding="sync" />
        ))}
        <img src={blankLeft} alt="" decoding="sync" />
        <img src={blankRight} alt="" decoding="sync" />
      </div>

      <div className="page-plate page-plate--left" style={rectStyle(leftPage)} aria-hidden>
        <PageArt paper={blankLeft} drawing={leftDrawing} />
      </div>

      {/* Revealed on the right as a forward leaf turns away. */}
      <div
        className="page-plate page-plate--right page-plate--under"
        style={rectStyle(rightPage)}
        aria-hidden
      >
        <PageArt paper={blankRight} drawing={rightUnderDrawing} />
      </div>

      {/* Warm neighbor spreads in the DOM (hidden) so decode stays hot. */}
      {index < last && (
        <div
          className="page-plate page-plate--left page-plate--preload-left"
          style={rectStyle(leftPage)}
          aria-hidden
        >
          <PageArt paper={blankLeft} drawing={nextSpread.left} />
        </div>
      )}
      {index > 0 && (
        <>
          <div
            className="page-plate page-plate--left page-plate--preload-left"
            style={rectStyle(leftPage)}
            aria-hidden
          >
            <PageArt paper={blankLeft} drawing={prevSpread.left} />
          </div>
          <div
            className="page-plate page-plate--right page-plate--preload-right"
            style={rectStyle(rightPage)}
            aria-hidden
          >
            <PageArt paper={blankRight} drawing={prevSpread.right} />
          </div>
        </>
      )}

      <button
        ref={hitRightRef}
        type="button"
        className="page-plate page-plate--right page-plate--hit"
        style={rectStyle(rightPage)}
        aria-label="Turn to next page"
        disabled={!active || busy || index >= last}
        onClick={() => void turnForward()}
      >
        <PageArt paper={blankRight} drawing={rightDrawing} />
      </button>
      <button
        type="button"
        className="page-plate page-plate--left page-plate--hit-prev"
        style={rectStyle(leftPage)}
        aria-label="Turn to previous page"
        disabled={!active || busy || index <= 0}
        onClick={() => void turnBack()}
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
          onClick={() => void turnBack()}
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
          onClick={() => void turnForward()}
          disabled={!active || busy || index >= last}
          aria-label="Next page"
        >
          ›
        </button>
      </div>
    </div>
  )
}
