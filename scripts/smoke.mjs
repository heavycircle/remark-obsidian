// Run against the packed tarball, installed like a user would: proves the
// published files, the exports map and the Node versions all work.
import remarkObsidian from "@heavycircle/remark-obsidian";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import rehypeStringify from "rehype-stringify";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";

const html = String(
  unified()
    .use(remarkParse)
    .use(remarkObsidian)
    .use(remarkRehype)
    .use(rehypeStringify)
    .processSync("> [!tip] Hello\n> body ==hl== %%gone%%"),
);

const expect = (ok, what) => {
  if (!ok) throw new Error(`smoke test failed: ${what}\n${html}`);
};
expect(html.includes('callout="tip"'), "callout rendered");
expect(html.includes('class="lucide lucide-flame"'), "icon without raw HTML");
expect(html.includes('<span class="highlight">hl</span>'), "highlight");
expect(!html.includes("gone"), "comment removed");

const css = createRequire(import.meta.url).resolve(
  "@heavycircle/remark-obsidian/obsidian.css",
);
expect(readFileSync(css, "utf8").includes(".callout"), "CSS export");

console.log(`ok on Node ${process.version}`);
