/**
 * Static SVG twin of the 3D pop-up postcard.
 * Used as the Suspense fallback, and as the only hero on low-power devices
 * or when the user prefers reduced motion.
 */
export default function HeroPostcardStatic({ animate = true }) {
  return (
    <svg
      viewBox="0 0 390 300"
      className="h-full w-full"
      role="img"
      aria-label="Paper pop-up postcard: pahaad, suraj aur ek chhoti train"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <clipPath id="hero-frame">
          <rect x="0" y="0" width="390" height="300" rx="0" />
        </clipPath>
      </defs>
      <g clipPath="url(#hero-frame)">
        {/* sky */}
        <rect width="390" height="300" fill="#F6EFE3" />
        <circle cx="300" cy="78" r="44" fill="#F4C430" stroke="#1E1B2E" strokeWidth="3" />
        {/* sun rays */}
        <g stroke="#1E1B2E" strokeWidth="2.5" strokeLinecap="round" opacity="0.65">
          <path d="M300 18v-10M352 78h10M248 78h-10M338 40l7-7M262 40l-7-7" />
        </g>
        {/* far mountains */}
        <path d="M-20 196L80 96l70 70 55-52 90 82 115-40v110H-20z" fill="#0F8B8D" stroke="#1E1B2E" strokeWidth="3" />
        {/* mid mountains */}
        <path d="M-20 214L60 142l62 56 56-40 84 70 128-30v96H-20z" fill="#E8336D" stroke="#1E1B2E" strokeWidth="3" />
        {/* snow caps */}
        <path d="M60 142l20 18-12 4-10-6-10 8z" fill="#F6EFE3" stroke="#1E1B2E" strokeWidth="2" />
        {/* front hills */}
        <path d="M-20 252L70 206l80 34 90-26 90 38 80-22v72H-20z" fill="#FF7A1A" stroke="#1E1B2E" strokeWidth="3" />
        {/* track */}
        <rect x="-20" y="262" width="430" height="10" fill="#EADFCB" stroke="#1E1B2E" strokeWidth="3" />
        <g stroke="#1E1B2E" strokeWidth="2.5">
          {Array.from({ length: 16 }).map((_, i) => (
            <path key={i} d={`M${-10 + i * 26} 272v10`} />
          ))}
        </g>
        {/* train */}
        <g>
          {animate && (
            <animateTransform
              attributeName="transform"
              type="translate"
              values="-90 0; 400 0"
              dur="11s"
              repeatCount="indefinite"
            />
          )}
          <rect x="60" y="232" width="56" height="30" rx="8" fill="#14213D" stroke="#1E1B2E" strokeWidth="3" />
          <rect x="68" y="239" width="16" height="12" rx="3" fill="#F4C430" stroke="#1E1B2E" strokeWidth="2" />
          <rect x="90" y="239" width="16" height="12" rx="3" fill="#F4C430" stroke="#1E1B2E" strokeWidth="2" />
          <circle cx="74" cy="264" r="5" fill="#1E1B2E" />
          <circle cx="104" cy="264" r="5" fill="#1E1B2E" />
          <path d="M60 232h-14v30h14z" fill="#D7263D" stroke="#1E1B2E" strokeWidth="3" />
          <circle cx="42" cy="222" r="6" fill="#F6EFE3" stroke="#1E1B2E" strokeWidth="2" opacity="0.85" />
          <circle cx="30" cy="208" r="8" fill="#F6EFE3" stroke="#1E1B2E" strokeWidth="2" opacity="0.6" />
        </g>
        {/* floating ticket */}
        <g transform="rotate(-10 70 70)">
          <rect x="34" y="46" width="78" height="46" rx="8" fill="#F6EFE3" stroke="#1E1B2E" strokeWidth="3" />
          <path d="M88 46v46" stroke="#1E1B2E" strokeWidth="2" strokeDasharray="4 4" />
          <path d="M44 62h34M44 74h22" stroke="#1E1B2E" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="100" cy="69" r="6" fill="#0F8B8D" stroke="#1E1B2E" strokeWidth="2.5" />
        </g>
        {/* paper plane */}
        <g transform="translate(210 40) rotate(12)">
          <path d="M0 0l44 16-18 6-4 14-8-16z" fill="#F6EFE3" stroke="#1E1B2E" strokeWidth="2.5" />
          <path d="M0 0l22 22" stroke="#1E1B2E" strokeWidth="2" />
        </g>
      </g>
    </svg>
  )
}
