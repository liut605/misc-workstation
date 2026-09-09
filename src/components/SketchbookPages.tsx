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

/**
 * Overlay manual left + right page masks on the overhead still.
 * Page-turn art can layer on these plates next.
 */
export function SketchbookPages({ active }: SketchbookPagesProps) {
  const { leftMask, rightMask, leftPage, rightPage, pageRect } = SKETCHBOOK

  return (
    <div className={`sketchbook-pages ${active ? 'is-active' : ''}`}>
      <img
        className="page-mask page-mask--left"
        src={`${leftMask}?v=2`}
        alt=""
        draggable={false}
        aria-hidden
      />
      <img
        className="page-mask page-mask--right"
        src={`${rightMask}?v=2`}
        alt=""
        draggable={false}
        aria-hidden
      />

      <button
        type="button"
        className="page-hit page-hit--left"
        style={rectStyle(leftPage)}
        aria-label="Previous page"
        disabled
      />
      <button
        type="button"
        className="page-hit page-hit--right"
        style={rectStyle(rightPage)}
        aria-label="Next page"
        disabled
      />

      <div
        className="sketchbook-pages__nav"
        style={{
          left: `${(pageRect.left + pageRect.width / 2) * 100}%`,
          top: `${(pageRect.top + pageRect.height) * 100}%`,
        }}
      >
        <span className="sketchbook-pages__count">Both page masks loaded</span>
      </div>
    </div>
  )
}
