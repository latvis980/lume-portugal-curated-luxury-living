import { useRef, useState } from "react";
import { uploadJournalImage } from "@/lib/admin-api";

export interface ImageUploaderProps {
  value: string | null;
  onChange: (url: string | null) => void;
  label?: string;
  hint?: string;
}

export function ImageUploader({
  value,
  onChange,
  label = "Cover image",
  hint = "PNG or JPG. Stored in Supabase Storage.",
}: ImageUploaderProps) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const handleFile = async (file: File) => {
    setUploading(true);
    setError("");
    try {
      const { url } = await uploadJournalImage(file);
      onChange(url);
    } catch (e: any) {
      setError(e?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) await handleFile(file);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) await handleFile(file);
  };

  return (
    <div className="mb-4">
      <label className="mb-1.5 block text-xs font-medium text-admin-text-secondary">
        {label}
      </label>

      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        className="flex items-center gap-4 rounded-md border border-dashed border-admin-border bg-admin-surface p-3"
      >
        {value ? (
          <img
            src={value}
            alt="cover"
            className="h-20 w-32 rounded object-cover border border-admin-border"
          />
        ) : (
          <div className="flex h-20 w-32 items-center justify-center rounded border border-dashed border-admin-border bg-admin-bg text-xs text-admin-text-muted">
            No image
          </div>
        )}

        <div className="flex-1">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="rounded-md bg-admin-btn px-3 py-1.5 text-xs font-medium text-white transition hover:bg-admin-btn-hover disabled:opacity-50"
            >
              {uploading ? "Uploading…" : value ? "Replace" : "Upload"}
            </button>
            {value && (
              <button
                type="button"
                onClick={() => onChange(null)}
                className="rounded-md border border-admin-border px-3 py-1.5 text-xs text-admin-text-muted transition hover:text-admin-text"
              >
                Remove
              </button>
            )}
          </div>
          <p className="mt-1 text-[11px] text-admin-text-muted">
            {hint} You can also drop an image onto this area.
          </p>
          {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleChange}
        />
      </div>
    </div>
  );
}
