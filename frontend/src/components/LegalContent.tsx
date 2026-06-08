// frontend/src/components/LegalContent.tsx
//
// Renders a structured LegalDoc (see src/content/legal) with prose styling
// consistent with the rest of the site. Section `id`s are applied to the
// headings so they can be targeted by in-page anchor links.

import { motion } from "framer-motion";
import type { LegalBlock, LegalDoc } from "@/content/legal";

function Block({ block }: { block: LegalBlock }) {
  switch (block.type) {
    case "p":
      return (
        <p className="text-sm md:text-[15px] leading-relaxed text-muted-foreground font-body">
          {block.text}
        </p>
      );
    case "list":
      return (
        <ul className="space-y-2 pl-1">
          {block.items.map((item, i) => (
            <li
              key={i}
              className="relative pl-5 text-sm md:text-[15px] leading-relaxed text-muted-foreground font-body"
            >
              <span className="absolute left-0 top-[0.65em] h-1 w-1 rounded-full bg-primary/60" />
              {item}
            </li>
          ))}
        </ul>
      );
    case "kv":
      return (
        <dl className="divide-y divide-border rounded-sm border border-border bg-card/40">
          {block.pairs.map(([k, v], i) => (
            <div key={i} className="flex flex-col gap-0.5 px-4 py-3 sm:flex-row sm:gap-4">
              <dt className="w-44 shrink-0 text-xs font-medium uppercase tracking-wider text-foreground/70 font-body">
                {k}
              </dt>
              <dd className="text-sm leading-relaxed text-muted-foreground font-body">{v}</dd>
            </div>
          ))}
        </dl>
      );
    case "table":
      return (
        <div className="overflow-x-auto rounded-sm border border-border">
          <table className="w-full border-collapse text-left text-sm font-body">
            <thead>
              <tr className="bg-card/60">
                {block.columns.map((c, i) => (
                  <th
                    key={i}
                    className="border-b border-border px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-foreground/80"
                  >
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, ri) => (
                <tr key={ri} className="align-top">
                  {row.map((cell, ci) => (
                    <td
                      key={ci}
                      className="border-b border-border/60 px-4 py-3 leading-relaxed text-muted-foreground"
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    default:
      return null;
  }
}

const LegalContent = ({ doc }: { doc: LegalDoc }) => {
  return (
    <article className="px-6 md:px-10 lg:px-16 py-14 md:py-20 bg-background">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="mb-12 md:mb-16"
        >
          <div className="mb-5 h-px w-12 bg-primary/60" />
          <h1 className="font-display text-3xl md:text-4xl lg:text-5xl font-light text-foreground">
            {doc.title}
          </h1>
          {doc.subtitle && (
            <p className="mt-3 text-sm tracking-wide text-muted-foreground font-body">
              {doc.subtitle}
            </p>
          )}
          <p className="mt-2 text-xs uppercase tracking-[0.2em] text-muted-foreground/70 font-body">
            {doc.updated}
          </p>
          {doc.intro && (
            <div className="mt-6 space-y-4">
              {doc.intro.map((p, i) => (
                <p
                  key={i}
                  className="text-sm md:text-[15px] leading-relaxed text-muted-foreground font-body"
                >
                  {p}
                </p>
              ))}
            </div>
          )}
        </motion.header>

        {/* Sections */}
        <div className="space-y-12">
          {doc.sections.map((section) => (
            <section key={section.id} id={section.id} className="scroll-mt-28">
              {section.eyebrow && (
                <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.25em] text-primary/80 font-body">
                  {section.eyebrow}
                </p>
              )}
              <h2 className="mb-4 font-display text-xl md:text-2xl font-light text-foreground">
                {section.heading}
              </h2>
              <div className="space-y-4">
                {section.blocks.map((block, i) => (
                  <Block key={i} block={block} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </article>
  );
};

export default LegalContent;
