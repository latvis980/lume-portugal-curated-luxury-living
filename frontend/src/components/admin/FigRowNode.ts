import { Node, mergeAttributes } from "@tiptap/core";

// Stat-row block from the Memorandum mockup: a horizontal row of N
// figures, each made of a big number and a small label. Renders in the
// editor as the same 4-up grid that the public reader uses so authors
// see what they're producing.
//
// JSON shape:
//   { type: 'figRow', content: [figItem, figItem, ...] }
//   { type: 'figItem', content: [{ type:'paragraph' }, { type:'paragraph' }] }
//     - first child paragraph: the big number (e.g. "€307bn")
//     - second child paragraph: the label (e.g. "Nominal GDP, 2025")

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    figRow: {
      insertFigRow: (count?: number) => ReturnType;
      addFigItem: () => ReturnType;
      removeFigItem: () => ReturnType;
    };
  }
}

function emptyItem() {
  return {
    type: "figItem",
    content: [
      { type: "paragraph" },
      { type: "paragraph" },
    ],
  };
}

export const FigItemNode = Node.create({
  name: "figItem",
  group: "figItemGroup",
  content: "paragraph paragraph",
  defining: true,
  isolating: true,

  parseHTML() {
    return [{ tag: "div[data-fig-item]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-fig-item": "", class: "fig" }),
      0,
    ];
  },
});

export const FigRowNode = Node.create({
  name: "figRow",
  group: "block",
  content: "figItemGroup+",
  defining: true,
  isolating: true,

  addAttributes() {
    return {
      columns: {
        default: 4,
        parseHTML: (el) => Number(el.getAttribute("data-cols") || 4),
        renderHTML: (attrs) => ({ "data-cols": String(attrs.columns ?? 4) }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-fig-row]" }];
  },

  renderHTML({ HTMLAttributes, node }) {
    const cols = (node.attrs.columns as number) ?? 4;
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-fig-row": "",
        class: "figrow",
        style: `--fig-cols:${cols}`,
      }),
      0,
    ];
  },

  addCommands() {
    return {
      insertFigRow:
        (count = 4) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: { columns: count },
            content: Array.from({ length: count }, emptyItem),
          }),

      addFigItem:
        () =>
        ({ state, dispatch }) => {
          const { $from } = state.selection;
          // Walk up to find a figRow ancestor
          for (let depth = $from.depth; depth >= 0; depth--) {
            const node = $from.node(depth);
            if (node.type.name === "figRow") {
              const pos = $from.before(depth) + node.nodeSize - 1;
              const item = state.schema.nodeFromJSON(emptyItem());
              if (dispatch) {
                const tr = state.tr.insert(pos, item);
                dispatch(tr);
              }
              return true;
            }
          }
          return false;
        },

      removeFigItem:
        () =>
        ({ state, dispatch }) => {
          const { $from } = state.selection;
          for (let depth = $from.depth; depth >= 0; depth--) {
            const node = $from.node(depth);
            if (node.type.name === "figItem") {
              const parent = $from.node(depth - 1);
              if (!parent || parent.type.name !== "figRow") return false;
              if (parent.childCount <= 1) return false; // keep at least one
              const from = $from.before(depth);
              const to = from + node.nodeSize;
              if (dispatch) dispatch(state.tr.delete(from, to));
              return true;
            }
          }
          return false;
        },
    };
  },
});
