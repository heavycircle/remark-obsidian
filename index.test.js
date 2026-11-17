import { describe, expect, test } from "bun:test";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { FlaskConical } from "lucide";
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
    const html = String(
      unified()
        .use(remarkParse)
        .use(remarkObsidian)
        .use(remarkRehype)
        .use(rehypeSanitize, schema)
        .use(rehypeStringify)
        .processSync(
          "> [!tip]+ Hi\n> ==hl== [[Page#Top|link]] ![[cat.png|30]]",
        ),
    );
    expect(html).toStartWith(
      '<details class="callout" data-callout="tip" data-callout-fold="+" open>',
    );
    expect(html).toContain('<summary class="callout-title">');
    expect(html).toContain('class="lucide lucide-chevron-down"');
    expect(html).toContain(FLAME);
    expect(html).toContain('<span class="highlight">hl</span>');
    expect(html).toContain(
      '<a href="/Page#top" class="internal-link">link</a>',
    );
    expect(html).toContain('<img src="/cat.png" alt="cat.png" width="30">');
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

describe("options (#10)", () => {
  const withOptions = (options, md) =>
    String(
      unified()
        .use(remarkParse)
        .use(remarkObsidian, options)
        .use(remarkRehype)
        .use(rehypeStringify)
        .processSync(md),
    );
  const icon = (html) => html.match(/callout-icon">(<svg[\s\S]*?<\/svg>)/)?.[1];
  const builtIn = (md) => icon(withOptions(undefined, md));
  const lab = { icon: FlaskConical, title: "Lab" };

  test("a new type with a Lucide icon and a default title", () => {
    const html = withOptions({ callouts: { lab } }, "> [!lab]\n> Body");
    expect(html).toStartWith('<div class="callout" data-callout="lab">');
    expect(title(html)).toBe("Lab");
    expect(icon(html)).toStartWith('<svg xmlns="http://www.w3.org/2000/svg"');
    expect(icon(html)).toContain('class="lucide"');
    expect(icon(html)).toContain('<path d="M6.453 15h11.094"></path>');
    expect(title(withOptions({ callouts: { lab } }, "> [!lab] Mine"))).toBe(
      "Mine",
    );
  });

  test("a new type without an icon gets the pencil, titled by its name", () => {
    const html = withOptions({ callouts: { lab: {} } }, "> [!lab]");
    expect(icon(html)).toBe(builtIn("> [!note]"));
    expect(title(html)).toBe("Lab");
  });

  test("type names are case-insensitive", () => {
    const html = withOptions({ callouts: { LAB: lab } }, "> [!Lab]");
    expect(html).toContain('data-callout="lab"');
  });

  test("overriding a built-in changes its aliases too", () => {
    const options = { callouts: { tip: { icon: FlaskConical } } };
    for (const type of ["tip", "hint", "important"])
      expect(icon(withOptions(options, `> [!${type}]`))).toContain("M6.453");
  });

  test("overriding only the title keeps the icon", () => {
    const html = withOptions(
      { callouts: { tip: { title: "Pro tip" } } },
      "> [!tip]",
    );
    expect(title(html)).toBe("Pro tip");
    expect(icon(html)).toBe(builtIn("> [!tip]"));
    expect(
      title(
        withOptions({ callouts: { tip: { title: "Pro tip" } } }, "> [!hint]"),
      ),
    ).toBe("Hint");
  });

  test("aliases, including chains and types defined later", () => {
    const options = {
      callouts: { trial: "experiment", experiment: "lab", lab },
    };
    const html = withOptions(options, "> [!trial]");
    expect(html).toContain('data-callout="trial"');
    expect(title(html)).toBe("Trial");
    expect(icon(html)).toContain("M6.453");
    expect(
      icon(withOptions({ callouts: { note2: "note" } }, "> [!note2]")),
    ).toBe(builtIn("> [!note]"));
  });

  test("false turns a built-in type off, with its aliases", () => {
    const options = { callouts: { quote: false } };
    expect(withOptions(options, "> [!quote] Hi")).toStartWith("<blockquote>");
    expect(withOptions(options, "> [!cite] Hi")).toStartWith("<blockquote>");
    expect(withOptions(options, "> [!tip] Hi")).toContain('data-callout="tip"');
  });

  test("a hast element icon is used as given, fresh per callout", () => {
    const svg = {
      type: "element",
      tagName: "svg",
      properties: { viewBox: "0 0 24 24", className: ["mine"] },
      children: [
        {
          type: "element",
          tagName: "circle",
          properties: { r: 5 },
          children: [],
        },
      ],
    };
    const html = withOptions(
      { callouts: { lab: { icon: svg } } },
      "> [!lab] a\n\n> [!lab] b",
    );
    expect(
      html.match(
        /<svg viewBox="0 0 24 24" class="mine"><circle r="5"><\/circle><\/svg>/g,
      ),
    ).toHaveLength(2);
    expect(svg.properties.className).toEqual(["mine"]);
  });

  test("bad options throw a TypeError when the plugin is set up", () => {
    const cases = {
      "may only use letters": { "my-type": {} },
      "must be a Lucide icon node or a hast element": {
        lab: { icon: "<svg></svg>" },
      },
      "is not a Lucide icon node": { lab: { icon: ["path"] } },
      "title must be a string": { lab: { title: 1 } },
      "must be an object": { lab: true },
      "aliases unknown type": { lab: "nope" },
      "alias cycle": { a: "b", b: "a" },
    };
    for (const [message, callouts] of Object.entries(cases))
      expect(() => withOptions({ callouts }, "x")).toThrow(message);
    expect(() =>
      withOptions({ callouts: { tip: false, x: "tip" } }, "x"),
    ).toThrow("aliases unknown type");
  });
});

describe("wikilinks (#11)", () => {
  const withOptions = (options, md) =>
    String(
      unified()
        .use(remarkParse)
        .use(remarkGfm)
        .use(remarkObsidian, options)
        .use(remarkRehype)
        .use(rehypeStringify)
        .processSync(md),
    );
  const link = (href, text) =>
    `<a href="${href}" class="internal-link">${text}</a>`;

  test("[[page]] links to /page, URL-encoded, without pages", () => {
    expect(render("[[My Note]]")).toBe(
      `<p>${link("/My%20Note", "My Note")}</p>`,
    );
  });

  test("default URLs are paths, so a page name can't be a scheme", () => {
    expect(render("[[javascript:alert(1)]]")).toContain(
      'href="/javascript%3Aalert(1)"',
    );
    expect(render("![[javascript:x.png]]")).toContain(
      'src="/javascript%3Ax.png"',
    );
    expect(render("[[folder/a b?]]")).toContain('href="/folder/a%20b%3F"');
  });

  test("[[page|alias]] shows the alias", () => {
    expect(render("[[page|Shown]]")).toBe(`<p>${link("/page", "Shown")}</p>`);
  });

  test("headings link to rehype-slug's id; nested headings use the last", () => {
    expect(render("[[page#Some Heading!]]")).toBe(
      `<p>${link("/page#some-heading", "page > Some Heading!")}</p>`,
    );
    expect(render("[[page#One#Two]]")).toContain(
      link("/page#two", "page > One > Two"),
    );
    expect(render("[[#Local]]")).toBe(`<p>${link("#local", "Local")}</p>`);
  });

  test("[[page#^id]] links to a block", () => {
    expect(render("[[page#^abc]]")).toBe(
      `<p>${link("/page#%5Eabc", "page > ^abc")}</p>`,
    );
  });

  test("url maps paths to URLs; null leaves plain text", () => {
    const url = (path) => (path === "A" ? "/notes/a" : null);
    expect(withOptions({ url }, "[[A#Top]] [[B|bee]]")).toBe(
      `<p>${link("/notes/a#top", "A > Top")} bee</p>`,
    );
  });

  test("several in a line, around formatting, comments and highlights", () => {
    expect(render("**[[a]]** and ==[[b]]== %%[[c]]%%")).toBe(
      `<p><strong>${link("/a", "a")}</strong> and <span class="highlight">${link("/b", "b")}</span> </p>`,
    );
  });

  test("work in headings, lists, callouts and table cells (\\| for the alias)", () => {
    expect(render("# [[a]]")).toBe(`<h1>${link("/a", "a")}</h1>`);
    expect(render("- [[a]]")).toContain(`<li>${link("/a", "a")}</li>`);
    expect(content(render("> [!note]\n> [[a]]"))).toBe(link("/a", "a"));
    expect(render("| x |\n|---|\n| [[a\\|b]] |")).toContain(
      `<td>${link("/a", "b")}</td>`,
    );
  });

  test("code and existing links keep them literally", () => {
    expect(render("`[[a]]`")).toBe("<p><code>[[a]]</code></p>");
    expect(render("[x [[a]]](u)")).toBe('<p><a href="u">x [[a]]</a></p>');
  });

  test("half-typed or empty links are left as typed", () => {
    for (const md of ["[[a", "[[]]", "[[a]", "[[a|b"])
      expect(render(md)).toBe(`<p>${md}</p>`);
  });

  test("![[image]] embeds an image, with |alt or |width(xheight)", () => {
    expect(render("![[cat.png]]")).toBe(
      '<p><img src="/cat.png" alt="cat.png"></p>',
    );
    expect(render("![[cat.png|A cat]]")).toContain('alt="A cat"');
    expect(render("![[cat.png|300]]")).toContain('width="300"');
    expect(render("![[cat.png|300x200]]")).toContain(
      'alt="cat.png" width="300" height="200"',
    );
    expect(withOptions({ url: (p) => `/img/${p}` }, "![[cat.png]]")).toContain(
      'src="/img/cat.png"',
    );
  });

  test("![[note]] is a link without an embed option", () => {
    expect(render("![[note#Part]]")).toBe(
      `<p>${link("/note#part", "note > Part")}</p>`,
    );
  });

  test("embed inserts a note's content, which the plugin then renders", () => {
    const targets = [];
    const embed = (target) => {
      targets.push(target);
      return unified().use(remarkParse).parse("> [!tip]\n> ==from== the note");
    };
    const html = withOptions({ embed }, "before\n\n![[note#^abc]]");
    expect(html).toStartWith(
      '<p>before</p>\n<div class="internal-embed" data-src="note#^abc"><div class="callout" data-callout="tip">',
    );
    expect(html).toContain('<span class="highlight">from</span> the note');
    expect(targets).toEqual([
      { page: "note", path: "note", heading: undefined, block: "abc" },
    ]);
  });

  test("an embed next to other text, or with no content, stays a link", () => {
    const embed = ({ page }) => (page === "empty" ? null : []);
    expect(withOptions({ embed }, "see ![[note]]")).toBe(
      `<p>see ${link("/note", "note")}</p>`,
    );
    expect(withOptions({ embed }, "![[empty]]")).toBe(
      `<p>${link("/empty", "empty")}</p>`,
    );
  });

  test("links in an embedded note work; its embeds stay links (no loops)", () => {
    const embed = () => unified().use(remarkParse).parse("![[self]] [[other]]");
    expect(withOptions({ embed }, "![[self]]")).toBe(
      `<div class="internal-embed" data-src="self"><p>${link("/self", "self")} ${link("/other", "other")}</p></div>`,
    );
  });

  test("url and embed must be functions", () => {
    expect(() => withOptions({ url: "/x" }, "x")).toThrow(
      "url must be a function",
    );
    expect(() => withOptions({ embed: {} }, "x")).toThrow(
      "embed must be a function",
    );
  });

  describe("pages: Obsidian's link resolution", () => {
    const pages = [
      "Projects/Alpha.md",
      "Archive/2024/Alpha.md",
      "Beta.md",
      "Notes/Beta.md",
      { path: "People/Ada Lovelace.md", aliases: ["Ada"] },
      "img/cat.png",
    ];
    const r = (md, extra) => withOptions({ pages, ...extra }, md);

    test("a name matches the page anywhere, case-insensitively, .md optional", () => {
      expect(r("[[alpha]] [[Alpha.md]]")).toBe(
        `<p>${link("/Projects/Alpha", "alpha")} ${link("/Projects/Alpha", "Alpha.md")}</p>`,
      );
    });

    test("the exact path wins, then the page closest to the root", () => {
      expect(r("[[Beta]]")).toContain(link("/Beta", "Beta"));
      expect(r("[[Notes/Beta]]")).toContain(link("/Notes/Beta", "Notes/Beta"));
    });

    test("a path suffix picks the page in that folder", () => {
      expect(r("[[2024/Alpha]]")).toContain(
        link("/Archive/2024/Alpha", "2024/Alpha"),
      );
      expect(r("[[Other/Alpha]]")).toBe("<p>Other/Alpha</p>");
    });

    test("aliases match too", () => {
      expect(r("[[ada#Early life]]")).toContain(
        link("/People/Ada%20Lovelace#early-life", "ada > Early life"),
      );
    });

    test("an unresolved link is plain text, an unresolved image stays as typed", () => {
      expect(r("[[Missing|shown]] ![[dog.png]]")).toBe(
        "<p>shown ![[dog.png]]</p>",
      );
    });

    test("attachments resolve for embeds", () => {
      expect(r("![[cat.png|20]]")).toBe(
        '<p><img src="/img/cat.png" alt="cat.png" width="20"></p>',
      );
    });

    test("url gets the matched path", () => {
      const url = (path) => `https://site.test/${path.replace(/\.md$/, "")}`;
      expect(r("[[alpha]]", { url })).toContain(
        'href="https://site.test/Projects/Alpha"',
      );
    });

    test("embed gets the page as typed and the matched path", () => {
      const seen = [];
      const embed = (target) => (seen.push(target), []);
      r("![[beta#^b1]]\n\n![[Missing]]", { embed });
      expect(seen).toEqual([
        { page: "beta", path: "Beta.md", heading: undefined, block: "b1" },
      ]);
    });

    test("bad page lists throw a TypeError when the plugin is set up", () => {
      for (const [message, bad] of Object.entries({
        "pages must be an array": "Alpha.md",
        "each page must be a path": [{ aliases: [] }],
        "must be strings": [{ path: "A.md", aliases: [1] }],
      }))
        expect(() => withOptions({ pages: bad }, "x")).toThrow(message);
    });
  });
});

describe("block ids (#11)", () => {
  test("text ^id gives the paragraph the id ^id", () => {
    expect(render("text ^abc")).toBe('<p id="^abc">text</p>');
    expect(render("one\ntwo ^x-1")).toBe('<p id="^x-1">one<br>\ntwo</p>');
    expect(render("one\ntwo ^x-1", { breaks: false })).toBe(
      '<p id="^x-1">one\ntwo</p>',
    );
  });

  test("^id on its own line in the paragraph still names it", () => {
    expect(render("line\n^own")).toBe('<p id="^own">line</p>');
  });

  test("in a list, the id goes on the item", () => {
    expect(render("- a ^i1\n- b")).toBe(
      '<ul>\n<li id="^i1">a</li>\n<li>b</li>\n</ul>',
    );
  });

  test("a paragraph that is only ^id names the block before it", () => {
    expect(render("| a |\n|---|\n| b |\n\n^tbl")).toStartWith(
      '<table id="^tbl">',
    );
    expect(render("> quote\n\n^q")).toStartWith('<blockquote id="^q">');
    expect(render("- a\n- b\n\n^list")).toStartWith('<ul id="^list">');
  });

  test("callouts keep their id, after the callout or at the end of the title", () => {
    expect(render("> [!note] T\n> body\n\n^co")).toStartWith(
      '<div class="callout" data-callout="note" id="^co">',
    );
    expect(render("> [!note] T ^t")).toStartWith(
      '<div class="callout" data-callout="note" id="^t">',
    );
    expect(title(render("> [!note] T ^t"))).toBe("T");
  });

  test("a trailing comment doesn't hide the id", () => {
    expect(render("text ^abc %%note%%")).toBe('<p id="^abc">text</p>');
  });

  test("not an id: no space before ^, nothing to name, or code", () => {
    expect(render("a^no")).toBe("<p>a^no</p>");
    expect(render("**b**^no")).toBe("<p><strong>b</strong>^no</p>");
    expect(render("^alone")).toBe("<p>^alone</p>");
    expect(render("a ^bad_id")).toBe("<p>a ^bad_id</p>");
    expect(render("```\nx ^no\n```")).toContain("x ^no");
  });

  test("[[#^id]] links to the block", () => {
    expect(render("text ^abc\n\n[[#^abc]]")).toBe(
      '<p id="^abc">text</p>\n<p><a href="#%5Eabc" class="internal-link">^abc</a></p>',
    );
  });
});
