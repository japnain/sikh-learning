interface NaamRasLogoMarkProps {
  className?: string
  seal?: boolean
  size?: number
  testId?: string
}

export default function NaamRasLogoMark({ className = '', seal = false, size = 48, testId }: NaamRasLogoMarkProps) {
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
      {seal ? (
        <>
          <rect x="5" y="5" width="54" height="54" rx="8" fill="#f1dcc0" />
          <rect x="7" y="7" width="50" height="50" rx="6" fill="none" stroke="#a95a22" strokeWidth="2.25" opacity="0.64" />
        </>
      ) : null}
      <text
        x="32"
        y="46.5"
        textAnchor="middle"
        fontFamily="Gurmukhi MN, Gurmukhi Sangam MN, Noto Sans Gurmukhi, serif"
        fontSize="49"
        fontWeight="700"
        fill="#a95a22"
      >
        ੴ
      </text>
      <path
        d="M20.5 53.5c3.7 2.4 7.6 3.6 11.5 3.6s7.8-1.2 11.5-3.6"
        stroke="#a95a22"
        strokeWidth="2.4"
        strokeLinecap="round"
        opacity="0.78"
      />
    </svg>
  )
}
