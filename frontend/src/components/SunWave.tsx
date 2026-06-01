// frontend/src/components/SunWave.tsx
//
// Layered sunlit wave horizon that sits at the bottom of the hero.
// Three SVG strips (back / mid / front) scroll horizontally at different
// speeds. Each strip's path is built so it tiles seamlessly across the
// 200%-wide SVG, and the CSS animation translates by exactly -50% — that
// keeps the loop seamless without any visible snap.
//
// Visuals (colours, height, blur) are tuned in `index.css` under
// `.sun-wave`.

const WAVE_PERIOD = 720; // px per single hump
const WAVE_TILES = 6; // 6 humps × 720 = 4320 px wide → tiles cleanly across 200%
const WAVE_W = WAVE_PERIOD * WAVE_TILES;
const WAVE_H = 360;

/**
 * Build one tileable wave path. Two cubic segments per period that mirror
 * each other so endpoints share tangents — guarantees no visible seam
 * where tile N ends and tile N+1 begins.
 */
function tilePath(base: number, amp: number): string {
  let d = `M0,${base}`;
  for (let i = 0; i < WAVE_TILES; i++) {
    const x0 = i * WAVE_PERIOD;
    const x1 = x0 + WAVE_PERIOD * 0.5;
    const x2 = x0 + WAVE_PERIOD;
    d += ` C${x0 + WAVE_PERIOD * 0.25},${base - amp} ${x1 - WAVE_PERIOD * 0.1},${base - amp} ${x1},${base}`;
    d += ` C${x1 + WAVE_PERIOD * 0.1},${base + amp} ${x2 - WAVE_PERIOD * 0.25},${base + amp} ${x2},${base}`;
  }
  d += ` L${WAVE_W},${WAVE_H} L0,${WAVE_H} Z`;
  return d;
}

const SunWave = () => {
  const viewBox = `0 0 ${WAVE_W} ${WAVE_H}`;
  return (
    <div className="sun-wave" aria-hidden="true">
      <div className="sun-wave-glow" />

      {/* back — soft amber, slowest */}
      <svg className="sun-wave-svg sun-wave-back" viewBox={viewBox} preserveAspectRatio="none">
        <defs>
          <linearGradient id="lume-sun-wave-back" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#f1c454" stopOpacity="0" />
            <stop offset="40%" stopColor="#e89446" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#d36a25" stopOpacity="0.85" />
          </linearGradient>
        </defs>
        <path d={tilePath(200, 70)} fill="url(#lume-sun-wave-back)" />
      </svg>

      {/* mid — honey, medium */}
      <svg className="sun-wave-svg sun-wave-mid" viewBox={viewBox} preserveAspectRatio="none">
        <defs>
          <linearGradient id="lume-sun-wave-mid" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#ffe17a" stopOpacity="0" />
            <stop offset="35%" stopColor="#f1c454" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#e89446" stopOpacity="1" />
          </linearGradient>
        </defs>
        <path d={tilePath(245, 55)} fill="url(#lume-sun-wave-mid)" />
      </svg>

      {/* front — bright sunshine, fastest */}
      <svg className="sun-wave-svg sun-wave-front" viewBox={viewBox} preserveAspectRatio="none">
        <defs>
          <linearGradient id="lume-sun-wave-front" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#fff4c2" stopOpacity="0" />
            <stop offset="20%" stopColor="#ffd968" stopOpacity="0.7" />
            <stop offset="60%" stopColor="#f1c454" stopOpacity="1" />
            <stop offset="100%" stopColor="#e9a92e" stopOpacity="1" />
          </linearGradient>
        </defs>
        <path d={tilePath(290, 45)} fill="url(#lume-sun-wave-front)" />
      </svg>
    </div>
  );
};

export default SunWave;
