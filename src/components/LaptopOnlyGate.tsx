import './LaptopOnlyGate.css'

/** Viewport width below this shows the laptop-only notice instead of the desk. */
export const DESKTOP_MIN_WIDTH = 1100

type LaptopOnlyGateProps = {
  children: React.ReactNode
}

/**
 * Misc desk is desktop-only for now. Narrow viewports get a simple redirect notice
 * so phones/tablets don’t load a broken interaction.
 */
export function LaptopOnlyGate({ children }: LaptopOnlyGateProps) {
  return (
    <>
      <div className="laptop-only" role="status" aria-live="polite">
        <div className="laptop-only-inner">
          <p className="laptop-only-brand">Misc</p>
          <h1 className="laptop-only-title">View on a laptop</h1>
          <p className="laptop-only-copy">
            This workstation is built for a larger screen. Open it on a laptop or
            desktop — phone and tablet layouts are coming soon.
          </p>
          <a
            className="laptop-only-back"
            href="https://tsingliu.info/"
          >
            back to portfolio
          </a>
        </div>
      </div>
      <div className="laptop-only-desk">{children}</div>
    </>
  )
}
