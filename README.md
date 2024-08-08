# remark-obsidian

A [remark](https://github.com/remarkjs/remark) plugin to extend support to [Obsidian](https://obsidian.md/)-flavored Markdown.

## Contents

- [What is this?](#what-is-this)
- [Install](#install)
- [Use](#use)
- [API](#api)
- [License](#license)

## What is this?

This package extends Markdown to support [Obsidian flavors](https://help.obsidian.md/Editing+and+formatting/Obsidian+Flavored+Markdown).

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

In Node.js (version 16+), install using `npm`:

```bash
npm install @thecae/remark-obsidian
```

## Use

Most definitions are self-explanatory from the above table. However, it is worth mentioning the various Callout syntaxes available.

Use the [Obsidian Callouts](https://help.obsidian.md/Editing+and+formatting/Callouts) guide for further instruction.

## API

This package exports no identifiers. The default export is `remarkObsidian`.

#### `unified().use(remarkObsidian)`

Provides support for Obsidian-flavored Markdown, including tables, callouts, links, embeds, and more.

###### Parameters

There are no parameters.

###### Returns

Transform ([`Transformer`](https://github.com/unifiedjs/unified#transformer).

# License

[MIT](LICENSE) &copy; C. Ellis
