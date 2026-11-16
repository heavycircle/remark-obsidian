import { describe, expect, test } from "bun:test";
import remarkBreaks from "remark-breaks";
import remarkParse from "remark-parse";
import { unified } from "unified";
import remarkObsidian from "./index.js";

// remark-breaks first, as in real use: it turns each newline into the break
// node that separates a callout's title from its body
const run = (md) => {
  const processor = unified()
    .use(remarkParse)
    .use(remarkBreaks)
    .use(remarkObsidian);
  return processor.runSync(processor.parse(md));
};
const first = (md) => run(md).children[0];

describe("callouts", () => {
  test("[!type] with a title becomes a callout", () => {
    const node = first("> [!warning] Careful\n> Body text");
    expect(node.type).toBe("div");
    expect(node.data.hProperties).toEqual({
      className: "callout",
      callout: "warning",
    });
    const [title, content] = node.children;
    expect(title.children[1].children[0].value).toBe("Careful");
    expect(content.children.map((c) => c.value).join("")).toBe("Body text");
  });

  test("a callout with no title gets one from its type", () => {
    const title = first("> [!tip]\n> Body").children[0];
    expect(title.children[1].children[0].value).toBe("Tip");
  });

  test("types are case-insensitive (GitHub-style [!NOTE])", () => {
    expect(first("> [!NOTE]\n> Body").data.hProperties.callout).toBe("note");
  });
});

describe("quotes that aren't callouts stay blockquotes", () => {
  // Editors render on every keystroke; each of these used to throw
  const cases = {
    "an empty quote": ">",
    "a quote with only a space": "> ",
    "a quote that opens with code": "> `code` after",
    "a quote that opens with formatting": "> **bold** text",
    "a quote that opens with a list": "> - [!note] item",
    "an unknown type": "> [!warn] Title",
    "a one-letter type mid-typing": "> [!w]",
    "a plain quote": "> just a quote",
  };
  for (const [name, md] of Object.entries(cases))
    test(name, () => {
      expect(() => run(md)).not.toThrow();
      expect(first(md).type).toBe("blockquote");
    });
});
