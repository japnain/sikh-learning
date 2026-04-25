import { useId } from 'react'

interface NaamRasLogoMarkProps {
  className?: string
  seal?: boolean
  size?: number
  testId?: string
}

export default function NaamRasLogoMark({ className = '', seal = false, size = 48, testId }: NaamRasLogoMarkProps) {
  const id = useId().replace(/:/g, '')
  const goldId = `naamras-gold-${id}`
  const sealId = `naamras-seal-${id}`

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className={className}
      data-testid={testId}
    >
      <defs>
        <radialGradient id={sealId} cx="42%" cy="30%" r="76%">
          <stop offset="0%" stopColor="#fff8e9" />
          <stop offset="68%" stopColor="#f1dcc0" />
          <stop offset="100%" stopColor="#d1aa70" />
        </radialGradient>
        <linearGradient id={goldId} x1="17" x2="48" y1="8" y2="55" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#c98b35" />
          <stop offset="45%" stopColor="#b85e1d" />
          <stop offset="100%" stopColor="#7b3b17" />
        </linearGradient>
      </defs>
      {seal ? (
        <>
          <rect x="5" y="5" width="54" height="54" rx="17" fill={`url(#${sealId})`} />
          <rect x="7" y="7" width="50" height="50" rx="15" fill="none" stroke={`url(#${goldId})`} strokeWidth="2.25" opacity="0.64" />
        </>
      ) : null}
      <text
        x="32"
        y="46.5"
        textAnchor="middle"
        fontFamily="Gurmukhi MN, Gurmukhi Sangam MN, Noto Sans Gurmukhi, serif"
        fontSize="49"
        fontWeight="700"
        fill={`url(#${goldId})`}
      >
        ੴ
      </text>
      <path
        d="M20.5 53.5c3.7 2.4 7.6 3.6 11.5 3.6s7.8-1.2 11.5-3.6"
        stroke={`url(#${goldId})`}
        strokeWidth="2.4"
        strokeLinecap="round"
        opacity="0.78"
      />
    </svg>
  )
}
