import { visit } from "unist-util-visit";
import { aliases, chevronDown, defaultIcon, iconNode, types } from "./icons.js";
import { blockIds } from "./anchors.js";
import { validateLinkOptions, wikiLinks } from "./wikilinks.js";

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

const COMMENT = "%%";
const hasComment = (n) => n.type === "text" && n.value.includes(COMMENT);
const markers = (node) =>
  node.type === "paragraph"
    ? node.children
        .filter((n) => n.type === "text")
        .reduce((sum, n) => sum + n.value.split(COMMENT).length - 1, 0)
    : 0;
const isBlank = (n) =>
  n.type === "break" || (n.type === "text" && !n.value.trim());

function keepBeforeLastMarker(paragraph) {
  const children = paragraph.children;
  const at = children.findLastIndex(hasComment);
  const { value } = children[at];
  const kept = [
    ...children.slice(0, at),
    {
      type: "text",
      value: value.slice(0, value.lastIndexOf(COMMENT)).trimEnd(),
    },
  ];
  while (kept.length && isBlank(kept.at(-1))) kept.pop();
  paragraph.children = kept;
}

function keepAfterFirstMarker(paragraph) {
  const children = paragraph.children;
  const at = children.findIndex(hasComment);
  const { value } = children[at];
  const kept = [
    {
      type: "text",
      value: value.slice(value.indexOf(COMMENT) + COMMENT.length).trimStart(),
    },
    ...children.slice(at + 1),
  ];
  while (kept.length && isBlank(kept[0])) kept.shift();
  paragraph.children = kept;
}

// Path from `node` down to the first paragraph holding a marker
function pathToMarker(node) {
  if (node.type === "paragraph") return markers(node) ? [node] : undefined;
  if (SKIP.has(node.type) || !node.children) return;
  for (const child of node.children) {
    const path = pathToMarker(child);
    if (path) return [node, ...path];
  }
}

/*
A comment can wrap whole blocks: %% opens in one paragraph and closes in a
later sibling, or inside one (a `%%` line right after a list is a lazy
continuation of its last item). Everything between is removed, keeping the
text before the opener and after the closer. Runs before pairDelimiters so
the closing paragraph's remaining markers pair among themselves.
*/
function removeBlockComments(parent) {
  const children = parent.children;
  for (let i = 0; i < children.length; i++) {
    // Markers pair left to right, so an odd count leaves the last one open
    if (markers(children[i]) % 2 === 0) continue;
    let path;
    let j = i;
    while (!path && ++j < children.length) path = pathToMarker(children[j]);
    // No closer in a later block, so the marker stays as typed
    if (!path) return;

    keepBeforeLastMarker(children[i]);
    keepAfterFirstMarker(path.at(-1));
    for (let d = 0; d < path.length - 1; d++) {
      const kids = path[d].children;
      kids.splice(0, kids.indexOf(path[d + 1]));
    }
    for (let d = path.length - 1; d > 0 && !path[d].children.length; d--) {
      const kids = path[d - 1].children;
      kids.splice(kids.indexOf(path[d]), 1);
    }
    children.splice(i + 1, j - i - 1);
    if (!path[0].children.length) children.splice(i + 1, 1);
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
  data: { hName: "div", hProperties: { className: [className], ...extra } },
});

const pick = (object, key) => (object?.[key] ? { [key]: object[key] } : {});

const fail = (message) => {
  throw new TypeError(`remark-obsidian: ${message}`);
};

// Icons are built per callout, so later plugins can't edit a shared node
function toIcon(icon, type) {
  if (Array.isArray(icon)) {
    if (
      !icon.every((s) => typeof s?.[0] === "string" && s[1] instanceof Object)
    )
      fail(`"${type}" icon is not a Lucide icon node ([tag, attributes][])`);
    return () => iconNode(["", ...icon]);
  }
  if (icon?.type === "element" && typeof icon.tagName === "string")
    return () => ({
      type: "icon",
      data: {
        hName: icon.tagName,
        hProperties: structuredClone(icon.properties ?? {}),
        hChildren: structuredClone(icon.children ?? []),
      },
    });
  // A raw "<svg>" string would need raw HTML, which the plugin never emits
  fail(`"${type}" icon must be a Lucide icon node or a hast element`);
}

/*
Merges options.callouts over the built-ins into one type -> { icon, title }
lookup. Aliases are resolved last, so they follow overrides of their target
and may point at types defined later in the object. Bad options throw here,
once, rather than on some later render.
*/
function calloutTypes({ callouts = {} } = {}) {
  const entries = new Map();
  for (const [name, spec] of types)
    entries.set(name, { icon: () => iconNode(spec) });
  for (const [name, target] of aliases) entries.set(name, target);
  const own = new Set();

  for (const [key, value] of Object.entries(callouts)) {
    const name = key.toLowerCase();
    if (!/^\w+$/.test(name))
      fail(`callout type "${key}" may only use letters, digits and _`);
    if (value === false) {
      entries.delete(name);
    } else if (typeof value === "string") {
      entries.set(name, value.toLowerCase());
      own.add(name);
    } else if (value instanceof Object && !Array.isArray(value)) {
      if (value.title !== undefined && typeof value.title !== "string")
        fail(`"${key}" title must be a string`);
      entries.set(name, {
        icon: value.icon === undefined ? undefined : toIcon(value.icon, key),
        title: value.title,
        base: entries.get(name),
      });
    } else {
      fail(`"${key}" must be an object, a type to alias, or false`);
    }
  }

  const resolve = (entry, seen) => {
    if (entry === undefined) return;
    if (typeof entry === "string") {
      if (seen.has(entry))
        fail(`alias cycle: ${[...seen, entry].join(" -> ")}`);
      const target = resolve(entries.get(entry), new Set([...seen, entry]));
      return target && { icon: target.icon };
    }
    return {
      icon:
        entry.icon ??
        resolve(entry.base, seen)?.icon ??
        (() => iconNode(defaultIcon)),
      title: entry.title,
    };
  };

  const lookup = new Map();
  for (const [name, entry] of entries) {
    const resolved = resolve(entry, new Set([name]));
    // A built-in alias of a type turned off goes with it
    if (resolved) lookup.set(name, resolved);
    else if (own.has(name)) fail(`"${name}" aliases unknown type "${entry}"`);
  }
  return lookup;
}

/*
Callouts are blockquotes whose first line starts with [!type]. Anything else
(an empty quote, one that opens with code or formatting, or an unknown type)
stays a plain blockquote instead of throwing: editors render on every
keystroke, so half-typed quotes have to be safe.
*/
function calloutVisitor(node, lookup) {
  const first = node.children[0];
  const lead = first?.type === "paragraph" ? first.children[0] : undefined;
  if (lead?.type !== "text") return;

  const match = lead.value.match(CALLOUT);
  // Types are case-insensitive, so GitHub-style [!NOTE] works too
  const callout = match?.[1].toLowerCase();
  const type = match && lookup.get(callout);
  if (!type) return;
  const fold = match[2];

  const [titleLine, body] = splitFirstLine([
    { type: "text", value: lead.value.slice(match[0].length) },
    ...first.children.slice(1),
  ]);
  const title = titleLine.filter((n) => n.type !== "text" || n.value.trim());
  const defaultTitle =
    type.title ?? callout.charAt(0).toUpperCase() + callout.slice(1);

  const titleDiv = div("callout-title", [
    div("callout-icon", [type.icon()]),
    div(
      "callout-title-inner",
      title.length ? title : [{ type: "text", value: defaultTitle }],
    ),
    ...(fold ? [div("callout-fold", [iconNode(chevronDown)])] : []),
  ]);
  // [!type]- starts folded and [!type]+ starts open; <details> folds without
  // JavaScript, so only callouts with a marker become one
  if (fold) titleDiv.data.hName = "summary";
  const content = [...body, ...node.children.slice(1)];

  node.type = "div";
  node.data = {
    hName: fold ? "details" : "div",
    hProperties: {
      className: ["callout"],
      dataCallout: callout,
      ...(fold && { dataCalloutFold: fold, open: fold === "+" }),
      // A block id, from "^id" after the callout or at the end of its title
      ...pick(node.data?.hProperties ?? first.data?.hProperties, "id"),
    },
  };
  node.children = content.length
    ? [titleDiv, div("callout-content", content)]
    : [titleDiv];
}

// Code and math keep their markers literally
const SKIP = new Set(["code", "inlineCode", "math", "inlineMath", "html"]);

export default function remarkObsidian(options) {
  const lookup = calloutTypes(options ?? {});
  validateLinkOptions(options ?? {});
  return function transform(tree) {
    wikiLinks(tree, options ?? {}, SKIP);
    // Comments and highlights first, so they also apply inside callouts,
    // headings and table cells
    visit(tree, (node) => {
      if (SKIP.has(node.type)) return "skip";
      if (!Array.isArray(node.children)) return;
      removeBlockComments(node);
      pairDelimiters(node, "%%", removeComment);
      pairDelimiters(node, "==", highlight);
    });
    // A paragraph that was only a comment would render as an empty <p>
    visit(tree, "paragraph", (node, index, parent) => {
      if (node.children.length || !parent) return;
      parent.children.splice(index, 1);
      return index;
    });
    // After comments, so "text ^id %%note%%" still ends in its id
    blockIds(tree);
    visit(tree, "blockquote", (node) => calloutVisitor(node, lookup));
  };
}
