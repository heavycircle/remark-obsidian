import { SKIP, visit } from "unist-util-visit";

const WIKILINK = /(!?)\[\[([^[\]|\n]+?)(?:\|([^[\]\n]*))?\]\]/g;
const IMAGE = /\.(avif|bmp|gif|jpe?g|png|svg|webp)$/i;
const SIZE = /^(\d+)(?:x(\d+))?$/;

// github-slugger's rules, so heading links match rehype-slug's ids
export const slug = (text) =>
  text
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}\p{Pc}\- ]/gu, "")
    .replace(/ /g, "-");

// "page#a#b" links to heading b (Obsidian's nested heading syntax);
// "page#^id" to a block
function parseTarget(raw) {
  const [page, ...sub] = raw.split("#").map((s) => s.trim());
  const last = sub.filter(Boolean).at(-1);
  const block = last?.startsWith("^") ? last.slice(1) : undefined;
  const heading = block === undefined ? last : undefined;
  return { page, heading, block, sub: sub.filter(Boolean) };
}

// Encoding each segment keeps "javascript:x" a relative path, not a scheme
const relative = (page) => page.split("/").map(encodeURIComponent).join("/");

const fragment = ({ heading, block }) =>
  block ? `#^${block}` : heading ? `#${slug(heading)}` : "";

export function validateLinkOptions({ resolve, embed }) {
  for (const [name, value] of Object.entries({ resolve, embed }))
    if (value !== undefined && typeof value !== "function")
      throw new TypeError(`remark-obsidian: ${name} must be a function`);
}

function toNodes(match, { resolve, embed }, alone) {
  const [typed, bang, rawTarget, alias] = match;
  const target = parseTarget(rawTarget);
  const { page, sub } = target;
  const url = (page) => {
    if (!page) return fragment(target);
    const base = resolve ? resolve(page) : relative(page);
    return typeof base === "string" ? base + fragment(target) : undefined;
  };
  const text = (value) => ({ type: "text", value });

  if (bang && IMAGE.test(page) && !sub.length) {
    const href = url(page);
    if (href === undefined) return [text(typed)];
    const size = alias?.trim().match(SIZE);
    return [
      {
        type: "image",
        url: href,
        alt: size || !alias?.trim() ? page : alias.trim(),
        ...(size && {
          data: {
            hProperties: {
              width: Number(size[1]),
              ...(size[2] && { height: Number(size[2]) }),
            },
          },
        }),
      },
    ];
  }

  // An embedded note is block content, so only a paragraph holding nothing
  // else becomes one; next to other text it stays a link
  if (bang && page && embed && alone) {
    const content = embed({
      page,
      heading: target.heading,
      block: target.block,
    });
    const children = Array.isArray(content) ? content : content?.children;
    if (children)
      return [
        {
          type: "embed",
          children,
          data: {
            hName: "div",
            hProperties: { className: ["internal-embed"], dataSrc: rawTarget },
          },
        },
      ];
  }

  const href = url(page);
  // Obsidian shows "page > heading" when there's no alias
  const label = alias?.trim() || [page, ...sub].filter(Boolean).join(" > ");
  if (href === undefined) return [text(label)];
  return [
    {
      type: "link",
      url: href,
      children: [text(label)],
      data: { hProperties: { className: ["internal-link"] } },
    },
  ];
}

function replaceInText(parent, options) {
  for (let i = 0; i < parent.children.length; i++) {
    const node = parent.children[i];
    if (node.type !== "text" || !node.value.includes("[[")) continue;
    const parts = [];
    let last = 0;
    const alone = parent.type === "paragraph" && parent.children.length === 1;
    for (const match of node.value.matchAll(WIKILINK)) {
      parts.push({ type: "text", value: node.value.slice(last, match.index) });
      parts.push(
        ...toNodes(match, options, alone && node.value.trim() === match[0]),
      );
      last = match.index + match[0].length;
    }
    if (!last) continue;
    parts.push({ type: "text", value: node.value.slice(last) });
    const kept = parts.filter((n) => n.type !== "text" || n.value);
    parent.children.splice(i, 1, ...kept);
    i += kept.length - 1;
  }
}

/*
[[page]], [[page|alias]], [[page#heading]], [[page#^block]] and ![[embeds]].
Runs before comments, highlights and callouts, so those also apply around
and inside links, and inside embedded notes.
*/
export function wikiLinks(tree, options, skip) {
  visit(tree, (node, index, parent) => {
    if (skip.has(node.type)) return SKIP;
    // A link can't hold another link
    if (node.type === "link" || node.type === "linkReference") return SKIP;
    if (!Array.isArray(node.children)) return;
    replaceInText(node, options);
    const [embedded] = node.children;
    if (embedded?.type === "embed" && parent) {
      parent.children.splice(index, 1, embedded);
      // Links inside an embedded note work, but its own embeds stay links,
      // so a note that embeds itself can't loop
      wikiLinks(embedded, { ...options, embed: undefined }, skip);
      return [SKIP, index + 1];
    }
  });
}
