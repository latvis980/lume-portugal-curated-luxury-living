// Minimal HTML renderer for a Tiptap JSON document.
// The Journal feature stores rich-text bodies as Tiptap JSON; this gives
// the public stub pages something readable until the design ships.

type Mark = { type: string; attrs?: Record<string, unknown> };
type Node = {
  type: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: Mark[];
  content?: Node[];
};

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

function renderNode(node: Node): string {
  if (node.type === "text") {
    return wrapMarks(escape(node.text ?? ""), node.marks);
  }
  const children = (node.content ?? []).map(renderNode).join("");
  switch (node.type) {
    case "doc":
      return children;
    case "paragraph":
      return `<p>${children}</p>`;
    case "heading": {
      const level = Number(node.attrs?.level ?? 2);
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
      const variant = escape(String((node.attrs?.variant as string) ?? "note"));
      return `<div data-callout data-variant="${variant}">${children}</div>`;
    }
    default:
      return children;
  }
}

export function TiptapRenderer({ doc }: { doc: unknown }) {
  if (!doc || typeof doc !== "object" || (doc as Node).type !== "doc") {
    return null;
  }
  const html = renderNode(doc as Node);
  return <div className="prose prose-stone max-w-none" dangerouslySetInnerHTML={{ __html: html }} />;
}
