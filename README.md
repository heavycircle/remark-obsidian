# remark-obsidian

[![CI](https://github.com/heavycircle/remark-obsidian/actions/workflows/ci.yml/badge.svg)](https://github.com/heavycircle/remark-obsidian/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@heavycircle/remark-obsidian)](https://www.npmjs.com/package/@heavycircle/remark-obsidian)

A [remark](https://github.com/remarkjs/remark) plugin for three pieces of [Obsidian-flavored Markdown](https://help.obsidian.md/Editing+and+formatting/Obsidian+Flavored+Markdown): callouts, comments, and highlights.

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

| Syntax            | Result                            |
| ----------------- | --------------------------------- |
| `> [!note] Title` | [Callouts](#callouts), with icons |
| `%%hidden%%`      | [Comments](#comments), removed    |
| `==highlighted==` | [Highlights](#highlights)         |

Other Obsidian syntax is covered by existing plugins:

| Syntax                         | Plugin                                                            |
| ------------------------------ | ----------------------------------------------------------------- |
| `~~strike~~`, tables, `- [ ]`  | [remark-gfm](https://github.com/remarkjs/remark-gfm)              |
| `[[Internal link]]`            | [remark-wiki-link](https://github.com/landakram/remark-wiki-link) |
| `$math$`                       | [remark-math](https://github.com/remarkjs/remark-math)            |
| Line breaks without two spaces | [remark-breaks](https://github.com/remarkjs/remark-breaks)        |

Embeds (`![[file]]`) and block references (`^id`) aren't supported.

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
- **Fold markers:** `[!faq]-` (folded) and `[!faq]+` (open) set `data-callout-fold="-"` or `"+"` on the callout. Folding itself is up to your CSS or JavaScript.
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

Comments and highlights work in paragraphs, headings, table cells, list items, and callout titles and bodies. Code and math keep them literally.

## Markup

The HTML below is the plugin's public contract: it only changes in a major version.

```html
<div class="callout" data-callout="faq" data-callout-fold="-">
  <div class="callout-title">
    <div class="callout-icon"><svg class="lucide lucide-…">…</svg></div>
    <div class="callout-title-inner">Title</div>
  </div>
  <div class="callout-content">Body</div>
</div>
<span class="highlight">highlighted</span>
```

- **`data-callout`:** the type, lowercased, as written (an alias stays an alias: `[!hint]` gives `data-callout="hint"`).
- **`data-callout-fold`:** `-` or `+`, only when the title has a fold marker.
- **`callout-content`:** left out when the callout has no body.
- **Icons:** Lucide SVGs with `aria-hidden="true"`; their paths may change with Lucide updates.

Upgrading from 1.x: CSS that selects `[callout="…"]` must change to `[data-callout="…"]`, and the title no longer carries Tailwind's `font-bold` (the stylesheet sets `--callout-title-weight: 600`).

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

The default export is `remarkObsidian`. It takes no options.

```js
unified().use(remarkObsidian);
```

Types are included (`Plugin<[], Root>` from unified and mdast).

## Security

The plugin adds trusted markup only: callout wrappers, classes, and its own icon SVGs, all as syntax tree nodes rather than raw HTML. Text from the Markdown, including inside highlights, stays escaped.

If you render untrusted Markdown with `allowDangerousHtml` or rehype-raw, raw HTML written in the Markdown itself passes through. Run [rehype-sanitize](https://github.com/rehypejs/rehype-sanitize) last. Its default schema strips the callout classes and the icons, so allow those:

```js
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";

const schema = {
  ...defaultSchema,
  tagNames: [...defaultSchema.tagNames, "svg", "path", "rect", "circle"],
  attributes: {
    ...defaultSchema.attributes,
    div: ["className", "dataCallout", "dataCalloutFold"],
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
