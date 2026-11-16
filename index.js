import { visit } from "unist-util-visit";
import {
  FlameIcon,
  InfoIcon,
  PencilIcon,
  ClipboardListIcon,
  CheckCircle2Icon,
  CheckIcon,
  HelpCircleIcon,
  ListIcon,
  QuoteIcon,
  AlertTriangleIcon,
  XIcon,
  ZapIcon,
  BugIcon,
} from "lucide-react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const icons = new Map();
// notes
icons.set("note", PencilIcon);
// abstracts
icons.set("abstract", ClipboardListIcon);
icons.set("summary", ClipboardListIcon);
icons.set("tldr", ClipboardListIcon);
// info
icons.set("info", InfoIcon);
// to do
icons.set("todo", CheckCircle2Icon);
// tip
icons.set("tip", FlameIcon);
icons.set("hint", FlameIcon);
icons.set("important", FlameIcon);
// success
icons.set("success", CheckIcon);
icons.set("check", CheckIcon);
icons.set("done", CheckIcon);
// question
icons.set("question", HelpCircleIcon);
icons.set("help", HelpCircleIcon);
icons.set("faq", HelpCircleIcon);
// warning
icons.set("warning", AlertTriangleIcon);
icons.set("caution", AlertTriangleIcon);
icons.set("attention", AlertTriangleIcon);
// failure
icons.set("failure", XIcon);
icons.set("fail", XIcon);
icons.set("missing", XIcon);
// danger
icons.set("danger", ZapIcon);
icons.set("error", ZapIcon);
// bug
icons.set("bug", BugIcon);
// example
icons.set("example", ListIcon);
// quote
icons.set("quote", QuoteIcon);
icons.set("cite", QuoteIcon);

const CALLOUT = /^\[!(\w+)\]([+-]?)[ \t]*/;

/*
Pairs `delim` markers among a parent's inline children, even when the text
between them crosses formatting or line breaks (`==**bold** text==`), and
replaces each pair with `wrap(between)`. Markers are matched left to right,
non-greedily, so `%%a%% kept %%b%%` keeps " kept ".
*/
function pairDelimiters(parent, delim, wrap) {
  const children = parent.children;
  let i = 0;
  let start = 0;
  const next = () => {
    i++;
    start = 0;
  };
  while (i < children.length) {
    const open = children[i];
    const at = open.type === "text" ? open.value.indexOf(delim, start) : -1;
    if (at === -1) {
      next();
      continue;
    }

    const from = at + delim.length;
    let j = i;
    let to = open.value.indexOf(delim, from);
    while (to === -1 && ++j < children.length) {
      if (children[j].type === "text") to = children[j].value.indexOf(delim);
    }
    // No closing marker after this one, so none later can pair either
    if (to === -1) return;
    // An empty pair (`====`) is left as typed; look past it in this node
    if (i === j && to === from) {
      start = to + delim.length;
      continue;
    }

    const close = children[j];
    const between =
      i === j
        ? [{ type: "text", value: open.value.slice(from, to) }]
        : [
            { type: "text", value: open.value.slice(from) },
            ...children.slice(i + 1, j),
            { type: "text", value: close.value.slice(0, to) },
          ];
    const replacement = [
      { type: "text", value: open.value.slice(0, at) },
      ...wrap(between.filter((n) => n.type !== "text" || n.value)),
      { type: "text", value: close.value.slice(to + delim.length) },
    ].filter((n) => n.type !== "text" || n.value);

    children.splice(i, j - i + 1, ...replacement);
    // Resume at the text after the pair, which may hold another one. Text
    // before the pair has no marker, so nothing is skipped.
    i = Math.max(i + replacement.length - 1, i);
    start = 0;
  }
}

// `%%comment%%` is removed. `==text==` becomes a highlight node that renders
// as <span class="highlight">; it's a real node rather than raw HTML, so its
// text stays escaped.
const removeComment = () => [];
const highlight = (children) => [
  {
    type: "highlight",
    children,
    data: { hName: "span", hProperties: { className: ["highlight"] } },
  },
];

/*
Splits a paragraph's inline children at its first line break: a break node
(remark-breaks) or a newline inside a text node (plain remark).
*/
function splitFirstLine(children) {
  for (let i = 0; i < children.length; i++) {
    const node = children[i];
    if (node.type === "break")
      return [children.slice(0, i), children.slice(i + 1)];
    if (node.type === "text" && node.value.includes("\n")) {
      const at = node.value.indexOf("\n");
      const head = { type: "text", value: node.value.slice(0, at) };
      const tail = { type: "text", value: node.value.slice(at + 1) };
      return [
        [...children.slice(0, i), head],
        [tail, ...children.slice(i + 1)].filter(
          (n) => n.type !== "text" || n.value,
        ),
      ];
    }
  }
  return [children, []];
}

const div = (className, children, extra = {}) => ({
  type: "div",
  children,
  data: { hName: "div", hProperties: { className, ...extra } },
});

/*
Callouts are blockquotes whose first line starts with [!type]. Anything else
(an empty quote, one that opens with code or formatting, or a type with no
icon) stays a plain blockquote instead of throwing: editors render on every
keystroke, so half-typed quotes have to be safe.
*/
function calloutVisitor(node) {
  const first = node.children[0];
  const lead = first?.type === "paragraph" ? first.children[0] : undefined;
  if (lead?.type !== "text") return;

  const match = lead.value.match(CALLOUT);
  // Types are case-insensitive, so GitHub-style [!NOTE] works too
  const callout = match?.[1].toLowerCase();
  if (!match || !icons.has(callout)) return;
  const fold = match[2];

  const [titleLine, body] = splitFirstLine([
    { type: "text", value: lead.value.slice(match[0].length) },
    ...first.children.slice(1),
  ]);
  const title = titleLine.filter((n) => n.type !== "text" || n.value.trim());
  const defaultTitle = callout.charAt(0).toUpperCase() + callout.slice(1);

  const icon = {
    type: "html",
    value: renderToStaticMarkup(createElement(icons.get(callout))),
  };
  const titleDiv = div("callout-title font-bold", [
    div("callout-icon", [icon]),
    div(
      "callout-title-inner",
      title.length ? title : [{ type: "text", value: defaultTitle }],
    ),
  ]);
  const content = [...body, ...node.children.slice(1)];

  node.type = "div";
  node.data = {
    hName: "div",
    hProperties: {
      className: "callout",
      callout,
      // [!type]- starts folded and [!type]+ starts open in Obsidian; exposed
      // for styling or scripts, since folding needs more than markup
      ...(fold && { "data-callout-fold": fold }),
    },
  };
  node.children = content.length
    ? [titleDiv, div("callout-content", content)]
    : [titleDiv];
}

// Code and math keep their markers literally
const SKIP = new Set(["code", "inlineCode", "math", "inlineMath", "html"]);

export default function remarkObsidian() {
  return function transform(tree) {
    // Comments and highlights first, so they also apply inside callouts,
    // headings and table cells
    visit(tree, (node) => {
      if (SKIP.has(node.type)) return "skip";
      if (!Array.isArray(node.children)) return;
      pairDelimiters(node, "%%", removeComment);
      pairDelimiters(node, "==", highlight);
    });
    // A paragraph that was only a comment would render as an empty <p>
    visit(tree, "paragraph", (node, index, parent) => {
      if (node.children.length || !parent) return;
      parent.children.splice(index, 1);
      return index;
    });
    visit(tree, "blockquote", calloutVisitor);
  };
}
