// frontend/src/pages/admin/AdminCollecting.tsx
//
// Collecting gallery manager — the photos and short looped clips shown in
// the homepage "Lume Signature Services" block. Photos are converted to
// WebP and videos re-encoded to a small muted MP4 on the server; the
// editor gets warnings here when a clip is long or heavy before uploading.

import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getCollectingMedia,
  createCollectingMedia,
  updateCollectingMedia,
  deleteCollectingMedia,
  reorderCollectingMedia,
  translateCollectingField,
  uploadCollectingImage,
  uploadCollectingVideo,
  type CollectingMediaItem,
  type CollectingTranslatableField,
  type CollectingVideoUploadResult,
} from "@/lib/admin-api";

// ─── Locale config (matches AdminServices) ───────────────────────────────────

type I18nLocale = "en" | "pt_pt" | "ru" | "es";

const LOCALE_TABS: { code: I18nLocale; short: string; name: string }[] = [
  { code: "en",    short: "EN", name: "English" },
  { code: "pt_pt", short: "PT", name: "Portuguese" },
  { code: "ru",    short: "RU", name: "Русский" },
  { code: "es",    short: "ES", name: "Español" },
];

type I18nValues = { pt_pt?: string; ru?: string; es?: string };
const EMPTY_I18N: I18nValues = { pt_pt: "", ru: "", es: "" };

// ─── Video guidance thresholds ───────────────────────────────────────────────
// The gallery autoplays clips in a ~400 px column; short ambient loops work
// best. Long/heavy uploads still go through (the server re-encodes them),
// but the editor is warned first.

const IDEAL_DURATION_S = 20;
const WARN_DURATION_S = 30;
const WARN_SIZE_MB = 100;
const MAX_SIZE_MB = 200; // mirrors the backend's hard limit

const fmtMB = (bytes: number) => `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
const fmtDuration = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = Math.round(s % 60);
  return m > 0 ? `${m}:${String(sec).padStart(2, "0")} min` : `${sec} s`;
};

/** Read duration/dimensions from a video file in the browser (no upload). */
function readVideoMetadata(
  file: File,
): Promise<{ duration: number; width: number; height: number } | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      const meta = {
        duration: video.duration,
        width: video.videoWidth,
        height: video.videoHeight,
      };
      URL.revokeObjectURL(url);
      resolve(Number.isFinite(meta.duration) ? meta : null);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    video.src = url;
  });
}

function videoWarnings(file: File, duration: number | null): string[] {
  const warnings: string[] = [];
  if (duration != null && duration > WARN_DURATION_S) {
    warnings.push(
      `This clip is ${fmtDuration(duration)} long. The gallery loops short ambient clips — ` +
        `under ${IDEAL_DURATION_S} s works best. Long clips make the homepage heavier and ` +
        `visitors rarely watch past the first seconds. Consider trimming it.`,
    );
  }
  if (file.size > WARN_SIZE_MB * 1024 * 1024) {
    warnings.push(
      `The file is ${fmtMB(file.size)}. It will be compressed after upload, but uploading ` +
        `this much data can be slow. If possible, export a smaller file before uploading.`,
    );
  }
  return warnings;
}

// ─── Pending-upload state (video confirm + progress) ────────────────────────

type PendingVideo = {
  file: File;
  duration: number | null;
  warnings: string[];
};

type UploadPhase =
  | { kind: "idle" }
  | { kind: "uploading"; mediaType: "image" | "video"; percent: number }
  | { kind: "processing"; mediaType: "image" | "video" };

// ─── Component ───────────────────────────────────────────────────────────────

export default function AdminCollecting() {
  const queryClient = useQueryClient();

  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);

  const [editing, setEditing] = useState<CollectingMediaItem | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [pendingVideo, setPendingVideo] = useState<PendingVideo | null>(null);
  const [upload, setUpload] = useState<UploadPhase>({ kind: "idle" });
  const [uploadSummary, setUploadSummary] = useState("");
  const [error, setError] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-collecting"],
    queryFn: getCollectingMedia,
  });
  const items = data?.items || [];

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["admin-collecting"] });

  const deleteM = useMutation({
    mutationFn: deleteCollectingMedia,
    onSuccess: () => {
      invalidate();
      setDeleteId(null);
    },
    onError: (e: Error) => setError(e.message),
  });

  const reorderM = useMutation({
    mutationFn: reorderCollectingMedia,
    onSuccess: (res) =>
      queryClient.setQueryData(["admin-collecting"], res),
    onError: (e: Error) => {
      setError(e.message);
      invalidate();
    },
  });

  const toggleActive = (item: CollectingMediaItem) =>
    updateCollectingMedia(item.id, { is_active: !item.is_active })
      .then(invalidate)
      .catch((e: Error) => setError(e.message));

  const move = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= items.length) return;
    const ids = items.map((i) => i.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    // Optimistic: swap locally so the row moves immediately
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    queryClient.setQueryData(["admin-collecting"], { items: next });
    reorderM.mutate(ids);
  };

  // ── Photo upload: optimise server-side, then open the details modal ──────
  const handlePhotoFile = async (file: File) => {
    setError("");
    setUploadSummary("");
    try {
      setUpload({ kind: "uploading", mediaType: "image", percent: 0 });
      const result = await uploadCollectingImage(file, (percent) => {
        setUpload(
          percent >= 100
            ? { kind: "processing", mediaType: "image" }
            : { kind: "uploading", mediaType: "image", percent },
        );
      });
      const created = await createCollectingMedia({
        media_type: "image",
        src: result.url,
        file_size_bytes: result.file_size_bytes,
        sort_order: items.length,
      });
      setUploadSummary(
        `Photo stored as WebP (${fmtMB(result.file_size_bytes)}). Add a tag and caption below.`,
      );
      invalidate();
      setEditing(created);
    } catch (e: any) {
      setError(e?.message || "Upload failed");
    } finally {
      setUpload({ kind: "idle" });
    }
  };

  // ── Video upload: check metadata first, warn, then upload + optimise ─────
  const handleVideoFile = async (file: File) => {
    setError("");
    setUploadSummary("");
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(
        `This video is ${fmtMB(file.size)} — the limit is ${MAX_SIZE_MB} MB. ` +
          "Trim or compress the clip and try again.",
      );
      return;
    }
    const meta = await readVideoMetadata(file);
    const warnings = videoWarnings(file, meta?.duration ?? null);
    if (warnings.length > 0) {
      setPendingVideo({ file, duration: meta?.duration ?? null, warnings });
      return;
    }
    await doVideoUpload(file);
  };

  const doVideoUpload = async (file: File) => {
    setPendingVideo(null);
    try {
      setUpload({ kind: "uploading", mediaType: "video", percent: 0 });
      const result: CollectingVideoUploadResult = await uploadCollectingVideo(
        file,
        (percent) => {
          setUpload(
            percent >= 100
              ? { kind: "processing", mediaType: "video" }
              : { kind: "uploading", mediaType: "video", percent },
          );
        },
      );
      const created = await createCollectingMedia({
        media_type: "video",
        src: result.url,
        poster: result.poster_url ?? null,
        duration_seconds: result.duration_seconds,
        file_size_bytes: result.file_size_bytes,
        sort_order: items.length,
      });
      setUploadSummary(
        `Video optimized: ${fmtMB(result.original_size_bytes)} → ${fmtMB(result.file_size_bytes)}` +
          (result.duration_seconds ? ` · ${fmtDuration(result.duration_seconds)}` : "") +
          ". Add a tag and caption below.",
      );
      invalidate();
      setEditing(created);
    } catch (e: any) {
      setError(e?.message || "Upload failed");
    } finally {
      setUpload({ kind: "idle" });
    }
  };

  const busy = upload.kind !== "idle";

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-light text-admin-text">Collecting gallery</h1>
          <p className="text-sm text-admin-text-muted mt-1">
            Photos and short looped clips for the “Lume Signature Services” gallery on
            the homepage. Items appear in the order below.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => photoInputRef.current?.click()}
            disabled={busy}
            className="rounded-md bg-admin-btn px-4 py-2 text-sm font-medium text-white transition hover:bg-admin-btn-hover disabled:opacity-50"
          >
            + Add photo
          </button>
          <button
            onClick={() => videoInputRef.current?.click()}
            disabled={busy}
            className="rounded-md border border-admin-border px-4 py-2 text-sm font-medium text-admin-text-secondary transition hover:bg-admin-surface-hover hover:text-admin-text disabled:opacity-50"
          >
            + Add video
          </button>
        </div>
      </div>

      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void handlePhotoFile(file);
        }}
      />
      <input
        ref={videoInputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void handleVideoFile(file);
        }}
      />

      <p className="mb-5 text-xs text-admin-text-muted">
        Photos are converted to WebP automatically. Videos are compressed for fast
        loading (muted, max {WARN_DURATION_S} s recommended — short ambient loops of
        10–{IDEAL_DURATION_S} s look best).
      </p>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </div>
      )}

      {busy && (
        <div className="mb-4 rounded-md border border-admin-border bg-admin-surface px-4 py-3">
          {upload.kind === "uploading" ? (
            <>
              <p className="text-sm text-admin-text-secondary mb-2">
                Uploading {upload.mediaType === "video" ? "video" : "photo"}… {upload.percent}%
              </p>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-admin-bg">
                <div
                  className="h-full rounded-full bg-admin-accent transition-all"
                  style={{ width: `${upload.percent}%` }}
                />
              </div>
            </>
          ) : (
            <p className="text-sm text-admin-text-secondary">
              {upload.mediaType === "video"
                ? "Optimizing video for the web — this can take a minute for longer clips…"
                : "Optimizing photo…"}
            </p>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="py-20 text-center text-sm text-admin-text-muted">Loading…</div>
      ) : items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-admin-border bg-admin-surface px-6 py-14 text-center">
          <p className="text-sm text-admin-text-secondary">No gallery items yet.</p>
          <p className="mt-1 text-xs text-admin-text-muted">
            Add a photo or a short clip above — until then the homepage shows its
            original single photo.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-admin-border bg-admin-surface overflow-hidden">
          {items.map((item, i) => (
            <div
              key={item.id}
              className={`flex items-center gap-4 px-5 py-3 ${
                i !== items.length - 1 ? "border-b border-admin-border-light" : ""
              }`}
            >
              {/* Reorder */}
              <div className="flex flex-col">
                <button
                  onClick={() => move(i, -1)}
                  disabled={i === 0 || reorderM.isPending}
                  aria-label="Move up"
                  className="px-1 text-xs text-admin-text-muted hover:text-admin-text disabled:opacity-30"
                >
                  ▲
                </button>
                <button
                  onClick={() => move(i, 1)}
                  disabled={i === items.length - 1 || reorderM.isPending}
                  aria-label="Move down"
                  className="px-1 text-xs text-admin-text-muted hover:text-admin-text disabled:opacity-30"
                >
                  ▼
                </button>
              </div>

              {/* Preview */}
              <div className="relative h-20 w-16 flex-shrink-0 overflow-hidden rounded border border-admin-border bg-admin-bg">
                {item.media_type === "video" ? (
                  item.poster ? (
                    <img src={item.poster} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <video src={item.src} muted preload="metadata" className="h-full w-full object-cover" />
                  )
                ) : (
                  <img src={item.src} alt="" className="h-full w-full object-cover" />
                )}
                {item.media_type === "video" && (
                  <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1 text-[9px] font-medium uppercase tracking-wider text-white">
                    ▶ video
                  </span>
                )}
              </div>

              {/* Text */}
              <div className="min-w-0 flex-1">
                <p className={`truncate text-sm ${item.is_active ? "text-admin-text" : "text-admin-text-muted line-through"}`}>
                  {item.label || <span className="italic text-admin-text-muted">No caption yet</span>}
                </p>
                <p className="mt-0.5 text-xs text-admin-text-muted">
                  {item.tag ? `${item.tag} · ` : ""}
                  {item.media_type === "video" ? "Video" : "Photo"}
                  {item.duration_seconds ? ` · ${fmtDuration(Number(item.duration_seconds))}` : ""}
                  {item.file_size_bytes ? ` · ${fmtMB(Number(item.file_size_bytes))}` : ""}
                </p>
                {item.media_type === "video" &&
                  item.duration_seconds != null &&
                  Number(item.duration_seconds) > WARN_DURATION_S && (
                    <p className="mt-0.5 text-xs text-amber-600">
                      ⚠ Long clip ({fmtDuration(Number(item.duration_seconds))}) — consider a
                      shorter loop for faster loading.
                    </p>
                  )}
              </div>

              {/* Translation coverage */}
              <span className="flex gap-0.5" title="Translation coverage (tag)">
                {(["pt_pt", "ru", "es"] as const).map((loc) => (
                  <span
                    key={loc}
                    className={`inline-block h-1.5 w-1.5 rounded-full ${
                      (item.tag_i18n as any)?.[loc] || (item.label_i18n as any)?.[loc]
                        ? "bg-green-400"
                        : "bg-admin-border"
                    }`}
                    title={loc}
                  />
                ))}
              </span>

              <button
                onClick={() => toggleActive(item)}
                title={item.is_active ? "Visible — click to hide" : "Hidden — click to show"}
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition ${
                  item.is_active
                    ? "bg-admin-accent-soft text-admin-accent"
                    : "bg-admin-bg text-admin-text-muted border border-admin-border"
                }`}
              >
                {item.is_active ? "Visible" : "Hidden"}
              </button>
              <button
                onClick={() => {
                  setUploadSummary("");
                  setEditing(item);
                }}
                className="text-xs text-admin-text-muted hover:text-admin-text-secondary transition px-2 py-1 rounded hover:bg-admin-bg"
              >
                Edit
              </button>
              <button
                onClick={() => setDeleteId(item.id)}
                className="text-xs text-red-400 hover:text-red-600 transition px-2 py-1 rounded hover:bg-red-50"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── Video warnings confirm ─────────────────────────────────────────── */}
      {pendingVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl border border-admin-border bg-admin-surface shadow-2xl p-6">
            <div className="mb-4 flex items-start gap-3">
              <span className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600 text-base">
                ⚠
              </span>
              <div>
                <h3 className="text-base font-medium text-admin-text">
                  Check this video before uploading
                </h3>
                <p className="mt-1 text-xs text-admin-text-muted">
                  {pendingVideo.file.name} · {fmtMB(pendingVideo.file.size)}
                  {pendingVideo.duration ? ` · ${fmtDuration(pendingVideo.duration)}` : ""}
                </p>
              </div>
            </div>

            <ul className="mb-5 space-y-2">
              {pendingVideo.warnings.map((w) => (
                <li
                  key={w}
                  className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700"
                >
                  {w}
                </li>
              ))}
            </ul>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setPendingVideo(null)}
                className="rounded-md px-4 py-2 text-sm text-admin-text-muted hover:text-admin-text transition"
              >
                Cancel
              </button>
              <button
                onClick={() => void doVideoUpload(pendingVideo.file)}
                className="rounded-md bg-admin-btn px-5 py-2 text-sm font-medium text-white transition hover:bg-admin-btn-hover"
              >
                Upload anyway
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit details modal ─────────────────────────────────────────────── */}
      {editing && (
        <EditItemModal
          item={editing}
          summary={uploadSummary}
          onClose={() => {
            // A ↺ Translate call persists to the DB even without "Save",
            // so refresh the list when the modal closes either way.
            invalidate();
            setEditing(null);
            setUploadSummary("");
          }}
          onSaved={() => {
            invalidate();
            setEditing(null);
            setUploadSummary("");
          }}
        />
      )}

      {/* ── Delete confirm ─────────────────────────────────────────────────── */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border border-admin-border bg-admin-surface shadow-2xl p-6">
            <h3 className="text-base font-medium text-admin-text mb-2">Delete gallery item?</h3>
            <p className="text-sm text-admin-text-muted mb-6">
              This removes it from the homepage immediately and deletes the stored
              media file. This cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="rounded-md px-4 py-2 text-sm text-admin-text-muted hover:text-admin-text transition"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteM.mutate(deleteId)}
                disabled={deleteM.isPending}
                className="rounded-md bg-red-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-600 disabled:opacity-50"
              >
                {deleteM.isPending ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   EditItemModal — tag + caption with language tabs and DeepL translate
───────────────────────────────────────────────────────────────────────── */

type ItemForm = {
  tag: string;
  tag_i18n: I18nValues;
  label: string;
  label_i18n: I18nValues;
};

function EditItemModal({
  item,
  summary,
  onClose,
  onSaved,
}: {
  item: CollectingMediaItem;
  summary?: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<ItemForm>({
    tag: item.tag ?? "",
    tag_i18n: (item.tag_i18n as I18nValues) ?? { ...EMPTY_I18N },
    label: item.label ?? "",
    label_i18n: (item.label_i18n as I18nValues) ?? { ...EMPTY_I18N },
  });
  const [error, setError] = useState("");

  const formPayload = () => ({
    tag: form.tag || null,
    tag_i18n: form.tag_i18n,
    label: form.label || null,
    label_i18n: form.label_i18n,
  });

  const saveM = useMutation({
    mutationFn: () => updateCollectingMedia(item.id, formPayload()),
    onSuccess: onSaved,
    onError: (e: Error) => setError(e.message),
  });

  const onTranslated = (updated: CollectingMediaItem) => {
    setForm((prev) => ({
      ...prev,
      tag: updated.tag ?? prev.tag,
      tag_i18n: (updated.tag_i18n as I18nValues) ?? prev.tag_i18n,
      label: updated.label ?? prev.label,
      label_i18n: (updated.label_i18n as I18nValues) ?? prev.label_i18n,
    }));
  };

  // DeepL reads from the database, so unsaved edits must be persisted before
  // a translate call (the modal often opens straight after an upload).
  const persistForm = async () => {
    await updateCollectingMedia(item.id, formPayload());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl border border-admin-border bg-admin-surface shadow-2xl p-6">
        <div className="flex items-start gap-4 mb-5">
          <div className="relative h-28 w-[5.6rem] flex-shrink-0 overflow-hidden rounded border border-admin-border bg-admin-bg">
            {item.media_type === "video" ? (
              <video
                src={item.src}
                poster={item.poster || undefined}
                muted
                loop
                playsInline
                autoPlay
                className="h-full w-full object-cover"
              />
            ) : (
              <img src={item.src} alt="" className="h-full w-full object-cover" />
            )}
          </div>
          <div>
            <h2 className="text-lg font-light text-admin-text">
              {item.media_type === "video" ? "Video details" : "Photo details"}
            </h2>
            <p className="mt-1 text-xs text-admin-text-muted">
              The tag is the small chip on the media (e.g. GLASSWARE); the caption
              appears under the gallery. Enter text in any language tab, then click
              ↺ Translate to fill the others via DeepL.
            </p>
            {summary && (
              <p className="mt-2 rounded-md border border-green-200 bg-green-50 px-2.5 py-1.5 text-xs text-green-700">
                {summary}
              </p>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </div>
        )}

        <LocalizedItemField
          label="Tag"
          fieldName="tag"
          form={form}
          setForm={setForm}
          itemId={item.id}
          onTranslated={onTranslated}
          placeholder="e.g. Glassware"
          persistForm={persistForm}
        />
        <LocalizedItemField
          label="Caption"
          fieldName="label"
          form={form}
          setForm={setForm}
          itemId={item.id}
          onTranslated={onTranslated}
          placeholder="e.g. Murano amber carafe"
          persistForm={persistForm}
        />

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-md px-4 py-2 text-sm text-admin-text-muted hover:text-admin-text transition"
          >
            Cancel
          </button>
          <button
            onClick={() => saveM.mutate()}
            disabled={saveM.isPending}
            className="rounded-md bg-admin-btn px-5 py-2 text-sm font-medium text-white transition hover:bg-admin-btn-hover disabled:opacity-50"
          >
            {saveM.isPending ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   LocalizedItemField — language-tab input with DeepL translate button
   (parallel to LocalizedServiceField in AdminServices)
───────────────────────────────────────────────────────────────────────── */

function LocalizedItemField({
  label,
  fieldName,
  form,
  setForm,
  itemId,
  onTranslated,
  placeholder,
  persistForm,
}: {
  label: string;
  fieldName: CollectingTranslatableField;
  form: ItemForm;
  setForm: React.Dispatch<React.SetStateAction<ItemForm>>;
  itemId: string;
  onTranslated: (updated: CollectingMediaItem) => void;
  placeholder?: string;
  persistForm: () => Promise<void>;
}) {
  const [locale, setLocale] = useState<I18nLocale>("en");
  const [translating, setTranslating] = useState(false);
  const [translateError, setTranslateError] = useState("");

  const i18nKey = `${fieldName}_i18n` as const;

  const value =
    locale === "en"
      ? form[fieldName]
      : (form[i18nKey][locale as keyof I18nValues] ?? "");

  const hasContent = (loc: I18nLocale) =>
    loc === "en"
      ? Boolean(form[fieldName].trim())
      : Boolean((form[i18nKey][loc as keyof I18nValues] ?? "").trim());

  const onChange = (v: string) => {
    if (locale === "en") {
      setForm((prev) => ({ ...prev, [fieldName]: v }));
    } else {
      setForm((prev) => ({
        ...prev,
        [i18nKey]: { ...prev[i18nKey], [locale]: v },
      }));
    }
  };

  const handleTranslate = async () => {
    setTranslating(true);
    setTranslateError("");
    try {
      await persistForm();
      const updated = await translateCollectingField(itemId, {
        field: fieldName,
        source_locale: locale,
        overwrite: false,
      });
      onTranslated(updated);
    } catch (e: any) {
      setTranslateError(e.message || "Translation failed");
    } finally {
      setTranslating(false);
    }
  };

  const canTranslate = value.trim().length > 0;

  return (
    <div className="mb-4">
      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2 min-h-[24px]">
        <label className="text-xs font-medium text-admin-text-secondary">{label}</label>

        <div className="flex items-center gap-1">
          {LOCALE_TABS.map(({ code, short, name }) => (
            <button
              key={code}
              type="button"
              title={name}
              onClick={() => setLocale(code)}
              className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium transition ${
                locale === code
                  ? "bg-admin-accent text-white"
                  : "text-admin-text-muted hover:text-admin-text"
              }`}
            >
              <span
                className={`inline-block h-1.5 w-1.5 rounded-full ${
                  hasContent(code) ? "bg-green-400" : "bg-admin-border"
                }`}
              />
              {short}
            </button>
          ))}

          <button
            type="button"
            onClick={handleTranslate}
            disabled={!canTranslate || translating}
            title={
              canTranslate
                ? `Translate from ${LOCALE_TABS.find((t) => t.code === locale)?.name} to all other languages via DeepL`
                : "Enter text in this locale first"
            }
            className="ml-1.5 rounded border border-admin-accent/50 px-2 py-0.5 text-[11px] text-admin-accent transition hover:bg-admin-accent-soft disabled:cursor-not-allowed disabled:opacity-40"
          >
            {translating ? "Translating…" : "↺ Translate"}
          </button>
        </div>
      </div>

      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={
          locale !== "en" && placeholder
            ? `${placeholder} (${LOCALE_TABS.find((t) => t.code === locale)?.name})`
            : placeholder
        }
        className="w-full rounded-md border border-admin-border bg-admin-bg px-3 py-2 text-sm text-admin-text placeholder-admin-text-muted outline-none transition focus:border-admin-text-muted"
      />

      {translateError && <p className="mt-1 text-xs text-red-500">{translateError}</p>}
    </div>
  );
}
