// frontend/src/components/WaveTransition.tsx
//
// "Ocean wave covers the navbar" effect for the LUME homepage.
//
// As the PrivateAccessSection (id="private-access") rises toward the
// fixed navbar, an ocean-blue wave climbs up and submerges it. The
// wave keeps drifting horizontally until the navbar is fully covered,
// at which point the drift freezes.
//
// Architecture:
//   <WaveProvider>          ← owns state, listens to scroll
//     <Navbar />            ← reads useWave() to flip its colors
//     ...page content...
//     <PrivateAccessSection /> ← the target (must keep id="private-access")
//     <WaveOverlay />       ← the visual layer (SVG waves + ocean fill)
//   </WaveProvider>
//
// The overlay sits at z-index 30 (below the navbar's z-50).
// While the wave is rising and visible, the navbar's sand bg fades out
// so the wave shows through; once submerged, the navbar text flips to
// warm-white and the drift animation is paused.

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

// ─── Tunable constants ─────────────────────────────────────────────────────
const OCEAN_COLOR  = "#4e8ba1";  // must match PrivateAccessSection's bg
const WAVE_HEIGHT  = 60;         // px — height of the wavy crest area
const SEAM_OVERLAP = 2;          // px — overlap to eliminate sub-pixel gap at boundary
const FADE_START   = 600;        // px — section.top above this: wave invisible
const FADE_END     = 80;         // px — section.top below this: wave fully opaque
                                 //      also where navbar bg begins to fade
const SUBMERGE_AT  = 0;          // px — section.top ≤ this: text/logo flip, drift freezes
// ───────────────────────────────────────────────────────────────────────────

interface WaveCtx {
  /** True once the section has fully reached the navbar. */
  submerged: boolean;
}

const WaveContext = createContext<WaveCtx>({ submerged: false });

/**
 * Hook used by the Navbar (and anything else) to react to the wave state.
 * Returns `{ submerged: false }` when used outside a WaveProvider, so it's
 * safe to call from pages that don't have the wave (e.g. /about, /properties).
 */
export const useWave = () => useContext(WaveContext);

interface ProviderProps {
  children: ReactNode;
  /** CSS selector for the section the wave attaches to. */
  targetSelector?: string;
}

/**
 * Wraps the page. Tracks the position of the target section on every
 * scroll/resize and exposes whether it has "reached" the navbar.
 */
export const WaveProvider = ({
  children,
  targetSelector = "#private-access",
}: ProviderProps) => {
  const [submerged, setSubmerged] = useState(false);

  useEffect(() => {
    let rafId: number | null = null;
    let lastSubmerged = false;

    const update = () => {
      rafId = null;
      const target = document.querySelector(targetSelector) as HTMLElement | null;
      if (!target) {
        if (lastSubmerged) {
          lastSubmerged = false;
          setSubmerged(false);
        }
        return;
      }

      const rect = target.getBoundingClientRect();
      const S = rect.top;                 // distance from top of viewport

      // Wave crest bottom is clamped so it never goes above the viewport top.
      const anchorY = Math.max(S, 0);

      // Fill covers from viewport-top DOWN to the section's top edge.
      // +SEAM_OVERLAP extends it 2px past section.top to prevent the
      // 1px sub-pixel gap that appears between the fill and section during motion.
      const fillHeight = anchorY + SEAM_OVERLAP;

      // Opacity fades in as the section approaches the navbar.
      const fadeRange = FADE_START - FADE_END;
      const opacity = Math.max(
        0,
        Math.min(1, (FADE_START - Math.max(S, FADE_END)) / fadeRange)
      );

      // Navbar background alpha: goes from 1 (full sand) to 0 (transparent)
      // as section.top descends from FADE_END to 0. This drives the navbar
      // bg directly from scroll position so it appears the wave is washing
      // over it, rather than a timed class-flip.
      const navBgAlpha = Math.max(0, Math.min(1, S / FADE_END));

      // Push values to CSS custom properties on :root, where the
      // overlay reads them. This avoids re-rendering on every scroll frame.
      const root = document.documentElement;
      root.style.setProperty("--lume-wave-anchor", `${anchorY}px`);
      root.style.setProperty("--lume-wave-fill-h", `${fillHeight}px`);
      root.style.setProperty("--lume-wave-opacity", String(opacity));
      root.style.setProperty("--lume-nav-bg-alpha", String(navBgAlpha));

      const isSubmerged = S <= SUBMERGE_AT;
      if (isSubmerged !== lastSubmerged) {
        lastSubmerged = isSubmerged;
        setSubmerged(isSubmerged);
      }
      // Body class drives CSS pause of the drift animation.
      document.body.classList.toggle("lume-wave-frozen", isSubmerged);
    };

    const onScroll = () => {
      if (rafId === null) rafId = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", update);

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", update);
      const root = document.documentElement;
      root.style.removeProperty("--lume-wave-anchor");
      root.style.removeProperty("--lume-wave-fill-h");
      root.style.removeProperty("--lume-wave-opacity");
      root.style.removeProperty("--lume-nav-bg-alpha");
      document.body.classList.remove("lume-wave-frozen");
    };
  }, [targetSelector]);

  return (
    <WaveContext.Provider value={{ submerged }}>
      {children}
    </WaveContext.Provider>
  );
};

/**
 * The visual layer: a fixed-position ocean fill + two horizontally
 * drifting wave SVGs. Drop this anywhere inside <WaveProvider>.
 *
 * z-index = 30, which is ABOVE page content but BELOW the navbar (z-50).
 * The Navbar removes its sand bg while submerged so the wave shows through.
 */
export const WaveOverlay = () => {
  return (
    <>
      {/* Ocean fill — covers from viewport-top DOWN to the section's top edge.
           No transform: it always anchors to top:0 so it never overlaps the
           section's own content (form, address, etc.). */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-0"
        style={{
          height: "var(--lume-wave-fill-h, 0px)",
          opacity: "var(--lume-wave-opacity, 0)",
          background: OCEAN_COLOR,
          zIndex: 30,
          willChange: "height, opacity",
        }}
      />

      {/* Wave crests — sit just above the fill, with continuous horizontal drift */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-0"
        style={{
          height: `${WAVE_HEIGHT}px`,
          transform: `translate3d(0, calc(var(--lume-wave-anchor, 0px) - ${WAVE_HEIGHT - SEAM_OVERLAP}px), 0)`,
          opacity: "var(--lume-wave-opacity, 0)",
          zIndex: 31,
          willChange: "transform, opacity",
        }}
      >
        {/* Back layer — slower, slightly transparent for depth */}
        <div className="absolute inset-0 overflow-hidden">
          <div
            className="lume-wave-back absolute top-0 h-full"
            style={{ left: "-50%", width: "200%", opacity: 0.55 }}
          >
            <svg
              viewBox="0 0 2880 60"
              preserveAspectRatio="none"
              style={{ display: "block", width: "100%", height: "100%" }}
            >
              <path
                d="M0,36 C240,6 480,60 720,36 C960,6 1200,60 1440,36 C1680,6 1920,60 2160,36 C2400,6 2640,60 2880,36 L2880,60 L0,60 Z"
                fill={OCEAN_COLOR}
              />
            </svg>
          </div>
        </div>

        {/* Front layer — faster, opposite direction */}
        <div className="absolute inset-0 overflow-hidden" style={{ top: 6 }}>
          <div
            className="lume-wave-front absolute top-0 h-full"
            style={{ left: "-50%", width: "200%" }}
          >
            <svg
              viewBox="0 0 2880 54"
              preserveAspectRatio="none"
              style={{ display: "block", width: "100%", height: "100%" }}
            >
              <path
                d="M0,28 C180,2 420,52 720,28 C1020,6 1140,54 1440,28 C1740,2 1980,52 2160,28 C2340,6 2580,54 2880,28 L2880,54 L0,54 Z"
                fill={OCEAN_COLOR}
              />
            </svg>
          </div>
        </div>
      </div>
    </>
  );
};
