/**
 * @jest-environment node
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Markdown } from "../components/markdown";
import { parseInline, parseMarkdown, plainText, safeHref, splitRow } from "./markdown";

const html = (text) => renderToStaticMarkup(React.createElement(Markdown, { text }));

describe("inline Markdown", () => {
  it("reads bold, italics and code", () => {
    expect(parseInline("**ATF4** is *up* in `K562gwps`")).toEqual([
      { type: "strong", children: [{ type: "text", text: "ATF4" }] },
      { type: "text", text: " is " },
      { type: "em", children: [{ type: "text", text: "up" }] },
      { type: "text", text: " in " },
      { type: "code", text: "K562gwps" },
    ]);
    expect(parseInline("__bold__ and _soft_")).toEqual([
      { type: "strong", children: [{ type: "text", text: "bold" }] },
      { type: "text", text: " and " },
      { type: "em", children: [{ type: "text", text: "soft" }] },
    ]);
  });

  it("nests italics in bold", () => {
    expect(parseInline("**meta z *-21.4***")).toEqual([
      { type: "strong", children: [{ type: "text", text: "meta z " }, { type: "em", children: [{ type: "text", text: "-21.4" }] }] },
    ]);
  });

  it("leaves underscores in names, lone stars and unclosed marks alone", () => {
    expect(plainText(parseInline("non_targeting_1 and C1orf159_2"))).toBe("non_targeting_1 and C1orf159_2");
    expect(parseInline("non_targeting_1")).toEqual([{ type: "text", text: "non_targeting_1" }]);
    expect(parseInline("2 * 3 * 4")).toEqual([{ type: "text", text: "2 * 3 * 4" }]);
    expect(parseInline("**never closed")).toEqual([{ type: "text", text: "**never closed" }]);
    expect(parseInline("a `tick")).toEqual([{ type: "text", text: "a `tick" }]);
  });

  it("keeps Markdown inside code as it is", () => {
    expect(parseInline("`**x**`")).toEqual([{ type: "code", text: "**x**" }]);
  });

  it("honours a backslash", () => {
    expect(parseInline("\\*not italics\\*")).toEqual([{ type: "text", text: "*not italics*" }]);
  });

  it("links http and https only", () => {
    expect(parseInline("[the paper](https://doi.org/10.1126/science.aax4438)")).toEqual([
      { type: "link", href: "https://doi.org/10.1126/science.aax4438", children: [{ type: "text", text: "the paper" }] },
    ]);
    expect(parseInline("[click](javascript:alert(1))").some((node) => node.type === "link")).toBe(false);
    expect(parseInline("[x](data:text/html,boo)")).toEqual([{ type: "text", text: "x" }]);
    expect(parseInline("[page](/atlas?gene=ATF4)")).toEqual([{ type: "text", text: "page" }]);
    expect(safeHref("HTTPS://example.org/a b")).toBe("https://example.org/a%20b");
    expect(safeHref("ftp://example.org")).toBeNull();
    expect(safeHref("//example.org")).toBeNull();
    expect(safeHref(" javascript:alert(1)")).toBeNull();
  });

  it("links a bare address without the full stop after it", () => {
    expect(parseInline("See https://genesetr.uio.no/atlas.")).toEqual([
      { type: "text", text: "See " },
      { type: "link", href: "https://genesetr.uio.no/atlas", children: [{ type: "text", text: "https://genesetr.uio.no/atlas" }] },
      { type: "text", text: "." },
    ]);
    expect(parseInline("(https://example.org/a)")[1].href).toBe("https://example.org/a");
  });
});

describe("blocks", () => {
  it("splits paragraphs at blank lines and joins wrapped lines", () => {
    const blocks = parseMarkdown("First line\nsecond line.\n\nNext paragraph.");
    expect(blocks.map((block) => block.type)).toEqual(["paragraph", "paragraph"]);
    expect(plainText(blocks[0].children)).toBe("First line second line.");
  });

  it("reads bullet and numbered lists", () => {
    const blocks = parseMarkdown("Targets:\n- **DDIT3** down\n- ASNS down\n\n1. first\n2. second");
    expect(blocks.map((block) => block.type)).toEqual(["paragraph", "list", "list"]);
    expect(blocks[1].ordered).toBe(false);
    expect(blocks[1].items.map((item) => plainText(item.children))).toEqual(["DDIT3 down", "ASNS down"]);
    expect(blocks[2].ordered).toBe(true);
    expect(blocks[2].start).toBe(1);
    expect(blocks[2].items).toHaveLength(2);
  });

  it("nests a list by indentation and joins continuation lines", () => {
    const [list] = parseMarkdown("- outer\n  - inner one\n  - inner two\n- next\n  continued here");
    expect(list.items).toHaveLength(2);
    expect(list.items[0].lists[0].items.map((item) => plainText(item.children))).toEqual(["inner one", "inner two"]);
    expect(plainText(list.items[1].children)).toBe("next continued here");
  });

  it("keeps a list together over a blank line and ends it at a paragraph", () => {
    const blocks = parseMarkdown("- a\n\n- b\n\nAfter the list.");
    expect(blocks.map((block) => block.type)).toEqual(["list", "paragraph"]);
    expect(blocks[0].items).toHaveLength(2);
  });

  it("reads a pipe table with alignment", () => {
    const [table] = parseMarkdown("| Gene | Meta z | q |\n|:-----|-------:|:-:|\n| DDIT3 | -21.4 | 1e-30 |\n| ASNS | -18.2 |\n");
    expect(table.type).toBe("table");
    expect(table.header.map(plainText)).toEqual(["Gene", "Meta z", "q"]);
    expect(table.align).toEqual(["left", "right", "center"]);
    expect(table.rows.map((row) => row.map(plainText))).toEqual([
      ["DDIT3", "-21.4", "1e-30"],
      ["ASNS", "-18.2", ""],
    ]);
  });

  it("reads a table without outer pipes and an escaped pipe", () => {
    const [table] = parseMarkdown("Gene | Note\n--- | ---\nA | x \\| y");
    expect(table.type).toBe("table");
    expect(table.rows[0].map(plainText)).toEqual(["A", "x | y"]);
    expect(splitRow("| a | b |")).toEqual(["a", "b"]);
  });

  it("does not take a line with a pipe for a table", () => {
    expect(parseMarkdown("a | b\nnot a rule")[0].type).toBe("paragraph");
  });

  it("reads headings, rules and code fences", () => {
    const blocks = parseMarkdown("## Evidence\ntext\n\n---\n\n```\n**raw** <b>\n```\nafter");
    expect(blocks.map((block) => block.type)).toEqual(["heading", "paragraph", "rule", "code", "paragraph"]);
    expect(blocks[0].level).toBe(2);
    expect(blocks[3].text).toBe("**raw** <b>");
  });

  it("copes with nothing", () => {
    expect(parseMarkdown("")).toEqual([]);
    expect(parseMarkdown(null)).toEqual([]);
    expect(parseMarkdown("\n\n  \n")).toEqual([]);
  });
});

describe("rendering", () => {
  it("builds elements for every construct", () => {
    const out = html("**Bold** and *soft* with `code`.\n\n- one\n- two\n\n1. first\n\n| A | B |\n|---|--:|\n| x | 1 |");
    expect(out).toContain("<p><strong>Bold</strong> and <em>soft</em> with <code>code</code>.</p>");
    expect(out).toContain("<ul><li>one</li><li>two</li></ul>");
    expect(out).toContain("<ol><li>first</li></ol>");
    expect(out).toContain("<th>A</th>");
    expect(out).toContain('<td style="text-align:right">1</td>');
  });

  it("shows HTML in the text as text", () => {
    const out = html('<img src=x onerror="alert(1)"> and <script>alert(2)</script>\n\n| <b>x</b> |\n|---|\n| <i>y</i> |');
    expect(out).not.toContain("<img");
    expect(out).not.toContain("<script");
    expect(out).not.toContain("<b>");
    expect(out).toContain("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
    expect(out).toContain("&lt;script&gt;");
  });

  it("links only http(s), in a new tab without a referrer", () => {
    const out = html("[ok](https://example.org/x) [bad](javascript:alert(1)) [worse](vbscript:x)");
    expect(out).toContain('<a href="https://example.org/x" target="_blank" rel="noopener noreferrer nofollow">ok</a>');
    expect((out.match(/<a /g) || []).length).toBe(1);
    expect(out).not.toContain("javascript:");
    expect(out).toContain("bad");
  });

  it("numbers a list from where it starts", () => {
    expect(html("3. third\n4. fourth")).toContain('<ol start="3">');
  });
});
