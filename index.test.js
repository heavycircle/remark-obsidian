import { describe, expect, test } from "bun:test";
import rehypeRaw from "rehype-raw";
import rehypeStringify from "rehype-stringify";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import remarkObsidian from "./index.js";

// The pipeline the README recommends; `breaks: false` drops remark-breaks
const render = (md, { breaks = true } = {}) => {
  const processor = unified().use(remarkParse);
  if (breaks) processor.use(remarkBreaks);
  return String(
    processor
      .use(remarkGfm)
      .use(remarkObsidian)
      .use(remarkRehype, { allowDangerousHtml: true })
      .use(rehypeRaw)
      .use(rehypeStringify)
      .processSync(md),
  ).replace(/<svg[\s\S]*?<\/svg>/g, "<svg/>");
};

const title = (html) => html.match(/callout-title-inner">(.*?)<\/div>/)?.[1];
const content = (html) =>
  html.match(/callout-content">([\s\S]*)<\/div><\/div>$/)?.[1];

describe("callouts", () => {
  test("[!type] with a title and body", () => {
    const html = render("> [!warning] Careful\n> Body text");
    expect(html).toStartWith('<div class="callout" callout="warning">');
    expect(html).toContain('<div class="callout-icon"><svg/></div>');
    expect(title(html)).toBe("Careful");
    expect(content(html)).toBe("Body text");
  });

  test("no title: named after the type", () => {
    expect(title(render("> [!tip]\n> Body"))).toBe("Tip");
  });

  test("no title and no body: still named after the type", () => {
    const html = render("> [!tip]");
    expect(title(html)).toBe("Tip");
    expect(html).not.toContain("callout-content");
  });

  test("no title, body after a blank line", () => {
    const html = render("> [!tip]\n>\n> Body");
    expect(title(html)).toBe("Tip");
    expect(content(html)).toBe("<p>Body</p>");
  });

  test("formatting in the title is kept", () => {
    expect(title(render("> [!note] With **bold**\n> Body"))).toBe(
      "With <strong>bold</strong>",
    );
  });

  test("types are case-insensitive (GitHub-style [!NOTE])", () => {
    const html = render("> [!NOTE]\n> Body");
    expect(html).toContain('callout="note"');
    expect(title(html)).toBe("Note");
  });

  test("fold markers are exposed, not shown in the title", () => {
    const folded = render("> [!faq]- Folded\n> Body");
    expect(title(folded)).toBe("Folded");
    expect(folded).toContain('data-callout-fold="-"');
    expect(render("> [!faq]+ Open\n> Body")).toContain('data-callout-fold="+"');
    expect(render("> [!faq] Plain\n> Body")).not.toContain("data-callout-fold");
  });

  test("a body with several paragraphs and a list", () => {
    const html = content(render("> [!info] T\n> one\n>\n> two\n>\n> - item"));
    expect(html).toContain("one");
    expect(html).toContain("<p>two</p>");
    expect(html).toContain("<li>item</li>");
  });

  test("nested callouts", () => {
    const html = render("> [!note] Outer\n> > [!tip] Inner\n> > body");
    expect(html.match(/class="callout"/g)).toHaveLength(2);
    expect(html).toContain('callout="tip"');
  });

  test("a callout inside a list item", () => {
    expect(render("- > [!bug] In a list\n  > body")).toContain('callout="bug"');
  });

  test("without remark-breaks the body is kept", () => {
    const html = render("> [!note] Title\n> body\n> more", { breaks: false });
    expect(title(html)).toBe("Title");
    expect(content(html)).toBe("body\nmore");
  });

  test("comments and highlights work in the title and body", () => {
    const html = render("> [!note] ==Hot== title %%x%%\n> body ==hl== %%y%%");
    expect(title(html)).toBe('<span class="highlight">Hot</span> title ');
    expect(content(html)).toBe('body <span class="highlight">hl</span> ');
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
      const html = render(md);
      expect(html).toStartWith("<blockquote>");
      expect(html).not.toContain("callout");
    });
});

describe("comments", () => {
  test("are removed", () => {
    expect(render("a %%hidden%% b")).toBe("<p>a  b</p>");
  });

  test("text between two comments is kept", () => {
    expect(render("a %%one%% kept %%two%% b")).toBe("<p>a  kept  b</p>");
  });

  test("may contain any character, including =", () => {
    expect(render("%%a=b%% c")).toBe("<p> c</p>");
  });

  test("may span formatting", () => {
    expect(render("a %%**bold** text%% b")).toBe("<p>a  b</p>");
  });

  test("may span lines; a comment-only paragraph disappears", () => {
    expect(render("before\n\n%%\nmulti\nline\n%%\n\nafter")).toBe(
      "<p>before</p>\n<p>after</p>",
    );
    expect(render("%%\nmulti\n%%", { breaks: false })).toBe("");
  });

  test("work in headings and table cells", () => {
    expect(render("# Title %%x%%")).toBe("<h1>Title </h1>");
    expect(render("| a |\n|---|\n| b %%x%% |")).toContain("<td>b </td>");
  });

  test("code keeps them literally", () => {
    expect(render("`%%x%%`")).toBe("<p><code>%%x%%</code></p>");
    expect(render("```\n%%x%%\n```")).toContain("%%x%%");
  });

  test("an unclosed marker is left as typed", () => {
    expect(render("a %%b")).toBe("<p>a %%b</p>");
  });
});

describe("highlights", () => {
  test("render as span.highlight", () => {
    expect(render("a ==hl== b")).toBe(
      '<p>a <span class="highlight">hl</span> b</p>',
    );
  });

  test("several in one line", () => {
    expect(render("==a== and ==b==").match(/class="highlight"/g)).toHaveLength(
      2,
    );
  });

  test("escaped HTML inside stays escaped (no XSS)", () => {
    const html = render("==&lt;img src=x onerror=alert(1)&gt;==");
    expect(html).not.toMatch(/<img/);
    expect(html).toContain("&#x3C;img");
  });

  test("may span formatting", () => {
    expect(render("==**bold** text==")).toBe(
      '<p><span class="highlight"><strong>bold</strong> text</span></p>',
    );
  });

  test("work in headings and table cells", () => {
    expect(render("## A ==b==")).toBe(
      '<h2>A <span class="highlight">b</span></h2>',
    );
    expect(render("| a |\n|---|\n| ==b== |")).toContain(
      '<td><span class="highlight">b</span></td>',
    );
  });

  test("an empty pair or an unclosed marker is left as typed", () => {
    expect(render("====")).toBe("<p>====</p>");
    expect(render("a ==b")).toBe("<p>a ==b</p>");
    expect(render("a ==== b ==c==")).toBe(
      '<p>a ==== b <span class="highlight">c</span></p>',
    );
  });

  test("code keeps them literally", () => {
    expect(render("`==x==`")).toBe("<p><code>==x==</code></p>");
  });
});
