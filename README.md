# remark-obsidian

[![CI](https://github.com/heavycircle/remark-obsidian/actions/workflows/ci.yml/badge.svg)](https://github.com/heavycircle/remark-obsidian/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@heavycircle/remark-obsidian)](https://www.npmjs.com/package/@heavycircle/remark-obsidian)

A [remark](https://github.com/remarkjs/remark) plugin for [Obsidian-flavored Markdown](https://help.obsidian.md/Editing+and+formatting/Obsidian+Flavored+Markdown): callouts, comments, highlights, wikilinks, embeds and block ids.

## Contents

- [What it supports](#what-it-supports)
- [Install](#install)
- [Use](#use)
- [Syntax](#syntax)
- [Markup](#markup)
- [Styling](#styling)
- [API](#api)
- [Security](#security)
- [Compatibility](#compatibility)
- [Contributing](#contributing)
- [License](#license)

## What it supports

| Syntax                        | Result                            |
| ----------------------------- | --------------------------------- |
| `> [!note] Title`             | [Callouts](#callouts), with icons |
| `%%hidden%%`                  | [Comments](#comments), removed    |
| `==highlighted==`             | [Highlights](#highlights)         |
| `[[Page#Heading\|Alias]]`     | [Wikilinks](#wikilinks)           |
| `![[image.png]]`, `![[Note]]` | [Embeds](#embeds)                 |
| `text ^id`                    | [Block ids](#block-ids)           |

Other Obsidian syntax is covered by existing plugins:

| Syntax                         | Plugin                                                     |
| ------------------------------ | ---------------------------------------------------------- |
| `~~strike~~`, tables, `- [ ]`  | [remark-gfm](https://github.com/remarkjs/remark-gfm)       |
| `$math$`                       | [remark-math](https://github.com/remarkjs/remark-math)     |
| Line breaks without two spaces | [remark-breaks](https://github.com/remarkjs/remark-breaks) |

Don't combine it with [remark-wiki-link](https://github.com/landakram/remark-wiki-link): that plugin parses `[[…]]` first, so this one never sees those links.

## Install

This package is [ESM only](https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c) and needs Node.js 20 or newer.

```sh
npm install @heavycircle/remark-obsidian
# or
bun add @heavycircle/remark-obsidian
```

## Use

```js
import remarkObsidian from "@heavycircle/remark-obsidian";
import rehypeStringify from "rehype-stringify";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";

const html = await unified()
  .use(remarkParse)
  .use(remarkObsidian)
  .use(remarkRehype)
  .use(rehypeStringify)
  .process("> [!tip] Hello\n> This is a ==callout==. %%Not shown.%%");
```

```html
<div class="callout" data-callout="tip">
  <div class="callout-title">
    <div class="callout-icon"><svg>…</svg></div>
    <div class="callout-title-inner">Hello</div>
  </div>
  <div class="callout-content">
    This is a <span class="highlight">callout</span>.
  </div>
</div>
```

With [react-markdown](https://github.com/remarkjs/react-markdown), add the plugin to `remarkPlugins`.

Icons are inline SVG elements, not raw HTML, so they need neither `allowDangerousHtml` nor [rehype-raw](https://github.com/rehypejs/rehype-raw). Both still work if you use them for other reasons.

## Syntax

### Callouts

A blockquote whose first line starts with `[!type]` becomes a callout. The rest of that line is its title; later lines are its body.

```md
> [!warning] Mind the gap
> Body text, **formatting**, lists and nested callouts all work.
```

- **No title:** `> [!tip]` alone gets one from its type ("Tip").
- **Case-insensitive types:** GitHub-style `[!NOTE]` works.
- **Collapsible:** `[!faq]-` starts folded and `[!faq]+` starts open. These callouts render as `<details>` / `<summary>`, so they fold without JavaScript; the title is the clickable summary.
- **Plain blockquotes:** a quote with an unknown type, or whose first line doesn't start with `[!type]`, stays a normal blockquote.

| Type       | Aliases                |
| ---------- | ---------------------- |
| `note`     |                        |
| `abstract` | `summary`, `tldr`      |
| `info`     |                        |
| `todo`     |                        |
| `tip`      | `hint`, `important`    |
| `success`  | `check`, `done`        |
| `question` | `help`, `faq`          |
| `warning`  | `caution`, `attention` |
| `failure`  | `fail`, `missing`      |
| `danger`   | `error`                |
| `bug`      |                        |
| `example`  |                        |
| `quote`    | `cite`                 |

### Comments

`%%text%%` is removed from the output. Comments can span formatting and lines; a paragraph that only held a comment is removed entirely.

### Highlights

`==text==` becomes `<span class="highlight">text</span>`. Highlights can span formatting (`==**bold** text==`). An empty `====` or an unclosed `==` is left as typed.

### Wikilinks

`[[Page]]` links to another page; `[[Page|Alias]]` shows different text.

- **Headings:** `[[Page#Heading]]` links to `Page#heading`, slugged like [rehype-slug](https://github.com/rehypejs/rehype-slug) so it meets that plugin's heading ids. `[[Page#A#B]]` links to the nested heading `B`; `[[#Heading]]` links within the page.
- **Blocks:** `[[Page#^id]]` links to the [block id](#block-ids) `^id` on that page.
- **Text:** without an alias, the link reads like Obsidian's: `Page > Heading`.
- **Finding the page:** give [`options.pages`](#optionspages) your vault's file list and links resolve as in Obsidian: `[[Page]]` finds `Page.md` in any folder. Without it, the link text is taken as the path.
- **URLs:** `/` plus the path without `.md`, URL-encoded (`[[Projects/My Note]]` links to `/Projects/My%20Note`). [`options.url`](#optionsurl) changes that.
- **Tables:** escape the alias pipe, `[[Page\|Alias]]`, as in Obsidian.

### Embeds

- **Images:** `![[cat.png]]` becomes `<img>`. `![[cat.png|A cat]]` sets the alt text, `![[cat.png|300]]` the width and `![[cat.png|300x200]]` both.
- **Notes:** `![[Note]]`, `![[Note#Heading]]` and `![[Note#^id]]` alone in a paragraph insert the note's content, which [`options.embed`](#optionsembed) provides (the plugin can't read files). Without that option, or next to other text, they render as links.

### Block ids

`^id` at the end of a block (letters, digits and `-`, after a space) becomes its `id="^id"`, so `[[Page#^id]]` links to it. The marker itself isn't shown.

```md
A paragraph you can link to. ^intro

- a list item ^first

| a table |
| ------- |

^table
```

- **Paragraphs:** `text ^id`, at the end of the paragraph's last line.
- **List items:** `- item ^id` puts the id on the `<li>`.
- **Other blocks:** a paragraph that is only `^id`, after a blank line, names the block before it: a table, list, quote or callout. Callouts also take `^id` at the end of the title line.

Comments, highlights and wikilinks work in paragraphs, headings, table cells, list items, and callout titles and bodies. Code and math keep them literally.

## Markup

The HTML below is the plugin's public contract: it only changes in a major version.

```html
<div class="callout" data-callout="note">
  <div class="callout-title">
    <div class="callout-icon"><svg class="lucide lucide-…">…</svg></div>
    <div class="callout-title-inner">Title</div>
  </div>
  <div class="callout-content">Body</div>
</div>
<span class="highlight">highlighted</span>
<a href="/Page#heading" class="internal-link">Page > Heading</a>
<img src="/cat.png" alt="cat.png" width="300" />
<div class="internal-embed" data-src="Note#Heading">…the note…</div>
<p id="^intro">A paragraph you can link to.</p>
```

A callout with a fold marker (`[!faq]-` or `[!faq]+`) is the same, with `<details>` and `<summary>` in place of the outer two `<div>`s and a fold icon at the end of the title:

```html
<details class="callout" data-callout="faq" data-callout-fold="+" open>
  <summary class="callout-title">
    <div class="callout-icon"><svg class="lucide lucide-…">…</svg></div>
    <div class="callout-title-inner">Title</div>
    <div class="callout-fold">
      <svg class="lucide lucide-chevron-down">…</svg>
    </div>
  </summary>
  <div class="callout-content">Body</div>
</details>
```

- **`data-callout`:** the type, lowercased, as written (an alias stays an alias: `[!hint]` gives `data-callout="hint"`).
- **`data-callout-fold`:** `-` or `+`, only on foldable callouts; `+` also sets `open`.
- **`callout-content`:** left out when the callout has no body.
- **Icons:** Lucide SVGs with `aria-hidden="true"`; their paths may change with Lucide updates.

Upgrading from 1.x: CSS that selects `[callout="…"]` must change to `[data-callout="…"]`, the title no longer carries Tailwind's `font-bold` (the stylesheet sets `--callout-title-weight: 600`), and callouts with a fold marker are `<details>` instead of `<div>`.

## Styling

Import the stylesheet once, for example from your global CSS:

```css
@import "@heavycircle/remark-obsidian/obsidian.css";
```

It works out of the box with the colors of Obsidian's default theme. To theme it, set any of these custom properties; yours always win.

| Property                                                                                                                                                        | Default                  |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| `--callout-note`, `--callout-info`, `--callout-todo`, `--callout-default`                                                                                       | `8, 109, 221`            |
| `--callout-summary`, `--callout-tip`                                                                                                                            | `0, 191, 188`            |
| `--callout-success`                                                                                                                                             | `8, 185, 78`             |
| `--callout-question`, `--callout-warning`                                                                                                                       | `236, 117, 0`            |
| `--callout-fail`, `--callout-error`, `--callout-bug`                                                                                                            | `233, 49, 71`            |
| `--callout-example`                                                                                                                                             | `120, 82, 238`           |
| `--callout-quote`                                                                                                                                               | `158, 158, 158`          |
| `--callout-padding`                                                                                                                                             | `12px 12px 12px 24px`    |
| `--callout-radius`                                                                                                                                              | `4px`                    |
| `--callout-border-width`, `--callout-border-opacity`                                                                                                            | `0px`, `0.25`            |
| `--callout-title-weight`                                                                                                                                        | `600`                    |
| `--callout-title-color`, `--callout-title-size`, `--callout-title-padding`, `--callout-content-padding`, `--callout-content-background`, `--callout-blend-mode` | inherit or none          |
| `--text-highlight-bg`                                                                                                                                           | `rgba(255, 208, 0, 0.4)` |

Colors are `r, g, b` triplets. Callout types are selected with `.callout[data-callout="tip"]`.

## API

The default export is `remarkObsidian`, which takes an optional `options` object.

```js
unified().use(remarkObsidian, options);
```

Types are included (`Plugin<[Options?], Root>`, plus the `Options`, `CalloutDefinition`, `IconNode`, `Page` and `EmbedTarget` types).

### `options.callouts`

Adds, overrides, aliases or turns off callout types. Keys are type names (letters, digits and `_`, case-insensitive).

```js
import { FlaskConical } from "lucide";

unified().use(remarkObsidian, {
  callouts: {
    lab: { icon: FlaskConical, title: "Lab" }, // a new type
    tip: { title: "Pro tip" }, // override a built-in; its aliases follow
    experiment: "lab", // an alias of any type, built-in or custom
    quote: false, // turn a built-in type (and its aliases) off
  },
});
```

- **`icon`:** a [Lucide](https://lucide.dev/guide/packages/lucide) icon node from the `lucide` package, rendered like the built-in icons, or a hast `<svg>` element, used as given. Raw SVG strings aren't accepted, since they would need raw HTML. An override keeps the built-in icon unless you set one; a new type defaults to the note icon, as in Obsidian.
- **`title`:** the title of callouts that don't write one. Without it, the title is the type name as written (`[!lab]` gives "Lab").
- **Aliases** behave like the built-in ones: `[!experiment]` gets lab's icon but keeps `data-callout="experiment"` and its own default title.

Invalid options (a bad name, a raw SVG string, an alias to an unknown type or an alias cycle) throw a `TypeError` when the processor is set up.

Give a new type a color with its `data-callout` selector, one per name or alias:

```css
.callout[data-callout="lab"],
.callout[data-callout="experiment"] {
  --callout-color: 0, 150, 136;
}
```

### `options.pages`

`Array<string | { path, aliases? }>`. The vault's files, notes and attachments, as paths from its root. With it, links resolve the way Obsidian resolves them:

1. **Exact path:** `[[Projects/Alpha]]` matches `Projects/Alpha.md`.
2. **Name or path suffix:** `[[Alpha]]` matches `Alpha.md` in any folder, and `[[2024/Alpha]]` one in a `2024` folder. With several matches, the one closest to the vault root wins.
3. **Alias:** `[[Ada]]` matches a page listing `"Ada"` in `aliases`.

Matching is case-insensitive and `.md` is optional. An unresolved link renders as its text, without a link, and an unresolved image embed stays as typed.

```js
import { glob } from "node:fs/promises"; // Node 22+

const pages = [];
for await (const path of glob("**/*.{md,png,jpg}", { cwd: "vault" }))
  pages.push(path);

unified().use(remarkObsidian, { pages });
```

Pass `{ path: "People/Ada Lovelace.md", aliases: ["Ada"] }` for pages with frontmatter aliases. Links relative to the current note (`[[../Page]]`) aren't supported.

### `options.url`

`(path: string) => string | null`. Turns a resolved path (from `pages`, or the link text without them) into a URL; the plugin appends the `#heading` or `#^id` part. Return `null` to render that link as plain text.

```js
unified().use(remarkObsidian, {
  pages,
  url: (path) =>
    `/notes/${path.replace(/\.md$/, "").toLowerCase().replaceAll(" ", "-")}`,
});
```

### `options.embed`

`({ page, path, heading, block }) => Root | RootContent[] | null`. Returns the mdast of an embedded note. `page` is the name as written and `path` what it resolved to (`heading` is the last heading of `![[Note#A#B]]`, `block` the id of `![[Note#^id]]`, without `^`). Return nothing to render that embed as a link.

```js
unified().use(remarkObsidian, {
  embed: ({ path }) =>
    unified()
      .use(remarkParse)
      .parse(readFileSync(`vault/${path}`, "utf8")),
});
```

The plugin renders the content like the rest of the page: callouts, comments, highlights and wikilinks work in it. Embeds inside an embedded note stay links, so a note that embeds itself can't loop. Cutting the note down to the heading or block is up to you.

## Security

The plugin adds trusted markup only: callout wrappers, classes, links and its own icon SVGs, all as syntax tree nodes rather than raw HTML. Text from the Markdown, including inside highlights and wikilinks, stays escaped. Default wikilink URLs are always paths (`[[javascript:x]]` links to `/javascript%3Ax`); URLs from your `url` and content from your `embed` are trusted as given.

If you render untrusted Markdown with `allowDangerousHtml` or rehype-raw, raw HTML written in the Markdown itself passes through. Run [rehype-sanitize](https://github.com/rehypejs/rehype-sanitize) last. Its default schema strips the callout classes and the icons, so allow those:

```js
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";

const schema = {
  ...defaultSchema,
  tagNames: [...defaultSchema.tagNames, "svg", "path", "rect", "circle"],
  attributes: {
    ...defaultSchema.attributes,
    div: ["className", "dataCallout", "dataCalloutFold", "dataSrc"],
    a: [
      ["className", "internal-link", "data-footnote-backref"],
      ...defaultSchema.attributes.a,
    ],
    details: ["className", "dataCallout", "dataCalloutFold", "open"],
    summary: ["className"],
    span: ["className"],
    svg: [
      ...["xmlns", "width", "height", "viewBox", "fill", "stroke"],
      ...["strokeWidth", "strokeLinecap", "strokeLinejoin"],
      ...["className", "ariaHidden"],
    ],
    path: ["d"],
    rect: ["width", "height", "x", "y", "rx", "ry"],
    circle: ["cx", "cy", "r"],
  },
};
```

A custom hast icon that uses other elements or attributes needs them in the schema too. rehype-sanitize also prefixes every `id` with `user-content-` against DOM clobbering, so block ids become `user-content-^id` and `[[#^id]]` links need the same prefix (GitHub fixes them up with a script).

The icons are Lucide icons ([ISC](https://github.com/lucide-icons/lucide/blob/main/LICENSE)); the notice is in `icons.js`.

## Compatibility

- **Node.js:** 20 or newer, ESM only.
- **Ecosystem:** unified 11 and the remark and rehype versions that go with it (remark-parse 11, remark-rehype 11).
- **CI:** tested on Node 20, 22 and 24.

## Contributing

```sh
bun install
bun run check   # format check, lint, type check, tests
bun run format  # fix formatting
```

Releases are published from GitHub: bump `version` in `package.json`, merge, then publish a GitHub release tagged `vX.Y.Z`. The release workflow runs CI and publishes to npm with provenance.

## License

[MIT](LICENSE) © heavycircle
