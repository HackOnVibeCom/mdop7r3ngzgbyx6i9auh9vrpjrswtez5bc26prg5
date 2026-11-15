/**
 * Fixed paper-grain + the SVG filter used by rubber stamps.
 * Rendered once, at the app root. Never captures pointer events.
 */
export default function GrainOverlay() {
  return (
    <>
      <svg aria-hidden="true" className="pointer-events-none absolute h-0 w-0">
        <filter id="paper-grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <filter id="rough-edge">
          <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="3" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <filter id="ink-splat">
          <feTurbulence type="fractalNoise" baseFrequency="0.02 0.03" numOctaves="3" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="12" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-[60] opacity-[0.06] mix-blend-multiply"
        style={{ filter: 'url(#paper-grain)', backgroundColor: '#8a7a5f' }}
      />
    </>
  )
}
