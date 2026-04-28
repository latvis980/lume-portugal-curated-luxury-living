// frontend/src/pages/admin/AdminListingAIImport.tsx
/**
 * AI-powered listing importer tab.
 *
 * Drop a PDF/DOCX or paste raw listing text.
 * Claude extracts every field it can find, shows a preview,
 * and the admin clicks "Fill Form" to populate AdminListingForm.
 *
 * Props:
 *   onFill(data) — called with the parsed listing object to merge into the parent form.
 */

import { useCallback, useRef, useState } from "react";
import { getToken } from "@/lib/admin-api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AIResult {
  listing: Record<string, unknown>;
  meta: {
    fields_extracted: number;
    model: string;
    source: string;
  };
}

interface Props {
  onFill: (data: Record<string, unknown>) => void;
}

// ─── Field categories for preview display ────────────────────────────────────

const PREVIEW_SECTIONS = [
  {
    label: "Identity",
    keys: ["reference", "title", "slug", "property_type", "listing_type", "status"],
  },
  {
    label: "Price",
    keys: ["price", "currency"],
  },
  {
    label: "Location",
    keys: ["country", "region", "city", "area", "development_name"],
  },
  {
    label: "Specs",
    keys: [
      "bedrooms", "bathrooms", "interior_living_area", "plot_size",
      "floor_number", "floors", "living_rooms", "suites", "guest_wc",
      "gross_built_area", "build_year", "renovation_year", "condition", "energy_rating",
    ],
  },
  {
    label: "Features",
    keys: [
      "pool", "heated_pool", "garden", "private_garden", "terrace", "roof_terrace",
      "balcony", "patio", "garage", "elevator", "air_conditioning", "heating",
      "fireplace", "furnished", "concierge", "security", "smart_home",
    ],
  },
  {
    label: "Content",
    keys: ["short_description", "ai_summary", "full_description", "key_selling_points", "lifestyle_tags", "views", "nearby"],
  },
  {
    label: "Agent",
    keys: ["company", "listing_agent", "agent_name", "agent_email", "agent_phone"],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatValue(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "boolean") return v ? "✓ Yes" : "✗ No";
  if (Array.isArray(v)) return v.length ? v.join(", ") : "—";
  return String(v);
}

function isPresent(v: unknown): boolean {
  if (v === null || v === undefined || v === "" || v === false) return false;
  if (Array.isArray(v)) return v.length > 0;
  return true;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminListingAIImport({ onFill }: Props) {
  const [rawText, setRawText] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileData, setFileData] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [result, setResult] = useState<AIResult | null>(null);
  const [error, setError] = useState("");
  const [filled, setFilled] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── File handling ──────────────────────────────────────────────────────────

  const handleFile = useCallback((file: File) => {
    const allowed = [".pdf", ".docx"];
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    if (!allowed.includes(ext)) {
      setError("Unsupported file type. Please upload a PDF or DOCX file.");
      return;
    }
    setFileName(file.name);
    setFileData(file);
    setRawText("");
    setResult(null);
    setError("");
    setFilled(false);
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const onFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const clearFile = () => {
    setFileName(null);
    setFileData(null);
    setResult(null);
    setFilled(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ── Analyse ────────────────────────────────────────────────────────────────

  const analyse = async () => {
    if (!rawText.trim() && !fileData) {
      setError("Paste some text or drop a file first.");
      return;
    }
    setError("");
    setResult(null);
    setFilled(false);
    setLoading(true);

    // Animate loading messages
    const msgs = [
      "Reading listing content…",
      "Extracting fields with Claude…",
      "Generating descriptions…",
      "Almost there…",
    ];
    let i = 0;
    setLoadingMsg(msgs[0]);
    const interval = setInterval(() => {
      i = (i + 1) % msgs.length;
      setLoadingMsg(msgs[i]);
    }, 2200);

    try {
      const token = getToken();
      const body = new FormData();

      if (fileData) {
        body.append("file", fileData);
      } else {
        body.append("text", rawText);
      }

      const res = await fetch("/api/admin/ai-parse-listing", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body,
      });

      clearInterval(interval);

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Server error ${res.status}`);
      }

      const data: AIResult = await res.json();
      setResult(data);
    } catch (err: unknown) {
      clearInterval(interval);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  // ── Fill form ──────────────────────────────────────────────────────────────

  const handleFill = () => {
    if (!result) return;
    onFill(result.listing);
    setFilled(true);
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="rounded-lg border border-admin-border bg-admin-surface p-5">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-admin-btn/10 text-admin-btn">
            <SparklesIcon />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-admin-text">AI Listing Importer</h2>
            <p className="mt-0.5 text-xs text-admin-text-muted leading-relaxed">
              Paste raw listing text, or drop a PDF / Word file. Claude will extract every field it
              can find and pre-fill the form. You review, edit, and publish.
            </p>
          </div>
        </div>
      </div>

      {/* ── Input area ── */}
      {!result && (
        <div className="space-y-4">

          {/* Drag & drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={onDrop}
            onClick={() => !fileName && fileInputRef.current?.click()}
            className={`relative flex min-h-[120px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
              isDragging
                ? "border-admin-btn bg-admin-btn/5"
                : fileName
                  ? "border-green-500/40 bg-green-500/5 cursor-default"
                  : "border-admin-border hover:border-admin-text-muted"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx"
              onChange={onFileInput}
              className="hidden"
            />

            {fileName ? (
              <div className="flex items-center gap-3">
                <FileIcon />
                <div className="text-left">
                  <p className="text-sm font-medium text-admin-text">{fileName}</p>
                  <p className="text-xs text-admin-text-muted">Ready to analyse</p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); clearFile(); }}
                  className="ml-4 rounded-md border border-admin-border px-2 py-1 text-xs text-admin-text-muted hover:text-admin-text transition-colors"
                >
                  Remove
                </button>
              </div>
            ) : (
              <>
                <UploadIcon />
                <p className="mt-2 text-sm text-admin-text-muted">
                  Drop a <strong className="text-admin-text">PDF</strong> or{" "}
                  <strong className="text-admin-text">Word</strong> file here, or click to browse
                </p>
              </>
            )}
          </div>

          {/* Divider */}
          {!fileName && (
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-admin-border" />
              <span className="text-xs text-admin-text-muted">or paste text</span>
              <div className="h-px flex-1 bg-admin-border" />
            </div>
          )}

          {/* Text area */}
          {!fileName && (
            <textarea
              value={rawText}
              onChange={(e) => {
                setRawText(e.target.value);
                setResult(null);
                setFilled(false);
              }}
              rows={10}
              placeholder={`Paste the raw listing information here — any format works.\n\nExamples:\n• Copy-paste from an email or brochure\n• Portal listing text\n• Agent notes\n• Any combination of details`}
              className="w-full resize-y rounded-md border border-admin-border bg-admin-surface px-4 py-3 text-sm text-admin-text placeholder-admin-text-muted outline-none transition focus:border-admin-text-muted font-mono leading-relaxed"
            />
          )}

          {/* Error */}
          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Analyse button */}
          <button
            onClick={analyse}
            disabled={loading || (!rawText.trim() && !fileData)}
            className="w-full rounded-md bg-admin-btn py-2.5 text-sm font-medium text-white transition hover:bg-admin-btn-hover disabled:opacity-40"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Spinner /> {loadingMsg}
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <SparklesIcon /> Analyse with AI
              </span>
            )}
          </button>
        </div>
      )}

      {/* ── Result preview ── */}
      {result && (
        <div className="space-y-4">

          {/* Stats bar */}
          <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 px-4 py-3">
            <div className="flex items-center gap-2 text-sm text-green-800">
              <CheckIcon />
              <span>
                Claude extracted <strong>{result.meta.fields_extracted}</strong> fields
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { setResult(null); setFilled(false); }}
                className="rounded-md border border-admin-border bg-white px-3 py-1.5 text-xs text-admin-text-secondary hover:text-admin-text transition-colors"
              >
                ← Re-analyse
              </button>
              <button
                onClick={handleFill}
                disabled={filled}
                className="rounded-md bg-admin-btn px-4 py-1.5 text-xs font-medium text-white transition hover:bg-admin-btn-hover disabled:opacity-50"
              >
                {filled ? "✓ Form filled!" : "Fill Form with AI Data →"}
              </button>
            </div>
          </div>

          {filled && (
            <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">
              The form has been filled. Switch to any other tab to review and edit the fields.
              The listing is saved as a <strong>draft</strong> — you control when it goes live.
            </div>
          )}

          {/* Field preview sections */}
          {PREVIEW_SECTIONS.map((section) => {
            const rows = section.keys
              .map((k) => ({ key: k, value: result.listing[k] }))
              .filter(({ value }) => value !== undefined && value !== null);

            if (rows.length === 0) return null;

            return (
              <div key={section.label} className="rounded-lg border border-admin-border overflow-hidden">
                <div className="bg-admin-surface px-4 py-2 text-xs font-semibold uppercase tracking-wide text-admin-text-muted border-b border-admin-border">
                  {section.label}
                </div>
                <div className="divide-y divide-admin-border">
                  {rows.map(({ key, value }) => (
                    <div key={key} className="flex gap-4 px-4 py-2.5">
                      <span className="w-44 shrink-0 text-xs text-admin-text-muted font-mono">
                        {key}
                      </span>
                      <span
                        className={`flex-1 text-xs break-words ${
                          isPresent(value)
                            ? "text-admin-text"
                            : "text-admin-text-muted italic"
                        }`}
                      >
                        {formatValue(value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Raw JSON toggle */}
          <details className="rounded-lg border border-admin-border">
            <summary className="cursor-pointer px-4 py-2.5 text-xs text-admin-text-muted hover:text-admin-text transition-colors">
              View raw JSON from Claude
            </summary>
            <pre className="overflow-x-auto bg-admin-surface px-4 py-3 text-xs text-admin-text-muted border-t border-admin-border">
              {JSON.stringify(result.listing, null, 2)}
            </pre>
          </details>

          {/* Bottom fill button */}
          <button
            onClick={handleFill}
            disabled={filled}
            className="w-full rounded-md bg-admin-btn py-2.5 text-sm font-medium text-white transition hover:bg-admin-btn-hover disabled:opacity-50"
          >
            {filled ? "✓ Form Filled — Switch to Another Tab to Review" : "Fill Form with AI Data →"}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Micro icons (inline SVG — no extra dependency) ──────────────────────────

function SparklesIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.9 5.8L20 10l-6.1 1.2L12 17l-1.9-5.8L4 10l6.1-1.2Z" />
      <path d="M5 3v4M3 5h4M19 17v4M17 19h4" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-admin-text-muted">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-green-600">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}
