import { describe, expect, test } from "bun:test";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
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
      .use(remarkRehype)
      .use(rehypeStringify)
      .processSync(md),
  ).replace(/<svg[\s\S]*?<\/svg>/g, "<svg/>");
};

const FLAME =
  '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-flame" aria-hidden="true"><path d="M12 3q1 4 4 6.5t3 5.5a1 1 0 0 1-14 0 5 5 0 0 1 1-3 1 1 0 0 0 5 0c0-2-1.5-3-1.5-5q0-2 2.5-4"></path></svg>';

const title = (html) => html.match(/callout-title-inner">(.*?)<\/div>/)?.[1];
const content = (html) =>
  html.match(/callout-content">([\s\S]*)<\/div><\/div>$/)?.[1];

describe("callouts", () => {
  test("[!type] with a title and body", () => {
    const html = render("> [!warning] Careful\n> Body text");
    expect(html).toStartWith('<div class="callout" data-callout="warning">');
    expect(html).toContain('<div class="callout-icon"><svg/></div>');
    expect(title(html)).toBe("Careful");
    expect(content(html)).toBe("Body text");
  });

  test("icons are inline SVG without raw HTML (#7)", () => {
    const html = String(
      unified()
        .use(remarkParse)
        .use(remarkObsidian)
        .use(remarkRehype)
        .use(rehypeStringify)
        .processSync("> [!tip] Hi"),
    );
    expect(html).toContain(`<div class="callout-icon">${FLAME}</div>`);
  });

  test("icons survive rehype-raw (react-markdown setups)", () => {
    const html = String(
      unified()
        .use(remarkParse)
        .use(remarkObsidian)
        .use(remarkRehype, { allowDangerousHtml: true })
        .use(rehypeRaw)
        .use(rehypeStringify)
        .processSync("> [!tip] Hi"),
    );
    expect(html).toContain(`<div class="callout-icon">${FLAME}</div>`);
  });

  test("markup matches the README's contract (#8)", () => {
    expect(render("> [!faq] Title\n> Body")).toBe(
      '<div class="callout" data-callout="faq">' +
        '<div class="callout-title"><div class="callout-icon"><svg/></div>' +
        '<div class="callout-title-inner">Title</div></div>' +
        '<div class="callout-content">Body</div></div>',
    );
  });

  test("[!type]- renders a folded <details> (#9)", () => {
    expect(render("> [!faq]- Title\n> Body")).toBe(
      '<details class="callout" data-callout="faq" data-callout-fold="-">' +
        '<summary class="callout-title"><div class="callout-icon"><svg/></div>' +
        '<div class="callout-title-inner">Title</div>' +
        '<div class="callout-fold"><svg/></div></summary>' +
        '<div class="callout-content">Body</div></details>',
    );
  });

  test("[!type]+ renders an open <details>", () => {
    expect(render("> [!faq]+ Title\n> Body")).toStartWith(
      '<details class="callout" data-callout="faq" data-callout-fold="+" open>' +
        '<summary class="callout-title">',
    );
  });

  test("a foldable callout without a body is just its summary", () => {
    expect(render("> [!faq]-")).toMatch(
      /^<details [^>]*><summary [^>]*>.*<\/summary><\/details>$/,
    );
  });

  test("callouts without a fold marker have no <details> or fold icon", () => {
    const html = render("> [!faq] Plain\n> Body");
    expect(html).not.toContain("details");
    expect(html).not.toContain("callout-fold");
  });

  test("callouts and icons survive rehype-sanitize with the README's schema", () => {
    const schema = {
      ...defaultSchema,
      tagNames: [...defaultSchema.tagNames, "svg", "path", "rect", "circle"],
      attributes: {
        ...defaultSchema.attributes,
        div: ["className", "dataCallout", "dataCalloutFold"],
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
    const html = String(
      unified()
        .use(remarkParse)
        .use(remarkObsidian)
        .use(remarkRehype)
        .use(rehypeSanitize, schema)
        .use(rehypeStringify)
        .processSync("> [!tip]+ Hi\n> ==hl=="),
    );
    expect(html).toStartWith(
      '<details class="callout" data-callout="tip" data-callout-fold="+" open>',
    );
    expect(html).toContain('<summary class="callout-title">');
    expect(html).toContain('class="lucide lucide-chevron-down"');
    expect(html).toContain(FLAME);
    expect(html).toContain('<span class="highlight">hl</span>');
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
    expect(html).toContain('data-callout="note"');
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
    expect(html).toContain('data-callout="tip"');
  });

  test("a callout inside a list item", () => {
    expect(render("- > [!bug] In a list\n  > body")).toContain(
      'data-callout="bug"',
    );
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

  test("may wrap several paragraphs (#6)", () => {
    const md = "before\n\n%%\nhidden one\n\nhidden two\n%%\n\nafter";
    expect(render(md)).toBe("<p>before</p>\n<p>after</p>");
    expect(render(md, { breaks: false })).toBe("<p>before</p>\n<p>after</p>");
  });

  test("keep the text before the opener and after the closer", () => {
    expect(render("kept %%\nhidden\n\nhidden %% also kept")).toBe(
      "<p>kept</p>\n<p>also kept</p>",
    );
  });

  test("may wrap lists and code blocks", () => {
    expect(render("%%\n\n- a\n\n```\ncode\n```\n\n%%\n\nafter")).toBe(
      "<p>after</p>",
    );
  });

  test("a closer right after a list hides the list", () => {
    expect(render("%%\n- a\n- b\n%%\n\nafter")).toBe("<p>after</p>");
  });

  test("comments after a block closer still pair", () => {
    expect(render("%%\nhidden\n\n%% kept %%x%% too")).toBe("<p>kept  too</p>");
  });

  test("may wrap paragraphs in a callout body", () => {
    const html = render(
      "> [!note]\n> shown\n>\n> %%\n> hidden\n>\n> hidden\n> %%",
    );
    expect(content(html)).toContain("shown");
    expect(html).not.toContain("hidden");
    expect(html).not.toContain("%%");
  });

  test("an unclosed marker across paragraphs is left as typed", () => {
    expect(render("%%\none\n\ntwo")).toContain("%%");
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
