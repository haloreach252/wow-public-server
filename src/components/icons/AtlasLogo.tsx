import type { SVGProps } from 'react'

interface AtlasLogoProps extends SVGProps<SVGSVGElement> {
  size?: number
}

export function AtlasLogo({ size = 32, className, ...props }: AtlasLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      {/* Outer ring */}
      <circle
        cx="32"
        cy="32"
        r="28"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
      />

      {/* Inner ring */}
      <circle
        cx="32"
        cy="32"
        r="22"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
        opacity="0.6"
      />

      {/* Cardinal direction markers */}
      {/* North */}
      <line x1="32" y1="6" x2="32" y2="12" stroke="currentColor" strokeWidth="2" />
      {/* South */}
      <line x1="32" y1="52" x2="32" y2="58" stroke="currentColor" strokeWidth="2" />
      {/* East */}
      <line x1="52" y1="32" x2="58" y2="32" stroke="currentColor" strokeWidth="2" />
      {/* West */}
      <line x1="6" y1="32" x2="12" y2="32" stroke="currentColor" strokeWidth="2" />

      {/* Compass needle - North (filled, pointing up) */}
      <polygon
        points="32,14 38,32 32,28 26,32"
        fill="currentColor"
      />

      {/* Compass needle - South (outline, pointing down) */}
      <polygon
        points="32,50 38,32 32,36 26,32"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
        opacity="0.7"
      />

      {/* Center dot */}
      <circle cx="32" cy="32" r="3" fill="currentColor" />

      {/* Decorative inner markers */}
      {/* NE */}
      <line x1="47" y1="17" x2="44" y2="20" stroke="currentColor" strokeWidth="1" opacity="0.5" />
      {/* NW */}
      <line x1="17" y1="17" x2="20" y2="20" stroke="currentColor" strokeWidth="1" opacity="0.5" />
      {/* SE */}
      <line x1="47" y1="47" x2="44" y2="44" stroke="currentColor" strokeWidth="1" opacity="0.5" />
      {/* SW */}
      <line x1="17" y1="47" x2="20" y2="44" stroke="currentColor" strokeWidth="1" opacity="0.5" />
    </svg>
  )
}
