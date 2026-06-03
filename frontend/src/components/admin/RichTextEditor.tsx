import { useEffect, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import TextStyle from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import { CalloutNode, type CalloutVariant } from "./CalloutNode";
import { FigRowNode, FigItemNode } from "./FigRowNode";
import { uploadJournalImage, type TiptapDoc } from "@/lib/admin-api";

// LUME brand colours pulled from the sample memoranda (docx run colours)
const COLOR_SWATCHES: { value: string; label: string }[] = [
  { value: "#1A1A1A", label: "Ink" },
  { value: "#8A8273", label: "Stone" },
  { value: "#C99B22", label: "Gold" },
  { value: "#7A6932", label: "Olive" },
  { value: "#A23B2D", label: "Brick" },
  { value: "#2F5D50", label: "Pine" },
];

const EMPTY_DOC: TiptapDoc = { type: "doc", content: [{ type: "paragraph" }] };

export interface RichTextEditorProps {
  value: TiptapDoc | Record<string, never> | null | undefined;
  onChange: (doc: TiptapDoc) => void;
  onBlur?: () => void;
  placeholder?: string;
  /** localStorage / autosave key — mostly informational, used to force editor remount on doc switch */
  storageKey?: string;
}

export function RichTextEditor({
  value,
  onChange,
  onBlur,
  placeholder = "Start writing the article…",
  storageKey,
}: RichTextEditorProps) {
  const initialDoc = isUsableDoc(value) ? (value as TiptapDoc) : EMPTY_DOC;
  // Keep a ref to onChange so we don't recreate the editor on every render
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onBlurRef = useRef(onBlur);
  onBlurRef.current = onBlur;

  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({
          heading: { levels: [1, 2, 3] },
          codeBlock: false,
          horizontalRule: false,
        }),
        TextStyle,
        Color.configure({ types: ["textStyle"] }),
        Image.configure({ inline: false, allowBase64: false, HTMLAttributes: { class: "rte-image" } }),
        Link.configure({ openOnClick: false, autolink: true, HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" } }),
        Placeholder.configure({ placeholder }),
        CalloutNode,
        FigRowNode,
        FigItemNode,
        Table.configure({ resizable: false, HTMLAttributes: { class: "rte-table" } }),
        TableRow,
        TableHeader,
        TableCell,
      ],
      content: initialDoc,
      onUpdate({ editor }) {
        onChangeRef.current(editor.getJSON() as TiptapDoc);
      },
      onBlur() {
        onBlurRef.current?.();
      },
      editorProps: {
        attributes: {
          class: "prose prose-sm max-w-none focus:outline-none min-h-[300px] px-4 py-3",
        },
      },
    },
    // Recreate the editor only when the storage key (= which locale/doc we're editing) changes
    [storageKey],
  );

  // If the parent swaps in a different doc for the *same* key (e.g. after a
  // remote "translate body" call), push it into the editor without losing focus.
  useEffect(() => {
    if (!editor) return;
    const next = isUsableDoc(value) ? (value as TiptapDoc) : EMPTY_DOC;
    const current = editor.getJSON();
    if (JSON.stringify(current) === JSON.stringify(next)) return;
    editor.commands.setContent(next, false);
  }, [value, editor]);

  if (!editor) return null;

  return (
    <div className="rounded-md border border-admin-border bg-admin-surface">
      <Toolbar editor={editor} />
      <div className="max-h-[60vh] overflow-y-auto">
        <EditorContent editor={editor} />
      </div>
      <style>{`
        .ProseMirror p.is-editor-empty:first-child::before {
          color: var(--admin-text-muted, #9ca3af);
          content: attr(data-placeholder);
          float: left;
          height: 0;
          pointer-events: none;
        }
        .ProseMirror [data-callout] {
          border-left: 3px solid #C99B22;
          background: rgba(201, 155, 34, 0.06);
          padding: 0.75rem 1rem;
          margin: 1rem 0;
          border-radius: 0.25rem;
        }
        .ProseMirror [data-callout][data-variant="quote"] {
          border-left-color: #8A8273;
          background: rgba(138, 130, 115, 0.08);
          font-style: italic;
        }
        .ProseMirror [data-callout][data-variant="data"] {
          border-left-color: #2F5D50;
          background: rgba(47, 93, 80, 0.06);
          font-variant-numeric: tabular-nums;
        }
        .ProseMirror img.rte-image {
          max-width: 100%;
          height: auto;
          margin: 1rem 0;
          border-radius: 0.25rem;
        }
        .ProseMirror h1 {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-weight: 500;
          font-size: 1.75rem;
          line-height: 1.1;
          color: #2C281F;
          margin: 1.5rem 0 0.5rem;
          padding-top: 0.5rem;
          border-top: 1px solid #DCCFB4;
        }
        .ProseMirror h1::before {
          content: "§ section ";
          font-family: ui-sans-serif, system-ui, sans-serif;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: #B98E2C;
          margin-right: 0.5rem;
          vertical-align: middle;
        }
        .ProseMirror table.rte-table {
          border-collapse: collapse;
          margin: 1rem 0;
          width: 100%;
          table-layout: fixed;
        }
        .ProseMirror table.rte-table td,
        .ProseMirror table.rte-table th {
          border: 1px solid #DCCFB4;
          padding: 0.5rem 0.75rem;
          vertical-align: top;
          min-width: 4rem;
          position: relative;
        }
        .ProseMirror table.rte-table th {
          background: #FBF6EC;
          font-weight: 600;
          text-align: left;
        }
        .ProseMirror [data-fig-row] {
          display: grid;
          grid-template-columns: repeat(var(--fig-cols, 4), 1fr);
          gap: 1px;
          background: #DCCFB4;
          border: 1px solid #DCCFB4;
          margin: 1rem 0;
        }
        .ProseMirror [data-fig-item] {
          background: #FBF6EC;
          padding: 0.75rem 0.75rem;
        }
        .ProseMirror [data-fig-item] p:first-child {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-weight: 500;
          font-size: 1.5rem;
          line-height: 1;
          color: #2C281F;
          margin: 0;
        }
        .ProseMirror [data-fig-item] p:last-child {
          font-family: ui-sans-serif, system-ui, sans-serif;
          font-size: 0.7rem;
          letter-spacing: 0.05em;
          color: #8B7F69;
          margin: 0.4rem 0 0;
        }
      `}</style>
    </div>
  );
}

function isUsableDoc(value: unknown): boolean {
  return Boolean(
    value &&
      typeof value === "object" &&
      (value as { type?: string }).type === "doc" &&
      Array.isArray((value as { content?: unknown[] }).content),
  );
}

// ─── Toolbar ─────────────────────────────────────────────────────────────────

function Toolbar({ editor }: { editor: ReturnType<typeof useEditor> }) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [colorOpen, setColorOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!editor) return null;

  const btn = (active: boolean) =>
    `rounded px-2 py-1 text-xs transition ${
      active
        ? "bg-admin-accent text-white"
        : "text-admin-text-secondary hover:bg-admin-bg hover:text-admin-text"
    }`;

  const handlePickImage = () => fileInputRef.current?.click();

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // reset so picking the same file twice still fires
    if (!file) return;
    setUploading(true);
    setUploadError("");
    try {
      const { url } = await uploadJournalImage(file);
      editor.chain().focus().setImage({ src: url, alt: file.name }).run();
    } catch (err: any) {
      setUploadError(err?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const insertLink = () => {
    const previous = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("URL", previous ?? "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  const currentColor = (editor.getAttributes("textStyle").color as string | undefined) ?? "";

  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-admin-border bg-admin-bg/40 px-2 py-1.5">
      <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className={btn(editor.isActive("bold"))} title="Bold (⌘B)">
        <strong>B</strong>
      </button>
      <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className={btn(editor.isActive("italic"))} title="Italic (⌘I)">
        <em>I</em>
      </button>

      <Divider />

      <button
        type="button"
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        className={btn(editor.isActive("heading", { level: 1 }))}
        title="Section header — auto-numbered (01, 02 …) on the public page"
      >
        Section
      </button>
      <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={btn(editor.isActive("heading", { level: 2 }))} title="Sub-heading">
        H2
      </button>
      <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className={btn(editor.isActive("heading", { level: 3 }))} title="Small sub-heading">
        H3
      </button>

      <Divider />

      <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} className={btn(editor.isActive("bulletList"))} title="Bullet list">
        • List
      </button>
      <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={btn(editor.isActive("orderedList"))} title="Numbered list">
        1. List
      </button>
      <button type="button" onClick={() => editor.chain().focus().toggleBlockquote().run()} className={btn(editor.isActive("blockquote"))} title="Block quote">
        ❝
      </button>

      <Divider />

      {/* Colour picker — popover with swatches + free input */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setColorOpen((v) => !v)}
          className={btn(Boolean(currentColor))}
          title="Text colour"
        >
          <span className="inline-flex items-center gap-1">
            <span
              className="inline-block h-3 w-3 rounded-sm border border-admin-border"
              style={{ background: currentColor || "transparent" }}
            />
            Colour
          </span>
        </button>
        {colorOpen && (
          <div className="absolute z-20 mt-1 flex items-center gap-2 rounded-md border border-admin-border bg-admin-surface p-2 shadow-lg">
            {COLOR_SWATCHES.map((s) => (
              <button
                key={s.value}
                type="button"
                title={s.label}
                onClick={() => {
                  editor.chain().focus().setColor(s.value).run();
                  setColorOpen(false);
                }}
                className="h-5 w-5 rounded-sm border border-admin-border transition hover:scale-110"
                style={{ background: s.value }}
              />
            ))}
            <input
              type="color"
              value={currentColor || "#1A1A1A"}
              onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
              className="h-6 w-6 cursor-pointer rounded border border-admin-border bg-transparent"
              title="Custom colour"
            />
            <button
              type="button"
              onClick={() => {
                editor.chain().focus().unsetColor().run();
                setColorOpen(false);
              }}
              className="ml-1 rounded px-2 py-0.5 text-[11px] text-admin-text-muted hover:text-admin-text"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      <Divider />

      <button type="button" onClick={insertLink} className={btn(editor.isActive("link"))} title="Link">
        🔗
      </button>

      <button
        type="button"
        onClick={handlePickImage}
        disabled={uploading}
        className={btn(false)}
        title="Insert image"
      >
        {uploading ? "Uploading…" : "🖼 Image"}
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageChange}
      />

      <Divider />

      {/* Stat row — 4-up data figures (€307bn / Nominal GDP, 2025 …) */}
      <button
        type="button"
        onClick={() => editor.chain().focus().insertFigRow(4).run()}
        className={btn(editor.isActive("figRow"))}
        title="Insert 4-up stat row"
      >
        # Stat row
      </button>
      {editor.isActive("figRow") && (
        <div className="flex items-center gap-1 rounded border border-admin-border px-1 py-0.5">
          <button
            type="button"
            onClick={() => editor.chain().focus().addFigItem().run()}
            className="rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-admin-text-muted hover:text-admin-text"
            title="Add stat"
          >
            + col
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().removeFigItem().run()}
            className="rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-admin-text-muted hover:text-admin-text"
            title="Remove this stat"
          >
            − col
          </button>
        </div>
      )}

      {/* Table */}
      <button
        type="button"
        onClick={() =>
          editor
            .chain()
            .focus()
            .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
            .run()
        }
        className={btn(editor.isActive("table"))}
        title="Insert table"
      >
        ▦ Table
      </button>
      {editor.isActive("table") && (
        <div className="flex items-center gap-1 rounded border border-admin-border px-1 py-0.5">
          <button
            type="button"
            onClick={() => editor.chain().focus().addRowAfter().run()}
            className="rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-admin-text-muted hover:text-admin-text"
            title="Add row"
          >
            +row
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().addColumnAfter().run()}
            className="rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-admin-text-muted hover:text-admin-text"
            title="Add column"
          >
            +col
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().deleteRow().run()}
            className="rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-admin-text-muted hover:text-admin-text"
            title="Delete row"
          >
            −row
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().deleteColumn().run()}
            className="rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-admin-text-muted hover:text-admin-text"
            title="Delete column"
          >
            −col
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().deleteTable().run()}
            className="rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-red-400 hover:text-red-500"
            title="Delete table"
          >
            ×
          </button>
        </div>
      )}

      <Divider />

      {/* Callout — split button: insert, then variant chips when active */}
      <button
        type="button"
        onClick={() => editor.chain().focus().insertCallout("note").run()}
        className={btn(editor.isActive("callout"))}
        title="Insert callout"
      >
        ✦ Callout
      </button>
      {editor.isActive("callout") && (
        <div className="flex items-center gap-1 rounded border border-admin-border px-1 py-0.5">
          {(["note", "quote", "data"] as CalloutVariant[]).map((v) => {
            const active = editor.isActive("callout", { variant: v });
            return (
              <button
                key={v}
                type="button"
                onClick={() => editor.chain().focus().toggleCalloutVariant(v).run()}
                className={`rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wider transition ${
                  active ? "bg-admin-accent text-white" : "text-admin-text-muted hover:text-admin-text"
                }`}
              >
                {v}
              </button>
            );
          })}
        </div>
      )}

      <div className="ml-auto flex items-center gap-1">
        <button
          type="button"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          className={btn(false)}
          title="Undo"
        >
          ↶
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          className={btn(false)}
          title="Redo"
        >
          ↷
        </button>
      </div>

      {uploadError && (
        <span className="basis-full text-[11px] text-red-500">{uploadError}</span>
      )}
    </div>
  );
}

function Divider() {
  return <span className="mx-1 h-4 w-px bg-admin-border" />;
}
