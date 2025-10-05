import React from 'react'

// AsteroidArt: an SVG + CSS animated asteroid scene
export default function AsteroidArt({ className = '', style = {} }) {
  // generate a few extra drifting asteroids
  const extras = Array.from({ length: 10 }).map((_, i) => {
    const x = 60 + (i * 73) % 680
    const y = 40 + (i * 47) % 320
    const size = 6 + (i % 4) * 4
    const rotate = 6 + (i % 5) * 2 // seconds
    const drift = 8 + (i % 6) * 2 // seconds
    return { id: `extra-${i}`, x, y, size, rotate, drift }
  })

  return (
    <div className={`asteroid-art-root ${className}`} style={style}>
      <svg viewBox="0 0 800 400" preserveAspectRatio="xMidYMid meet" className="asteroid-svg" aria-hidden="true">
        <defs>
          {/* soft glow filter */}
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* rocky displacement using feTurbulence + feDisplacementMap for irregular shapes */}
          <filter id="rocky">
            <feTurbulence baseFrequency="0.9" numOctaves="2" seed="3" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="10" xChannelSelector="R" yChannelSelector="G" />
          </filter>

          {/* subtle stars background */}
          <pattern id="stars" width="20" height="20" patternUnits="userSpaceOnUse">
            <rect width="20" height="20" fill="transparent" />
            <circle cx="3" cy="6" r="0.6" fill="#ffffff33" />
            <circle cx="14" cy="2" r="0.8" fill="#ffffff22" />
            <circle cx="8" cy="12" r="0.5" fill="#ffffff11" />
          </pattern>
        </defs>

        {/* background */}
        <rect width="100%" height="100%" fill="url(#stars)" />

        {/* large rotating asteroid */}
        <g className="asteroid asteroid-large" style={{ transform: 'translate(120px, 120px)' }}>
          <g className="rotator" style={{ ['--rotate' ]: '22s' }}>
            <g filter="url(#glow)">
              <ellipse cx="0" cy="0" rx="78" ry="60" fill="#4b5563" className="base" />
            </g>
            <g filter="url(#rocky)" className="rock-surface">
              <path d="M-70,-10 C-60,-50 -20,-68 10,-60 C40,-52 62,-32 70,-6 C66,18 50,42 20,52 C-6,58 -42,56 -68,36 C-92,16 -84,-10 -70,-10 Z" fill="#2b2f36" opacity="0.9" />
            </g>
            <g className="pockmarks" opacity="0.9">
              <circle cx="-18" cy="-10" r="6" fill="#1f2328" />
              <circle cx="30" cy="8" r="8" fill="#23262b" />
              <circle cx="8" cy="-18" r="4" fill="#15161a" />
            </g>
          </g>
        </g>

        {/* medium rotating asteroid (kept for depth) */}
        <g className="asteroid asteroid-med" style={{ transform: 'translate(420px,220px)' }}>
          <g className="rotator" style={{ ['--rotate' ]: '14s' }}>
            <g filter="url(#glow)">
              <ellipse cx="0" cy="0" rx="46" ry="36" fill="#384048" className="base" />
            </g>
            <g filter="url(#rocky)" className="rock-surface">
              <path d="M-40,-6 C-28,-30 -8,-36 10,-30 C28,-24 38,-8 40,6 C36,22 22,34 4,36 C-10,38 -28,34 -36,22 C-46,6 -44,-6 -40,-6 Z" fill="#23282c" />
            </g>
          </g>
        </g>

        {/* extras: many small drifting asteroids */}
        {extras.map(a => (
          <g
            key={a.id}
            className="asteroid dynamic"
            style={{ transform: `translate(${a.x}px, ${a.y}px)` }}
          >
            <g className="rotator" style={{ ['--rotate']: `${a.rotate}s` }}>
              <g filter="url(#glow)">
                <ellipse cx="0" cy="0" rx={a.size * 1.4} ry={a.size} fill="#4a4f55" className="base" />
              </g>
              <g className="pockmarks">
                <circle cx={-Math.floor(a.size/2)} cy={-2} r={Math.max(1, Math.floor(a.size/3))} fill="#1b1d20" />
              </g>
            </g>
          </g>
        ))}
      </svg>

      <style>{`
        .asteroid-art-root { width: 100%; max-width: 880px; margin: 0 auto; }
        .asteroid-svg { width: 100%; height: 300px; display:block; background: linear-gradient(180deg,#0e1117 0%, #07070a 100%); border-radius: 12px; overflow: visible; }

  /* Animations: simple rotation for all asteroids */
  .rotator { transform-origin: center; animation: spin var(--rotate, 12s) linear infinite; }

  .trail path { stroke-dasharray: 240; stroke-dashoffset: 240; animation: dash 2s linear infinite; }

  @keyframes dash { to { stroke-dashoffset: 0; } }

  @keyframes spin { to { transform: rotate(360deg); } }

        /* subtle hover pop */
        .asteroid-art-root:hover .asteroid-large { transform: scale(1.02); }

        /* reduce motion on prefers-reduced-motion */
        @media (prefers-reduced-motion: reduce) {
          .asteroid-large, .asteroid-med, .asteroid-small, .trail path { animation: none !important; }
        }
      `}</style>
    </div>
  )
}
