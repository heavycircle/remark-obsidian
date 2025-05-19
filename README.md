# remark-obsidian

A [remark](https://github.com/remarkjs/remark) plugin to extend support to [Obsidian](https://obsidian.md/)-flavored Markdown.

## Contents

- [What is this?](#what-is-this)
- [Install](#install)
- [Use](#use)
- [API](#api)
- [Security](#security)
- [License](#license)

## What is this?

This package is a [unified](unified) ([remark](https://github.com/remarkjs/remark)) package that extends Markdown to support [Obsidian flavors](https://help.obsidian.md/Editing+and+formatting/Obsidian+Flavored+Markdown).

The list of Supported Obsidian Markdown items are:

| **Syntax**      | **Description**  |
| --------------- | ---------------- |
| `[[Link]]`      | Internal Links   |
| `![[Link]]`     | Embed Files      |
| `![[Link#^id]]` | Block References |
| `^id`           | Defining a Block |
| `%%Text%%`      | Comments         |
| `~~Text~~`      | Strikethroughs   |
| `==Text==`      | Highlights       |
| ` ``` `         | Code Blocks      |
| `- [ ]`         | Incomplete Task  |
| `- [x]`         | Completed Task   |
| `[!note]`       | Callouts         |

_Obsidian's website notes that not all these are fully Obsidian-specific. The main reason I wrote this plugin is for Link and Callout support_.

## Install

This package is [ESM only](https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c). In Node.js (version 16+), install using [`npm`](https://docs.npmjs.com/cli/install):

```bash
npm install @heavycircle/remark-obsidian
```

## Use

Most definitions are self-explanatory from the above table. However, it is worth mentioning the various Callout syntaxes available.

Use the [Obsidian Callouts](https://help.obsidian.md/Editing+and+formatting/Callouts) guide for further instruction.

This plugin is best used with [remark-gfm](https://www.npmjs.com/package/remark-gfm), [rehype-raw](https://www.npmjs.com/package/rehype-raw), and [remark-wiki-link-plus](https://www.npmjs.com/package/remark-wiki-link-plus).

## API

This package exports no identifiers. The default export is `remarkObsidian`.

#### `unified().use(remarkObsidian)`

Provides support for Obsidian-flavored Markdown, including tables, callouts, links, embeds, and more.

To get full use of the package, ensure you include Obsidian-compliant variables. Then, import the CSS file inside the `global.css` file:

```css
@import "@heavycircle/remark-obsidian/obsidian.module.css";
```

###### Parameters

There are no parameters.

###### Returns

Transform ([`Transformer`](https://github.com/unifiedjs/unified#transformer)).

# Security

Use of remark-videos does not involve [rehype](https://github.com/rehypejs/rehype) ([hast](https://github.com/syntax-tree/hast)) or user content so there are no openings for [cross-site scripting (XSS)](https://en.wikipedia.org/wiki/Cross-site_scripting) attacks.


# License

[MIT](LICENSE) &copy; heavycircle
