import type { StoryArtwork as ArtworkKind } from '../types/stories'

/** Quiet, symbolic artwork: no portraits of the Gurus or invented historical scenes. */
export default function StoryArtwork({ kind, className = '' }: { kind: ArtworkKind; className?: string }) {
  return (
    <svg viewBox="0 0 480 320" fill="none" className={`story-artwork story-artwork--${kind} ${className}`} aria-hidden="true" focusable="false">
      <g stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity=".85">
        {kind === 'river' && <>
          <circle cx="330" cy="88" r="34" fill="currentColor" fillOpacity=".08" />
          {[166, 184, 206, 232, 262, 296].map((y, i) => <path key={y} d={`M-30 ${y} Q110 ${y - 45 - i * 3} 240 ${y} T520 ${y - 10}`} />)}
          <path d="M84 150 Q142 106 208 151 M286 150 Q356 111 424 150" opacity=".4" />
        </>}
        {kind === 'bowl' && <>
          <path d="M124 174 Q144 254 240 254 Q336 254 356 174 Z" fill="currentColor" fillOpacity=".1" />
          <ellipse cx="240" cy="174" rx="116" ry="23" />
          <ellipse cx="240" cy="174" rx="99" ry="15" opacity=".5" />
          <path d="M196 133 C172 106 212 96 193 70 M240 130 C218 104 256 91 239 61 M284 133 C262 106 299 95 282 72 M172 266 H308" />
        </>}
        {kind === 'doorway' && <>
          <path d="M142 274 V139 C142 80 240 53 240 53 C240 53 338 80 338 139 V274 M160 274 V145 C160 95 240 73 240 73 C240 73 320 95 320 145 V274 M210 274 V168 H270 V274 M80 274 H400" />
          <path d="M210 168 Q240 136 270 168" />
          {[104, 123, 356, 375].map(x => <path key={x} d={`M${x} 274 V176`} opacity=".35" />)}
          <path d="M176 274 H304 L347 308 H133 Z" opacity=".35" />
        </>}
        {kind === 'journey' && <>
          <circle cx="339" cy="82" r="28" fill="currentColor" fillOpacity=".08" />
          <path d="M0 185 L102 112 L193 184 L278 124 L399 185 L480 151 M0 205 Q121 163 240 205 T480 205 M249 208 C173 237 302 245 230 279 C215 287 192 301 177 320" />
          <path d="M0 224 Q100 202 194 222 M299 225 Q397 200 480 221" opacity=".4" />
        </>}
        {kind === 'thread' && <>
          <path d="M111 200 C84 87 349 49 366 145 C387 259 158 273 146 177 C136 102 304 80 324 155 C340 221 212 240 193 184 C178 139 270 111 284 156 C298 200 234 210 228 179" />
          <path d="M111 200 C126 256 168 276 211 288 M366 145 C374 115 402 95 422 88" />
        </>}
        {kind === 'light' && <>
          <path d="M173 224 Q240 268 307 224 L289 262 H191 Z M240 223 V178 C203 151 244 127 241 94 C280 144 272 164 240 178" fill="currentColor" fillOpacity=".1" />
          <circle cx="240" cy="164" r="85" strokeDasharray="1 9" />
          <circle cx="240" cy="164" r="110" strokeDasharray="1 12" opacity=".5" />
          <path d="M155 278 H325" />
        </>}
      </g>
    </svg>
  )
}
