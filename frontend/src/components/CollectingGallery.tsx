// frontend/src/components/CollectingGallery.tsx
//
// The Collecting block's media gallery — a "peek" carousel where the edge of
// the next slide stays visible, with a click-to-expand lightbox. Mixes photos
// (slow Ken Burns drift) and short muted looped video clips. Items are managed
// in the CMS (Admin → Collecting) and arrive locale-merged from the backend.

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import useEmblaCarousel from "embla-carousel-react";
import { useT } from "@/lib/i18n";
import type { CollectingMediaItem } from "@/lib/public-api";

const HONEY = "#e9a92e";
const TERRACOTTA = "#b04e1a";
const CREAM = "#fbf4e6";
const EASE_EDITORIAL = "cubic-bezier(0.22, 1, 0.36, 1)";

const pad = (n: number) => String(n + 1).padStart(2, "0");

/* ── Warm brand wash laid over active media ────────────────────────────── */
function WarmWash() {
  return (
    <div
      aria-hidden
      className="absolute inset-0 pointer-events-none"
      style={{
        background:
          "linear-gradient(140deg, rgba(241,196,84,0) 40%, rgba(231,148,70,0.18) 100%)",
        mixBlendMode: "multiply",
      }}
    />
  );
}

/* ── Small uppercase chip that sits on media (e.g. GLASSWARE) ──────────── */
function MediaTag({ children, video }: { children: React.ReactNode; video?: boolean }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 uppercase font-body font-semibold"
      style={{
        fontSize: "9.5px",
        letterSpacing: "0.24em",
        color: CREAM,
        background: "rgba(26,17,8,0.42)",
        backdropFilter: "blur(3px)",
        padding: "6px 11px",
        border: "1px solid rgba(237,226,200,0.22)",
      }}
    >
      {video && (
        <span
          aria-hidden
          style={{
            width: 0,
            height: 0,
            borderTop: "4px solid transparent",
            borderBottom: "4px solid transparent",
            borderLeft: `6px solid ${HONEY}`,
          }}
        />
      )}
      {children}
    </span>
  );
}

/* ── Rect outlined arrow button (the gallery's chosen control style) ───── */
function ArrowBtn({
  dir,
  label,
  onClick,
}: {
  dir: "prev" | "next";
  label: string;
  onClick: () => void;
}) {
  const d = dir === "next" ? "M14 9l5 5-5 5" : "M19 9l-5 5 5 5";
  return (
    <button
      aria-label={label}
      onClick={onClick}
      className="group flex items-center justify-center cursor-pointer transition-colors duration-300"
      style={{
        width: "38px",
        height: "34px",
        border: `1px solid ${HONEY}`,
        background: "rgba(251,244,230,0.82)",
        backdropFilter: "blur(2px)",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = TERRACOTTA)}
      onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(251,244,230,0.82)")}
    >
      <svg width="22" height="28" viewBox="0 0 28 28" fill="none">
        <path
          d={d}
          className="transition-colors duration-300 stroke-[#b04e1a] group-hover:stroke-[#fbf4e6]"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

/* ── Thin progress line under the carousel ─────────────────────────────── */
function ProgressLine({ i, n }: { i: number; n: number }) {
  return (
    <div
      className="relative flex-1 overflow-hidden"
      style={{ height: "2px", background: "#dccfb4" }}
    >
      <div
        className="absolute left-0 top-0 bottom-0"
        style={{
          width: `${((i + 1) / n) * 100}%`,
          background: TERRACOTTA,
          transition: `width 0.65s ${EASE_EDITORIAL}`,
        }}
      />
    </div>
  );
}

/* ── Media fill: photo (Ken Burns when active) or muted looped video ───── */
function MediaFill({
  item,
  active,
  videoRef,
}: {
  item: CollectingMediaItem;
  active: boolean;
  videoRef?: (el: HTMLVideoElement | null) => void;
}) {
  if (item.media_type === "video") {
    return (
      <>
        <video
          ref={videoRef}
          src={item.src}
          poster={item.poster || undefined}
          muted
          loop
          playsInline
          preload="metadata"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <WarmWash />
      </>
    );
  }
  return (
    <>
      <div
        className={`absolute inset-0 bg-cover bg-center will-change-transform ${
          active ? "lume-kenburns" : ""
        }`}
        style={{ backgroundImage: `url(${item.src})`, transform: "scale(1.05)" }}
      />
      <WarmWash />
    </>
  );
}

/* ── Lightbox overlay (portal) ─────────────────────────────────────────── */
function Lightbox({
  items,
  index,
  onClose,
  onPrev,
  onNext,
}: {
  items: CollectingMediaItem[];
  index: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const t = useT();
  const cur = items[index];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") onNext();
      if (e.key === "ArrowLeft") onPrev();
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose, onNext, onPrev]);

  const edgeBtn =
    "absolute flex items-center justify-center cursor-pointer bg-transparent transition-colors duration-300 hover:border-[#f1c454]";
  const edgeStyle: React.CSSProperties = {
    border: "1px solid rgba(237,226,200,0.4)",
    color: "#ede2c8",
  };

  return createPortal(
    <div
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{
        background: "rgba(22,13,5,0.93)",
        backdropFilter: "blur(6px)",
        animation: "lume-fadein 0.3s ease both",
      }}
    >
      <button
        aria-label={t("collecting", "lightbox_close", "Close")}
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className={edgeBtn}
        style={{ ...edgeStyle, top: "22px", right: "26px", width: "40px", height: "40px", fontSize: "18px" }}
      >
        ×
      </button>
      <button
        aria-label={t("collecting", "lightbox_prev", "Previous")}
        onClick={(e) => {
          e.stopPropagation();
          onPrev();
        }}
        className={edgeBtn}
        style={{ ...edgeStyle, left: "26px", top: "50%", transform: "translateY(-50%)", width: "46px", height: "42px", fontSize: "20px" }}
      >
        ‹
      </button>
      <button
        aria-label={t("collecting", "lightbox_next", "Next")}
        onClick={(e) => {
          e.stopPropagation();
          onNext();
        }}
        className={edgeBtn}
        style={{ ...edgeStyle, right: "26px", top: "50%", transform: "translateY(-50%)", width: "46px", height: "42px", fontSize: "20px" }}
      >
        ›
      </button>

      <div onClick={(e) => e.stopPropagation()} className="text-center px-16">
        <div
          className="relative overflow-hidden mx-auto aspect-[4/5]"
          style={{
            width: "min(72vw, 58vh)",
            boxShadow: "0 30px 80px -30px rgba(0,0,0,0.7)",
          }}
        >
          {cur.media_type === "video" ? (
            <video
              key={cur.id}
              src={cur.src}
              poster={cur.poster || undefined}
              muted
              loop
              playsInline
              autoPlay
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div
              key={cur.id}
              className="absolute inset-0 bg-cover bg-center lume-kenburns"
              style={{ backgroundImage: `url(${cur.src})`, transform: "scale(1.05)" }}
            />
          )}
          <WarmWash />
          {cur.tag && (
            <div className="absolute top-3.5 left-3.5 z-[4]">
              <MediaTag video={cur.media_type === "video"}>{cur.tag}</MediaTag>
            </div>
          )}
        </div>
        {cur.label && (
          <p
            className="font-display italic font-light mt-5 mb-1"
            style={{ fontSize: "19px", color: "#ede2c8" }}
          >
            {cur.label}
          </p>
        )}
        <p
          className="font-mono m-0"
          style={{ fontSize: "11px", letterSpacing: "0.12em", color: "rgba(237,226,200,0.55)" }}
        >
          {pad(index)} / {pad(items.length - 1)}
        </p>
      </div>
    </div>,
    document.body,
  );
}

/* ── The gallery itself ────────────────────────────────────────────────── */
export default function CollectingGallery({ items }: { items: CollectingMediaItem[] }) {
  const t = useT();
  const [emblaRef, embla] = useEmblaCarousel({ loop: items.length > 1, align: "start" });
  const [index, setIndex] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());

  useEffect(() => {
    if (!embla) return;
    const onSelect = () => setIndex(embla.selectedScrollSnap());
    embla.on("select", onSelect);
    onSelect();
    return () => {
      embla.off("select", onSelect);
    };
  }, [embla]);

  // Only the active slide's clip plays; the rest sit on their poster frame.
  useEffect(() => {
    items.forEach((item, i) => {
      const video = videoRefs.current.get(item.id);
      if (!video) return;
      if (i === index && !lightbox) {
        video.play().catch(() => {});
      } else {
        video.pause();
      }
    });
  }, [items, index, lightbox]);

  const scrollPrev = useCallback(() => embla?.scrollPrev(), [embla]);
  const scrollNext = useCallback(() => embla?.scrollNext(), [embla]);
  const lightboxPrev = useCallback(
    () => embla?.scrollTo((embla.selectedScrollSnap() - 1 + items.length) % items.length),
    [embla, items.length],
  );
  const lightboxNext = useCallback(
    () => embla?.scrollTo((embla.selectedScrollSnap() + 1) % items.length),
    [embla, items.length],
  );

  const cur = items[index];
  const single = items.length <= 1;

  return (
    <div>
      <div className="relative overflow-hidden">
        {/* Viewport — next slide's edge peeks out on the right */}
        <div ref={emblaRef} className="overflow-hidden">
          <div className="flex" style={{ gap: "16px" }}>
            {items.map((item, i) => (
              <div
                key={item.id}
                onClick={() => i === index && setLightbox(true)}
                className={`relative min-w-0 overflow-hidden aspect-[4/5] transition-opacity duration-700 ${
                  i === index ? "opacity-100 cursor-zoom-in" : "opacity-40"
                } ${single ? "flex-[0_0_100%]" : "flex-[0_0_calc(100%-48px)] md:flex-[0_0_calc(100%-56px)]"}`}
                style={{ background: "#241608" }}
              >
                <MediaFill
                  item={item}
                  active={i === index && !lightbox}
                  videoRef={
                    item.media_type === "video"
                      ? (el) => {
                          if (el) videoRefs.current.set(item.id, el);
                          else videoRefs.current.delete(item.id);
                        }
                      : undefined
                  }
                />
                {i === index && (
                  <>
                    {item.tag && (
                      <div className="absolute top-4 left-4 z-[4]">
                        <MediaTag video={item.media_type === "video"}>{item.tag}</MediaTag>
                      </div>
                    )}
                    <span
                      aria-hidden
                      className="absolute right-3.5 bottom-3.5 z-[4] flex items-center justify-center"
                      style={{
                        width: "34px",
                        height: "34px",
                        border: "1px solid rgba(237,226,200,0.45)",
                        background: "rgba(26,17,8,0.38)",
                        backdropFilter: "blur(2px)",
                        color: "#ede2c8",
                        fontSize: "15px",
                      }}
                    >
                      ⤢
                    </span>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Honey outline that peeks out the lower-right corner */}
        <div
          aria-hidden
          className="absolute pointer-events-none"
          style={{
            right: "-28px",
            bottom: "-28px",
            width: "180px",
            height: "180px",
            border: `1px solid ${HONEY}`,
            zIndex: 1,
          }}
        />
      </div>

      {!single && (
        <div className="mt-[18px] flex items-center gap-[18px]">
          <ProgressLine i={index} n={items.length} />
          <div className="flex gap-2 flex-shrink-0">
            <ArrowBtn
              dir="prev"
              label={t("collecting", "gallery_prev", "Previous")}
              onClick={scrollPrev}
            />
            <ArrowBtn
              dir="next"
              label={t("collecting", "gallery_next", "Next")}
              onClick={scrollNext}
            />
          </div>
        </div>
      )}

      {cur?.label && (
        <p
          className="mt-3 font-display italic font-light"
          style={{ fontSize: "16px", color: "hsl(var(--muted-foreground))" }}
        >
          {cur.label}{" "}
          <span
            className="font-mono not-italic ml-1.5"
            style={{ fontSize: "10.5px", color: "rgba(90,70,48,0.55)" }}
          >
            — {t("collecting", "expand_hint", "click to expand")}
          </span>
        </p>
      )}

      {lightbox && (
        <Lightbox
          items={items}
          index={index}
          onClose={() => setLightbox(false)}
          onPrev={lightboxPrev}
          onNext={lightboxNext}
        />
      )}
    </div>
  );
}
