// frontend/src/components/WaveTransition.tsx
//
// "Ocean wave covers the navbar" effect for the LUME homepage.
//
// As the PrivateAccessSection (id="private-access") rises toward the
// fixed navbar, an ocean-blue wave climbs up and submerges it.
//
// Architecture:
//   <WaveProvider>          ← owns state, listens to scroll
//     <Navbar />            ← reads useWave() to flip its colors
//     ...page content...
//     <PrivateAccessSection /> ← must contain <WaveCrest /> at its top
//     <WaveOverlay />       ← fixed fill only (no crests)
//   </WaveProvider>
//
// The wave CREST SVGs live inside PrivateAccessSection (via <WaveCrest />)
// so they scroll on the compositor thread alongside the section —
// eliminating the rAF lag that caused the black gap during fast scrolling.
//
// The fill (WaveOverlay) is a fixed element that covers from viewport-top
// down to the section's top. It uses a large buffer (+160px) so that even
// when the main thread lags behind the compositor by a frame or two, the
// fill still reaches the section.  The section's z-[32] stacking context
// ensures any overshoot is hidden behind its own background.

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

// ─── Tunable constants ─────────────────────────────────────────────────────
export const OCEAN_COLOR  = "#4e8ba1";  // exported — must match PrivateAccessSection bg
export const WAVE_HEIGHT  = 60;         // px — height of the wavy crest strip
export const SEAM_OVERLAP = 2;          // px — crest extends this far into the section
const FILL_BUFFER  = WAVE_HEIGHT + 100; // px — fill overshoots by this much to bridge lag
const FADE_START   = 600;              // px — section.top above this: wave invisible
const FADE_END     = 80;               // px — section.top below this: wave fully opaque
                                        //      also where navbar bg begins to fade
const SUBMERGE_AT  = 30;               // px — section.top ≤ this: navbar submerges (matches wave_demo_1)
// ───────────────────────────────────────────────────────────────────────────

interface WaveCtx {
  submerged: boolean;
}

const WaveContext = createContext<WaveCtx>({ submerged: false });

export const useWave = () => useContext(WaveContext);

interface ProviderProps {
  children: ReactNode;
  targetSelector?: string;
}

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
        if (lastSubmerged) { lastSubmerged = false; setSubmerged(false); }
        return;
      }

      const S = target.getBoundingClientRect().top;
      const anchorY = Math.max(S, 0);

      // Fill height: covers viewport-top down to section-top, plus a generous
      // buffer so compositor-thread lag never leaves an uncovered gap.
      // The section's z-[32] stacking context hides any overshoot seamlessly.
      const fillHeight = anchorY + FILL_BUFFER;

      // Wave opacity: fades in as section approaches, fully opaque near navbar.
      const fadeRange = FADE_START - FADE_END;
      const opacity = Math.max(
        0,
        Math.min(1, (FADE_START - Math.max(S, FADE_END)) / fadeRange)
      );

      const root = document.documentElement;
      root.style.setProperty("--lume-wave-fill-h",  `${fillHeight}px`);
      root.style.setProperty("--lume-wave-opacity",  String(opacity));

      const isSubmerged = S <= SUBMERGE_AT;
      if (isSubmerged !== lastSubmerged) {
        lastSubmerged = isSubmerged;
        setSubmerged(isSubmerged);
      }
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
      root.style.removeProperty("--lume-wave-fill-h");
      root.style.removeProperty("--lume-wave-opacity");
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
 * Drop this at the very top of PrivateAccessSection (inside the <section>).
 * Being part of the section means it scrolls on the compositor thread —
 * no rAF lag, no black gap during fast scrolling.
 */
export const WaveCrest = () => (
  <div
    aria-hidden
    className="pointer-events-none absolute inset-x-0 overflow-hidden"
    style={{
      // Shift up so the crest sits above the section top.
      // SEAM_OVERLAP lets the teal fill at the SVG bottom overlap the
      // section by a couple pixels, hiding any sub-pixel seam.
      top: `${-(WAVE_HEIGHT - SEAM_OVERLAP)}px`,
      height: `${WAVE_HEIGHT}px`,
      opacity: "var(--lume-wave-opacity, 0)",
      // z-1 keeps it inside the section's stacking context (z-[32]),
      // which already places it above the fill (z-30) in the root context.
      zIndex: 1,
    }}
  >
    {/* Back layer — slower drift, slightly transparent for depth */}
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

    {/* Front layer — faster drift, opposite direction */}
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
);

/**
 * Fixed teal fill only — no crests (those live in <WaveCrest /> inside the
 * section). Drop anywhere inside <WaveProvider>.
 *
 * z-index 30: above page content, below the navbar (z-50) and the
 * section's own stacking context (z-[32]).
 */
export const WaveOverlay = () => (
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
);
