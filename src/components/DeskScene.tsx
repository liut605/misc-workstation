import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { DESK_IMAGE, NOTEBOOK, OVERHEAD_IMAGE, SCREEN_RECT, WALL } from '../lib/config'
import { MonitorPreview } from './MonitorPreview'
import { SketchbookPages } from './SketchbookPages'
import './DeskScene.css'

const IMG_W = DESK_IMAGE.width
const IMG_H = DESK_IMAGE.height
const IMG_ASPECT = IMG_W / IMG_H
const OVERHEAD_ASPECT = OVERHEAD_IMAGE.width / OVERHEAD_IMAGE.height

type ScreenRect = { top: number; left: number; width: number; height: number }

export type DeskMode = 'room' | 'zooming' | 'desktop' | 'sketchbook'

type DeskSceneProps = {
  mode: DeskMode
  /** Last browser tab — painted onto the iMac so zoom-out keeps that page visible. */
  monitorTabId: string
  onOpenDesktop: (screenRect: ScreenRect) => void
  onOpenSketchbook: () => void
  onExitSketchbook: () => void
  onBackHome: () => void
  sceneRef?: React.RefObject<HTMLDivElement | null>
}

/**
 * Cover-fit a photo into the viewport while preserving aspect.
 * Children using image-normalized % must live inside this box.
 */
function coverLayoutFor(aspect: number, vw: number, vh: number) {
  let height = vh
  let width = height * aspect
  let top = 0
  let left = (vw - width) / 2

  if (width + 0.5 < vw) {
    width = vw
    height = width / aspect
    left = 0
    top = (vh - height) / 2
  }

  const overscan = 1.002
  const cx = left + width / 2
  const cy = top + height / 2
  width *= overscan
  height *= overscan
  left = cx - width / 2
  top = cy - height / 2

  return { width, height, top, left }
}

function coverLayout(vw: number, vh: number) {
  return coverLayoutFor(IMG_ASPECT, vw, vh)
}

function playVideoReverse(
  video: HTMLVideoElement,
  onDone: () => void,
  rate = 1,
  /** Stop and fire onDone when currentTime reaches this (seconds). */
  stopAt = 0.02,
): () => void {
  let cancelled = false
  let raf = 0
  const fps = 30
  const step = (1 / fps) * Math.max(0.25, rate)
  let last = performance.now()
  const threshold = Math.max(0, stopAt)

  const tick = (now: number) => {
    if (cancelled) return
    const elapsed = now - last
    if (elapsed >= 1000 / fps) {
      last = now
      const next = Math.max(threshold, video.currentTime - step)
      video.currentTime = next
      if (next <= threshold + 0.001) {
        video.pause()
        video.currentTime = threshold
        onDone()
        return
      }
    }
    raf = requestAnimationFrame(tick)
  }

  video.pause()
  raf = requestAnimationFrame(tick)
  return () => {
    cancelled = true
    cancelAnimationFrame(raf)
  }
}

/**
 * Usable media window after trimming book/desk edge skips.
 * For zoom-out clips: book ≈ low time, desk ≈ high time.
 */
function zoomPlayWindow(duration: number) {
  const skipBook = Math.max(0, NOTEBOOK.zoomEdgeSkipBook)
  const skipDesk = Math.max(0, NOTEBOOK.zoomEdgeSkipDesk)
  const lead = Math.max(0, NOTEBOOK.zoomHandoffLead)
  if (!Number.isFinite(duration) || duration <= 0) {
    return {
      book: skipBook,
      desk: skipBook + 0.1,
      bookStop: skipBook + lead,
    }
  }
  const maxSkip = Math.max(0, duration / 2 - 0.05)
  const book = Math.min(skipBook, maxSkip)
  const desk = Math.max(book + 0.05, duration - Math.min(skipDesk, maxSkip))
  const bookStop = Math.min(desk - 0.02, book + lead)
  return { book, desk, bookStop }
}

/** Seek and resolve only after the target frame is painted (avoids flashing frame 0). */
function seekVideoTo(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve) => {
    const target = Math.max(0, time)
    const closeEnough =
      Number.isFinite(video.currentTime) &&
      Math.abs(video.currentTime - target) < 0.05 &&
      video.readyState >= 2

    if (closeEnough) {
      resolve()
      return
    }

    let done = false
    const finish = () => {
      if (done) return
      done = true
      video.removeEventListener('seeked', finish)
      window.clearTimeout(fallback)
      resolve()
    }

    const fallback = window.setTimeout(finish, 400)
    video.addEventListener('seeked', finish)
    video.pause()
    try {
      video.currentTime = target
    } catch {
      finish()
    }
  })
}

function whenVideoDurationReady(
  video: HTMLVideoElement,
  fn: () => void,
): () => void {
  if (Number.isFinite(video.duration) && video.duration > 0) {
    fn()
    return () => {}
  }
  const onMeta = () => {
    video.removeEventListener('loadedmetadata', onMeta)
    fn()
  }
  video.addEventListener('loadedmetadata', onMeta)
  return () => video.removeEventListener('loadedmetadata', onMeta)
}

export function DeskScene({
  mode,
  monitorTabId,
  onOpenDesktop,
  onOpenSketchbook,
  onExitSketchbook,
  onBackHome,
  sceneRef: externalSceneRef,
}: DeskSceneProps) {
  const internalSceneRef = useRef<HTMLDivElement>(null)
  const sceneRef = externalSceneRef ?? internalSceneRef
  const hotspotRef = useRef<HTMLButtonElement>(null)
  const notebookHotspotRef = useRef<HTMLButtonElement>(null)
  const notebookFocusRef = useRef<HTMLSpanElement>(null)
  const overheadRef = useRef<HTMLDivElement>(null)
  const overheadStageRef = useRef<HTMLDivElement>(null)
  const zoomVideoRef = useRef<HTMLVideoElement>(null)
  const prevModeRef = useRef<DeskMode>(mode)
  const reverseCancelRef = useRef<(() => void) | null>(null)
  const sketchTlRef = useRef<gsap.core.Timeline | null>(null)
  const [hintVisible, setHintVisible] = useState(false)
  const [notebookHint, setNotebookHint] = useState(false)
  const [wallHint, setWallHint] = useState(false)
  const [pagesActive, setPagesActive] = useState(false)
  const [videoPlaying, setVideoPlaying] = useState(false)

  // Park zoom-out clip on the trimmed desk frame while idle so enter never paints frame 0.
  useEffect(() => {
    const video = zoomVideoRef.current
    if (!video || !NOTEBOOK.zoomVideo || !NOTEBOOK.zoomVideoIsZoomOut) return
    return whenVideoDurationReady(video, () => {
      const { desk } = zoomPlayWindow(video.duration)
      void seekVideoTo(video, desk)
    })
  }, [])

  // Decode overhead still early so the video→prototype cut never waits on image paint.
  useEffect(() => {
    const img = new Image()
    img.src = '/sketchbook-overhead.jpg'
    void img.decode?.().catch(() => {})
  }, [])

  useLayoutEffect(() => {
    const scene = sceneRef.current
    if (!scene) return

    const apply = () => {
      const { width, height, top, left } = coverLayout(
        window.innerWidth,
        window.innerHeight,
      )
      scene.style.width = `${width}px`
      scene.style.height = `${height}px`
      scene.style.top = `${top}px`
      scene.style.left = `${left}px`
      scene.style.marginLeft = '0'
    }

    apply()
    window.addEventListener('resize', apply)
    window.visualViewport?.addEventListener('resize', apply)
    return () => {
      window.removeEventListener('resize', apply)
      window.visualViewport?.removeEventListener('resize', apply)
    }
  }, [sceneRef])

  // Keep overhead photo + page plates in one cover-fit stage so image-% coords match pixels.
  useLayoutEffect(() => {
    const stage = overheadStageRef.current
    if (!stage) return

    const apply = () => {
      const { width, height } = coverLayoutFor(
        OVERHEAD_ASPECT,
        window.innerWidth,
        window.innerHeight,
      )
      // Center with translate so we never fight a leftover margin-left.
      stage.style.width = `${width}px`
      stage.style.height = `${height}px`
      stage.style.top = '50%'
      stage.style.left = '50%'
      stage.style.right = 'auto'
      stage.style.bottom = 'auto'
      stage.style.margin = '0'
      stage.style.transform = 'translate(-50%, -50%)'
    }

    apply()
    window.addEventListener('resize', apply)
    window.visualViewport?.addEventListener('resize', apply)
    return () => {
      window.removeEventListener('resize', apply)
      window.visualViewport?.removeEventListener('resize', apply)
    }
  }, [])

  // Sketchbook: Flow zoom video → overhead handoff (fallback: 2D dolly).
  useLayoutEffect(() => {
    const scene = sceneRef.current
    const focus = notebookFocusRef.current
    const overhead = overheadRef.current
    const video = zoomVideoRef.current
    if (!scene || !focus || !overhead) return

    const prev = prevModeRef.current
    prevModeRef.current = mode

    sketchTlRef.current?.kill()
    reverseCancelRef.current?.()
    reverseCancelRef.current = null

    const hasVideo = Boolean(video && NOTEBOOK.zoomVideo)
    // Monitor enter/exit dollies the desk scene from App — don't fight that transform.
    if (mode === 'zooming' || mode === 'desktop') return
    if (prev === 'zooming' || prev === 'desktop') {
      // App owns the computer dolly; only clean up sketchbook media here.
      if (video) gsap.set(video, { autoAlpha: 0 })
      gsap.set(overhead, { autoAlpha: 0, scale: 1.02 })
      setPagesActive(false)
      setVideoPlaying(false)
      return
    }

    const origin = `${NOTEBOOK.centerX * 100}% ${NOTEBOOK.centerY * 100}%`
    gsap.set(scene, { transformOrigin: origin, force3D: true })

    const fadeDur = NOTEBOOK.zoomHandoffFade

    const handoffToOverhead = () => {
      // Fade interactive overhead in over the paused last video frame.
      // Keep video opaque underneath so the desk never shows through.
      if (video) video.pause()
      setPagesActive(true)
      gsap.set(overhead, { scale: 1, autoAlpha: 0 })
      const tl = gsap.timeline({
        onComplete: () => {
          if (video) gsap.set(video, { autoAlpha: 0 })
          setVideoPlaying(false)
        },
      })
      sketchTlRef.current = tl
      tl.to(overhead, {
        autoAlpha: 1,
        duration: fadeDur,
        ease: 'power2.inOut',
      })
    }

    /** Fade video in over the desk still, then run `onShown`. */
    const revealVideoOverDesk = (
      el: HTMLVideoElement,
      onShown: () => void,
      isCancelled: () => boolean,
    ) => {
      gsap.set(el, { autoAlpha: 0 })
      const tl = gsap.timeline({
        onComplete: () => {
          if (isCancelled()) return
          onShown()
        },
      })
      sketchTlRef.current = tl
      tl.to(el, {
        autoAlpha: 1,
        duration: fadeDur,
        ease: 'power2.inOut',
      })
    }

    /** Fade video out over the desk still, then run cleanup. */
    const concealVideoOverDesk = (
      el: HTMLVideoElement,
      onHidden: () => void,
      isCancelled: () => boolean,
    ) => {
      const tl = gsap.timeline({
        onComplete: () => {
          if (isCancelled()) return
          onHidden()
        },
      })
      sketchTlRef.current = tl
      tl.to(el, {
        autoAlpha: 0,
        duration: fadeDur,
        ease: 'power2.inOut',
      })
    }

    if (mode === 'sketchbook' && prev !== 'sketchbook') {
      setPagesActive(false)
      gsap.set(scene, { x: 0, y: 0, scale: 1, rotation: 0 })
      gsap.set(overhead, { autoAlpha: 0, scale: 1.02 })

      if (hasVideo && video) {
        setVideoPlaying(true)
        // Stay hidden until the enter start-frame is seeked — zoom-out clips
        // otherwise flash frame 0 (enlarged notebook) for a beat.
        gsap.set(video, { autoAlpha: 0 })
        const rate = NOTEBOOK.zoomPlaybackRate
        const zoomOut = NOTEBOOK.zoomVideoIsZoomOut
        let cancelled = false
        let disposeMeta: (() => void) | null = null
        const isCancelled = () => cancelled

        if (zoomOut) {
          // Clip is book → desk. Enter = reverse from trimmed desk → trimmed book.
          disposeMeta = whenVideoDurationReady(video, () => {
            const { desk, bookStop } = zoomPlayWindow(video.duration)
            void seekVideoTo(video, desk).then(() => {
              if (cancelled) return
              revealVideoOverDesk(
                video,
                () => {
                  reverseCancelRef.current = playVideoReverse(
                    video,
                    handoffToOverhead,
                    rate,
                    bookStop,
                  )
                },
                isCancelled,
              )
            })
          })
        } else {
          // Clip is desk → book. Enter = play forward across the trimmed window.
          let handedOff = false

          const tryHandoff = () => {
            if (handedOff || cancelled) return
            const dur = video.duration
            if (!Number.isFinite(dur) || dur <= 0) return
            const { desk } = zoomPlayWindow(dur)
            if (video.currentTime >= desk - 0.001) {
              handedOff = true
              video.pause()
              video.removeEventListener('timeupdate', onTime)
              video.removeEventListener('ended', onEnded)
              handoffToOverhead()
            }
          }

          const onTime = () => tryHandoff()
          const onEnded = () => {
            if (handedOff || cancelled) return
            handedOff = true
            video.removeEventListener('timeupdate', onTime)
            handoffToOverhead()
          }

          disposeMeta = whenVideoDurationReady(video, () => {
            const { book } = zoomPlayWindow(video.duration)
            void seekVideoTo(video, book).then(() => {
              if (cancelled) return
              video.playbackRate = rate
              revealVideoOverDesk(
                video,
                () => {
                  video.addEventListener('timeupdate', onTime)
                  video.addEventListener('ended', onEnded)
                  void video.play().catch(() => {
                    if (cancelled) return
                    handedOff = true
                    video.removeEventListener('timeupdate', onTime)
                    video.removeEventListener('ended', onEnded)
                    handoffToOverhead()
                  })
                },
                isCancelled,
              )
            })
          })

          return () => {
            cancelled = true
            disposeMeta?.()
            video.removeEventListener('timeupdate', onTime)
            video.removeEventListener('ended', onEnded)
            sketchTlRef.current?.kill()
            reverseCancelRef.current?.()
          }
        }

        return () => {
          cancelled = true
          disposeMeta?.()
          sketchTlRef.current?.kill()
          reverseCancelRef.current?.()
        }
      }

      // Fallback: 2D dolly + overhead crossfade
      const focusBox = focus.getBoundingClientRect()
      const focusCx = focusBox.left + focusBox.width / 2
      const focusCy = focusBox.top + focusBox.height / 2
      const scale = NOTEBOOK.zoom.scale
      const dx = window.innerWidth / 2 - focusCx
      const dy = window.innerHeight / 2 - focusCy
      const dur = NOTEBOOK.zoom.duration

      const tl = gsap.timeline({
        onComplete: () => setPagesActive(true),
      })
      sketchTlRef.current = tl
      tl.to(
        scene,
        {
          x: dx,
          y: dy,
          scale,
          rotation: NOTEBOOK.zoom.rotateZ,
          duration: dur,
          ease: 'power2.inOut',
        },
        0,
      )
      tl.to(
        overhead,
        {
          autoAlpha: 1,
          scale: 1,
          duration: dur * 0.55,
          ease: 'power2.out',
        },
        dur * NOTEBOOK.zoom.overheadFadeAt,
      )
    } else if (mode === 'room' && prev === 'sketchbook') {
      if (hasVideo && video) {
        const zoomOut = NOTEBOOK.zoomVideoIsZoomOut
        const rate = NOTEBOOK.zoomPlaybackRate
        let cancelled = false

        const parkVideoAfterExit = () => {
          video.pause()
          if (
            NOTEBOOK.zoomVideoIsZoomOut &&
            Number.isFinite(video.duration) &&
            video.duration > 0
          ) {
            const { desk } = zoomPlayWindow(video.duration)
            video.currentTime = desk
          } else {
            const { book } = zoomPlayWindow(
              Number.isFinite(video.duration) ? video.duration : 0,
            )
            video.currentTime = book
          }
        }

        const finishExit = () => {
          // Crossfade video → desk, then clear sketchbook layers.
          concealVideoOverDesk(
            video,
            () => {
              setPagesActive(false)
              setVideoPlaying(false)
              gsap.set(video, { autoAlpha: 0 })
              gsap.set(overhead, { autoAlpha: 0, scale: 1.02 })
              gsap.set(scene, { x: 0, y: 0, scale: 1, rotation: 0 })
              parkVideoAfterExit()
            },
            () => cancelled,
          )
        }

        const startExitPlayback = () => {
          if (cancelled) return
          setVideoPlaying(true)
          setPagesActive(false)
          if (zoomOut) {
            // Clip is book → desk. Exit = play forward across the trimmed window.
            const { book, desk } = zoomPlayWindow(video.duration)
            video.playbackRate = rate
            // Already seeked + revealed under overhead; ensure time & opacity.
            if (Math.abs(video.currentTime - book) > 0.08) {
              video.currentTime = book
            }
            gsap.set(video, { autoAlpha: 1 })
            let finished = false
            const finish = () => {
              if (finished) return
              finished = true
              video.pause()
              video.removeEventListener('timeupdate', onTime)
              video.removeEventListener('ended', onEnded)
              finishExit()
            }
            const onTime = () => {
              if (video.currentTime >= desk - 0.001) finish()
            }
            const onEnded = () => finish()
            video.addEventListener('timeupdate', onTime)
            video.addEventListener('ended', onEnded)
            void video.play().catch(() => finish())
            reverseCancelRef.current = () => {
              finished = true
              video.removeEventListener('timeupdate', onTime)
              video.removeEventListener('ended', onEnded)
              video.pause()
            }
          } else {
            // Clip is desk → book. Exit = reverse across the trimmed window.
            const { bookStop, desk } = zoomPlayWindow(video.duration)
            void seekVideoTo(video, desk).then(() => {
              if (cancelled) return
              gsap.set(video, { autoAlpha: 1 })
              reverseCancelRef.current = playVideoReverse(
                video,
                finishExit,
                rate,
                bookStop,
              )
            })
          }
        }

        const overheadVisible =
          Number(gsap.getProperty(overhead, 'autoAlpha')) > 0.01

        if (overheadVisible) {
          // Seek book frame under the overhead, then fade overhead out onto video.
          const win = zoomPlayWindow(
            Number.isFinite(video.duration) ? video.duration : 0,
          )
          const bookTime = zoomOut ? win.book : win.desk
          void seekVideoTo(video, bookTime).then(() => {
            if (cancelled) return
            gsap.set(video, { autoAlpha: 1 })
            const tl = gsap.timeline({
              onComplete: () => {
                if (cancelled) return
                startExitPlayback()
              },
            })
            sketchTlRef.current = tl
            tl.to(overhead, {
              autoAlpha: 0,
              scale: 1.02,
              duration: fadeDur,
              ease: 'power2.inOut',
            })
          })
        } else {
          setPagesActive(false)
          // No overhead — fade video in over desk, then play exit.
          const win = zoomPlayWindow(
            Number.isFinite(video.duration) ? video.duration : 0,
          )
          const startTime = zoomOut ? win.book : win.desk
          void seekVideoTo(video, startTime).then(() => {
            if (cancelled) return
            revealVideoOverDesk(video, startExitPlayback, () => cancelled)
          })
        }

        return () => {
          cancelled = true
          sketchTlRef.current?.kill()
          reverseCancelRef.current?.()
        }
      }

      setPagesActive(false)

      const overheadVisible =
        Number(gsap.getProperty(overhead, 'autoAlpha')) > 0.01
      const currentScale = Number(gsap.getProperty(scene, 'scale'))
      if (!overheadVisible && currentScale === 1) {
        gsap.set(scene, { x: 0, y: 0, scale: 1, rotation: 0 })
        gsap.set(overhead, { autoAlpha: 0, scale: 1.06 })
        return
      }
      const tl = gsap.timeline()
      sketchTlRef.current = tl
      tl.to(overhead, {
        autoAlpha: 0,
        scale: 1.04,
        duration: 0.4,
        ease: 'power2.in',
      })
      tl.to(
        scene,
        {
          x: 0,
          y: 0,
          scale: 1,
          rotation: 0,
          duration: 1.0,
          ease: 'power2.inOut',
        },
        0.15,
      )
    } else if (mode === 'room' && prev === 'room') {
      gsap.set(scene, { x: 0, y: 0, scale: 1, rotation: 0 })
      gsap.set(overhead, { autoAlpha: 0, scale: 1.06 })
      if (video) gsap.set(video, { autoAlpha: 0 })
      setPagesActive(false)
      setVideoPlaying(false)
    }

    return () => {
      sketchTlRef.current?.kill()
      reverseCancelRef.current?.()
    }
  }, [mode, sceneRef])

  useLayoutEffect(() => {
    if (mode !== 'sketchbook') return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onExitSketchbook()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mode, onExitSketchbook])

  const interactive = mode === 'room'
  const showChrome = mode === 'room'
  const inSketchbook = mode === 'sketchbook' || videoPlaying

  return (
    <div
      className={`desk-view ${mode !== 'room' || videoPlaying ? 'is-zoomed' : ''} ${inSketchbook ? 'is-sketchbook' : ''}`}
    >
      {showChrome && (
        <button type="button" className="desk-back" onClick={onBackHome}>
          ← Home
        </button>
      )}

      {(mode === 'sketchbook' || videoPlaying) && (
        <button
          type="button"
          className="sketch-exit"
          aria-label="Exit sketchbook"
          onClick={onExitSketchbook}
        >
          <span aria-hidden="true" />
        </button>
      )}

      <div className="desk-stage">
        <div ref={sceneRef} className="desk-scene">
          <img
            className="desk-photo"
            src="/desk-final.jpg"
            alt="Workstation desk with blank frames, monitor, sketchbook, and camera"
            draggable={false}
          />

          <span
            ref={notebookFocusRef}
            className="notebook-focus"
            style={{
              left: `${NOTEBOOK.centerX * 100}%`,
              top: `${NOTEBOOK.centerY * 100}%`,
            }}
            aria-hidden="true"
          />

          <button
            type="button"
            className="wall-hotspot"
            aria-label="Wall frames coming soon"
            disabled={!interactive}
            tabIndex={interactive ? 0 : -1}
            onMouseEnter={() => interactive && setWallHint(true)}
            onMouseLeave={() => setWallHint(false)}
            onFocus={() => interactive && setWallHint(true)}
            onBlur={() => setWallHint(false)}
            style={{
              left: `${WALL.left * 100}%`,
              top: `${WALL.top * 100}%`,
              width: `${WALL.width * 100}%`,
              height: `${WALL.height * 100}%`,
            }}
          />

          {/* Live last-tab content on the iMac — hidden while fully in desktop mode. */}
          <div
            className={`screen-surface ${mode === 'desktop' ? 'is-hidden' : ''}`}
            style={{
              left: `${SCREEN_RECT.left * 100}%`,
              top: `${SCREEN_RECT.top * 100}%`,
              width: `${SCREEN_RECT.width * 100}%`,
              height: `${SCREEN_RECT.height * 100}%`,
            }}
            aria-hidden
          >
            <MonitorPreview tabId={monitorTabId} />
          </div>

          <button
            ref={hotspotRef}
            type="button"
            className="screen-hotspot"
            aria-label="Click the screen to enter projects"
            disabled={!interactive}
            onMouseEnter={() => {
              if (!interactive) return
              setWallHint(false)
              setHintVisible(true)
            }}
            onMouseLeave={() => setHintVisible(false)}
            onFocus={() => {
              if (!interactive) return
              setWallHint(false)
              setHintVisible(true)
            }}
            onBlur={() => setHintVisible(false)}
            onClick={() => {
              const el = hotspotRef.current
              if (!el) return
              const r = el.getBoundingClientRect()
              onOpenDesktop({
                top: r.top,
                left: r.left,
                width: r.width,
                height: r.height,
              })
            }}
            style={{
              left: `${SCREEN_RECT.left * 100}%`,
              top: `${SCREEN_RECT.top * 100}%`,
              width: `${SCREEN_RECT.width * 100}%`,
              height: `${SCREEN_RECT.height * 100}%`,
            }}
          />

          <button
            ref={notebookHotspotRef}
            type="button"
            className="notebook-hotspot"
            aria-label="Open sketchbook"
            disabled={!interactive}
            onMouseEnter={() => {
              if (!interactive) return
              setWallHint(false)
              setNotebookHint(true)
            }}
            onMouseLeave={() => setNotebookHint(false)}
            onFocus={() => {
              if (!interactive) return
              setWallHint(false)
              setNotebookHint(true)
            }}
            onBlur={() => setNotebookHint(false)}
            onClick={onOpenSketchbook}
            style={{
              left: `${NOTEBOOK.left * 100}%`,
              top: `${NOTEBOOK.top * 100}%`,
              width: `${NOTEBOOK.width * 100}%`,
              height: `${NOTEBOOK.height * 100}%`,
            }}
          />
        </div>
      </div>

      <video
        ref={zoomVideoRef}
        className="sketchbook-zoom-video"
        src={NOTEBOOK.zoomVideo}
        muted
        playsInline
        preload="auto"
        aria-hidden
      />

      <div
        ref={overheadRef}
        className="sketchbook-overhead"
        aria-hidden={!pagesActive}
      >
        <div ref={overheadStageRef} className="sketchbook-overhead__stage">
          <img
            src="/sketchbook-overhead.jpg"
            alt=""
            draggable={false}
          />
          <SketchbookPages active={pagesActive} />
        </div>
      </div>

      {showChrome && hintVisible && (
        <p className="desk-hint is-visible">Click the screen to enter projects</p>
      )}
      {showChrome && notebookHint && !hintVisible && (
        <p className="desk-hint is-visible">Click the sketchbook to look closer</p>
      )}
      {showChrome && wallHint && !hintVisible && !notebookHint && (
        <p className="desk-hint is-visible">Coming soon</p>
      )}
    </div>
  )
}
