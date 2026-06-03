// HTML renderer for a Tiptap JSON document.
//
// The Journal stores rich-text bodies as Tiptap JSON. This renderer:
//   - Groups top-level content into numbered sections at each H1 heading.
//     H1 is reserved for "section anchor + header" — the renderer assigns
//     01, 02 … in order and emits an id="sN" anchor for the TOC.
//   - Renders the rest (paragraphs, H2/H3, lists, blockquote, image,
//     callouts, tables, fig-rows) as plain HTML with mockup-aligned classes.
//   - Exports walkH1Sections() and estimateReadTime() helpers.

type Mark = { type: string; attrs?: Record<string, unknown> };
type Node = {
  type: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: Mark[];
  content?: Node[];
};

type Doc = { type: "doc"; content?: Node[] };

function escape(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function wrapMarks(text: string, marks: Mark[] | undefined): string {
  if (!marks?.length) return text;
  let out = text;
  for (const mark of marks) {
    if (mark.type === "bold") out = `<strong>${out}</strong>`;
    else if (mark.type === "italic") out = `<em>${out}</em>`;
    else if (mark.type === "link") {
      const href = String((mark.attrs?.href as string) ?? "");
      out = `<a href="${escape(href)}" target="_blank" rel="noopener noreferrer">${out}</a>`;
    } else if (mark.type === "textStyle") {
      const color = mark.attrs?.color as string | undefined;
      if (color) out = `<span style="color:${escape(color)}">${out}</span>`;
    }
  }
  return out;
}

function plainText(node: Node): string {
  if (node.type === "text") return node.text ?? "";
  return (node.content ?? []).map(plainText).join("");
}

function renderNode(node: Node): string {
  if (node.type === "text") {
    return wrapMarks(escape(node.text ?? ""), node.marks);
  }
  const children = (node.content ?? []).map(renderNode).join("");
  switch (node.type) {
    case "paragraph":
      return `<p>${children}</p>`;
    case "heading": {
      const level = Number(node.attrs?.level ?? 2);
      // H1 should never appear inside renderNode — sections handle them.
      // If somehow nested, fall through to a regular heading.
      if (level === 2) return `<h3 class="subhead">${children}</h3>`;
      if (level === 3) return `<h4 class="subhead subhead--sm">${children}</h4>`;
      return `<h${level}>${children}</h${level}>`;
    }
    case "bulletList":
      return `<ul>${children}</ul>`;
    case "orderedList":
      return `<ol>${children}</ol>`;
    case "listItem":
      return `<li>${children}</li>`;
    case "blockquote":
      return `<blockquote>${children}</blockquote>`;
    case "hardBreak":
      return "<br/>";
    case "image": {
      const src = String((node.attrs?.src as string) ?? "");
      const alt = String((node.attrs?.alt as string) ?? "");
      return `<img src="${escape(src)}" alt="${escape(alt)}" />`;
    }
    case "callout": {
      const variant = String((node.attrs?.variant as string) ?? "note");
      if (variant === "quote") {
        // Render as a pull-quote, matching the mockup .pull styling.
        return `<aside class="pull"><div class="pull__inner">${children}</div></aside>`;
      }
      return `<div data-callout data-variant="${escape(variant)}">${children}</div>`;
    }
    case "figRow": {
      const cols = Number(node.attrs?.columns ?? (node.content?.length ?? 4));
      return `<div class="figrow" style="--fig-cols:${cols}">${children}</div>`;
    }
    case "figItem": {
      const kids = node.content ?? [];
      const num = kids[0] ? renderNode(kids[0]).replace(/^<p>|<\/p>$/g, "") : "";
      const lbl = kids[1] ? renderNode(kids[1]).replace(/^<p>|<\/p>$/g, "") : "";
      return `<div class="fig"><div class="fig__n">${num}</div><div class="fig__l">${lbl}</div></div>`;
    }
    case "table":
      return `<div class="data-table-wrap"><table class="data-table">${children}</table></div>`;
    case "tableRow":
      return `<tr>${children}</tr>`;
    case "tableHeader":
      return `<th>${children}</th>`;
    case "tableCell":
      return `<td>${children}</td>`;
    default:
      return children;
  }
}

// ─── Section grouping ───────────────────────────────────────────────────────

function isH1(node: Node): boolean {
  return node.type === "heading" && Number(node.attrs?.level ?? 0) === 1;
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function renderDocSections(doc: Doc): string {
  const nodes = doc.content ?? [];
  if (nodes.length === 0) return "";

  type Section = { id: string; index: number; title: string; bodyNodes: Node[] } | { intro: true; bodyNodes: Node[] };
  const sections: Section[] = [];
  let current: Section | null = null;
  let sectionIndex = 0;

  for (const node of nodes) {
    if (isH1(node)) {
      sectionIndex += 1;
      current = {
        id: `s${sectionIndex}`,
        index: sectionIndex,
        title: plainText(node),
        bodyNodes: [],
      };
      sections.push(current);
    } else {
      if (!current) {
        // Lead intro before the first H1 — collect into a single intro block.
        if (sections.length === 0 || !("intro" in sections[0])) {
          const intro: Section = { intro: true, bodyNodes: [node] };
          sections.unshift(intro);
        } else {
          (sections[0] as { intro: true; bodyNodes: Node[] }).bodyNodes.push(node);
        }
      } else {
        current.bodyNodes.push(node);
      }
    }
  }

  return sections
    .map((s) => {
      const body = s.bodyNodes.map(renderNode).join("");
      if ("intro" in s) {
        return `<section class="sec sec--intro">${body}</section>`;
      }
      return `<section class="sec" id="${s.id}">
        <div class="sec__head">
          <span class="sec__no">${pad2(s.index)}</span>
          <h2 class="sec__title">${escape(s.title)}</h2>
        </div>
        ${body}
      </section>`;
    })
    .join("");
}

export function TiptapRenderer({ doc }: { doc: unknown }) {
  if (!doc || typeof doc !== "object" || (doc as Node).type !== "doc") {
    return null;
  }
  const html = renderDocSections(doc as Doc);
  return <div className="read" dangerouslySetInnerHTML={{ __html: html }} />;
}

// ─── Helpers exposed for the article page ───────────────────────────────────

export interface TocEntry {
  id: string;
  index: number;
  title: string;
}

export function walkH1Sections(doc: unknown): TocEntry[] {
  if (!doc || typeof doc !== "object" || (doc as Node).type !== "doc") return [];
  const nodes = ((doc as Doc).content ?? []).filter(isH1);
  return nodes.map((n, i) => ({
    id: `s${i + 1}`,
    index: i + 1,
    title: plainText(n),
  }));
}

// Counts every text-node character in the doc and converts to minutes at
// ~5 chars/word, default 220 wpm. Returns at least 1.
export function estimateReadTime(doc: unknown, wpm = 220): number {
  if (!doc || typeof doc !== "object") return 1;
  let chars = 0;
  const walk = (node: Node) => {
    if (node.type === "text" && typeof node.text === "string") {
      chars += node.text.length;
    }
    (node.content ?? []).forEach(walk);
  };
  walk(doc as Node);
  const words = chars / 5;
  return Math.max(1, Math.round(words / wpm));
}
