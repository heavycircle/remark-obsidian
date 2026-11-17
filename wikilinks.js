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

const fail = (message) => {
  throw new TypeError(`remark-obsidian: ${message}`);
};
const stripMd = (path) => path.replace(/\.md$/i, "");
const key = (path) => stripMd(path.trim().replace(/^\.?\//, "")).toLowerCase();

// Encoding each segment keeps "javascript:x" a path, never a URL scheme
const defaultUrl = (path) =>
  "/" +
  stripMd(path.replace(/^\.?\//, ""))
    .split("/")
    .map(encodeURIComponent)
    .join("/");

/*
Finds the page a link means, as Obsidian does: the exact path, else any page
whose path ends in the link ("Page" anywhere, "folder/Page" in a folder of
that name), closest to the vault root first, else an alias. Case-insensitive;
".md" is optional. Without a page list, the link is taken as the path.
*/
function pageFinder(pages) {
  if (pages === undefined) return (link) => link;
  if (!Array.isArray(pages)) fail("pages must be an array");
  const byPath = new Map();
  const byName = new Map();
  const byAlias = new Map();
  for (const page of pages) {
    const { path, aliases = [] } =
      typeof page === "string" ? { path: page } : (page ?? {});
    if (typeof path !== "string" || !path.trim())
      fail("each page must be a path or { path, aliases }");
    if (!Array.isArray(aliases) || aliases.some((a) => typeof a !== "string"))
      fail(`aliases of "${path}" must be strings`);
    const k = key(path);
    if (!byPath.has(k)) byPath.set(k, path);
    const name = k.split("/").at(-1);
    byName.set(name, [...(byName.get(name) ?? []), [k, path]]);
    for (const alias of aliases)
      if (!byAlias.has(key(alias))) byAlias.set(key(alias), path);
  }
  return (link) => {
    const k = key(link);
    if (byPath.has(k)) return byPath.get(k);
    const hits = (byName.get(k.split("/").at(-1)) ?? [])
      .filter(([path]) => path.endsWith(`/${k}`))
      .sort(
        ([a], [b]) =>
          a.split("/").length - b.split("/").length || a.localeCompare(b),
      );
    return hits.length ? hits[0][1] : byAlias.get(k);
  };
}

const fragment = ({ heading, block }) =>
  block ? `#^${block}` : heading ? `#${slug(heading)}` : "";

// Checked once, when the plugin is set up
export function linkOptions({ pages, url = defaultUrl, embed }) {
  for (const [name, value] of Object.entries({ url, embed }))
    if (value !== undefined && typeof value !== "function")
      fail(`${name} must be a function`);
  return { find: pageFinder(pages), toUrl: url, embed };
}

function toNodes(match, { find, toUrl, embed }, alone) {
  const [typed, bang, rawTarget, alias] = match;
  const target = parseTarget(rawTarget);
  const { page, sub } = target;
  const path = page ? find(page) : undefined;
  // An unresolved page, or a url() that returns no string, gives no link
  const url = () => {
    if (!page) return fragment(target);
    const base = path === undefined ? undefined : toUrl(path);
    return typeof base === "string" ? base + fragment(target) : undefined;
  };
  const text = (value) => ({ type: "text", value });

  if (bang && IMAGE.test(page) && !sub.length) {
    const href = url();
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
  if (bang && path !== undefined && embed && alone) {
    const content = embed({
      page,
      path,
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

  const href = url();
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
