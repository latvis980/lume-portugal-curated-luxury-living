// frontend/src/components/WaveTransition.tsx
//
// "Ocean wave covers the navbar" effect for the LUME homepage.
//
// As the PrivateAccessSection (id="private-access") rises toward the
// fixed navbar, an ocean-blue wave visibly climbs OVER the navbar.
//
// Architecture (mirrors wave_demo_2's stacking):
//   <WaveProvider>          ← owns state, listens to scroll
//     <Navbar />            ← z-50, fades to transparent when submerged
//     ...page content...
//     <PrivateAccessSection /> ← z-32, owns its own teal bg
//     <WaveOverlay />       ← z-30, teal fill anchored at section top
//     <WaveCrest />         ← z-60, ABOVE the navbar so it visibly draws over it
//   </WaveProvider>
//
// Critically: WaveCrest renders at z-60 (above the z-50 navbar), so as the
// wave climbs into the navbar zone the wavy crest is drawn on top of the
// navbar — not hidden behind it. This is wave_demo_2's approach. (Our prior
// wave_demo_1 mirror placed the crest below the navbar, which is why the
// wave appeared to "slip under the bar" in practice.)
//
// The fill (WaveOverlay) is anchored at viewport y = anchorY (section top)
// with height = viewportHeight - anchorY. It does NOT extend above anchorY,
// so the area above the wave line stays transparent and the wavy edge
// reads as a real water surface.

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { SunWaveLayers, SUN_WAVE_BASE } from "@/components/SunWave";

// ─── Tunable constants ─────────────────────────────────────────────────────
// "OCEAN_COLOR" name kept for continuity, but the wave-takeover now reuses the
// hero's layered sunlit wave (SunWaveLayers), so the solid body below the
// crest is the hero wave's base gold (SUN_WAVE_BASE) — that's the colour the
// hero wave settles into at its waterline, and it must match the top of the
// contact section's warm gradient so the seam is invisible.
export const OCEAN_COLOR  = SUN_WAVE_BASE;  // exported — must match PrivateAccessSection top edge
export const WAVE_HEIGHT  = 86;         // px — height of the wavy crest strip (matches the hero's .sun-wave height)
export const SEAM_OVERLAP = 2;          // px — crest extends this far into the section
const FADE_START   = 600;              // px — section.top above this: wave invisible
const FADE_END     = 80;               // px — section.top below this: wave fully opaque
// Submerge trigger: when the wave's crest line is within ~30px of the viewport
// top, flip the navbar to its submerged state (transparent bg, white text).
// Matches wave_demo_2's `waveCrestY < 30` heuristic: once the section's top
// reaches the navbar zone, flip the navbar to its submerged state.
const SUBMERGE_AT  = 90;
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

      const rect = target.getBoundingClientRect();
      const S = rect.top;
      const B = rect.bottom;
      const anchorY = Math.max(S, 0);
      const ch = window.innerHeight;

      // Fill anchored at the section's top, extending down to whichever comes
      // first: the section's own bottom edge, or the viewport bottom. Clamping
      // to the section bottom is what keeps the overlay from covering the
      // footer (and anything else) once the contact section has scrolled past.
      const fillY      = anchorY;
      const fillBottom = Math.min(ch, B);
      const fillHeight = Math.max(0, fillBottom - anchorY);

      // Crest's TOP edge in the viewport = section top minus the wave height.
      // SEAM_OVERLAP nudges the crest down a hair so its solid teal bottom
      // overlaps the section, hiding any sub-pixel seam.
      const crestY = anchorY - WAVE_HEIGHT + SEAM_OVERLAP;

      // Wave opacity: fades in as section approaches from below, fades out as
      // the section's bottom scrolls above the viewport.
      const fadeRange = FADE_START - FADE_END;
      const fadeIn = Math.max(
        0,
        Math.min(1, (FADE_START - Math.max(S, FADE_END)) / fadeRange)
      );
      const FADE_OUT_RANGE = 80; // px — how quickly to fade once bottom exits
      const fadeOut = Math.max(0, Math.min(1, B / FADE_OUT_RANGE));
      const opacity = Math.min(fadeIn, fadeOut);

      const root = document.documentElement;
      root.style.setProperty("--lume-wave-fill-y",  `${fillY}px`);
      root.style.setProperty("--lume-wave-fill-h",  `${fillHeight}px`);
      root.style.setProperty("--lume-wave-crest-y", `${crestY}px`);
      root.style.setProperty("--lume-wave-opacity",  String(opacity));

      // Submerged only while the contact section is actually overlapping the
      // navbar zone. Once the section's bottom passes above the navbar (i.e.
      // we've scrolled into the footer), drop submerged so the navbar
      // returns to its normal cream-tinted state over the footer.
      const isSubmerged = S <= SUBMERGE_AT && B > 0;
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
      root.style.removeProperty("--lume-wave-fill-y");
      root.style.removeProperty("--lume-wave-fill-h");
      root.style.removeProperty("--lume-wave-crest-y");
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
 * Fixed, root-level wave crest. Renders at z-60 — ABOVE the navbar (z-50) —
 * so as the wave climbs into the navbar zone the wavy edge visibly draws
 * on top of the navbar, exactly like wave_demo_2.
 *
 * The crest reuses the hero's layered sunlit wave (SunWaveLayers), so the
 * takeover wave is visually identical to the one at the bottom of the hero:
 * three stacked gradient strips drifting horizontally, fading from a
 * transparent crest down to the gold waterline (SUN_WAVE_BASE). It carries
 * the `sun-wave` class so it inherits the hero's layer animations, blur and
 * reduced-motion handling; `.lume-wave-crest` only re-anchors it to a fixed,
 * scroll-driven strip.
 *
 * Position is driven by --lume-wave-crest-y (set by WaveProvider): the top
 * edge of the crest sits at viewport y = anchorY - WAVE_HEIGHT + SEAM_OVERLAP,
 * so the crest's solid gold bottom edge meets (and slightly overlaps) the
 * section's top edge. Any rAF lag is harmless: the section's own warm bg
 * (z-32) fills any gap below the lagging crest.
 *
 * Drop anywhere inside <WaveProvider>.
 */
export const WaveCrest = () => (
  <div
    aria-hidden
    className="sun-wave lume-wave-crest pointer-events-none"
    style={{
      // Positioning is set inline so it always wins over the shared
      // `.sun-wave` rule (which is `position: absolute; bottom: -2px`),
      // regardless of stylesheet source order.
      position: "fixed",
      left: 0,
      right: 0,
      top: 0,
      bottom: "auto",
      height: `${WAVE_HEIGHT}px`,
      transform: "translate3d(0, var(--lume-wave-crest-y, -100px), 0)",
      opacity: "var(--lume-wave-opacity, 0)",
      zIndex: 60,
      willChange: "transform, opacity",
    }}
  >
    <div className="sun-wave-glow" />
    <SunWaveLayers idPrefix="lume-wave-crest" />
  </div>
);

/**
 * Fixed teal fill anchored at the section's top edge (translated to anchorY)
 * and extending down to the viewport bottom. Mirrors wave_demo_1's fill model:
 * the fill never extends above the wave line, so the crest is visible passing
 * through the (transparent) navbar.
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
      transform: "translate3d(0, var(--lume-wave-fill-y, 0px), 0)",
      opacity: "var(--lume-wave-opacity, 0)",
      background: OCEAN_COLOR,
      zIndex: 30,
      willChange: "transform, height, opacity",
    }}
  />
);
