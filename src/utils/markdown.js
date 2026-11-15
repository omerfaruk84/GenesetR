/**
 * A small Markdown reader for the answers of "Ask GeneSetR": text in, a tree
 * of plain objects out. `components/markdown` turns the tree into React
 * elements, so no HTML of the text is ever inserted into the page.
 *
 * Blocks:  paragraph, heading (#), bullet and numbered lists (nested by
 *          indentation), pipe table, code fence, rule.
 * Inline:  **bold**, *italics*, `code`, [text](http…) and bare http(s) links.
 * Anything else, HTML included, stays text.
 */

/** Only http and https addresses become links. */
export const safeHref = (value) => {
  const text = String(value || "").trim();
  if (!/^https?:\/\//i.test(text)) return null;
  try {
    const url = new URL(text);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : null;
  } catch (error) {
    return null;
  }
};

const isWord = (char) => !!char && /[A-Za-z0-9]/.test(char);
const ESCAPABLE = "\\`*_{}[]()#+-.!|>~";

/** Position of the closing `mark` after `from`, or -1. The text between may not be empty or end in a space. */
const closing = (text, mark, from) => {
  let at = text.indexOf(mark, from);
  while (at !== -1) {
    // in a run of three, the last two close the bold: "**a *b***"
    if (mark.length === 2) while (text[at + 2] === mark[0]) at += 1;
    const inner = text.slice(from, at);
    const single = mark.length === 1;
    const doubled = single && (text[at + 1] === mark || text[at - 1] === mark);
    const underscoreInWord = mark[0] === "_" && isWord(text[at + mark.length]);
    if (inner.trim() && !/\s$/.test(inner) && !doubled && !underscoreInWord && text[at - 1] !== "\\") return at;
    at = text.indexOf(mark, at + 1);
  }
  return -1;
};

/** Inline Markdown as nodes: text, strong, em, code, link. */
export const parseInline = (source) => {
  const text = String(source ?? "");
  const nodes = [];
  let plain = "";
  const flush = () => {
    if (plain) nodes.push({ type: "text", text: plain });
    plain = "";
  };
  let i = 0;
  while (i < text.length) {
    const char = text[i];
    const rest = text.slice(i);
    if (char === "\\" && i + 1 < text.length && ESCAPABLE.includes(text[i + 1])) {
      plain += text[i + 1];
      i += 2;
      continue;
    }
    if (char === "`") {
      const end = text.indexOf("`", i + 1);
      if (end > i + 1) {
        flush();
        nodes.push({ type: "code", text: text.slice(i + 1, end) });
        i = end + 1;
        continue;
      }
    }
    if (char === "[") {
      const match = rest.match(/^\[([^\]\n]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/);
      if (match) {
        const href = safeHref(match[2]);
        flush();
        // an address that is not http(s) leaves its text, without a link
        if (href) nodes.push({ type: "link", href, children: parseInline(match[1]) });
        else nodes.push(...parseInline(match[1]));
        i += match[0].length;
        continue;
      }
    }
    if (char === "*" || char === "_") {
      const double = text[i + 1] === char;
      const mark = double ? char + char : char;
      const opensWord = char === "*" || !isWord(text[i - 1]);
      const next = text[i + mark.length];
      if (opensWord && next && !/\s/.test(next)) {
        const end = closing(text, mark, i + mark.length);
        if (end !== -1) {
          flush();
          nodes.push({ type: double ? "strong" : "em", children: parseInline(text.slice(i + mark.length, end)) });
          i = end + mark.length;
          continue;
        }
      }
    }
    if ((char === "h" || char === "H") && !isWord(text[i - 1])) {
      const match = rest.match(/^https?:\/\/[^\s<>"'`]+/i);
      if (match) {
        // punctuation that ends the sentence, and a bracket that closes one opened before the address, are not part of it
        let address = match[0].replace(/[.,;:!?]+$/, "");
        while (address.endsWith(")") && (address.match(/\(/g) || []).length < (address.match(/\)/g) || []).length) address = address.slice(0, -1);
        const href = safeHref(address);
        if (href) {
          flush();
          nodes.push({ type: "link", href, children: [{ type: "text", text: address }] });
          i += address.length;
          continue;
        }
      }
    }
    plain += char;
    i += 1;
  }
  flush();
  return nodes;
};

const FENCE = /^\s*(```|~~~)/;
const HEADING = /^\s{0,3}(#{1,6})\s+(.*?)\s*#*\s*$/;
const RULE = /^\s{0,3}([-*_])(\s*\1){2,}\s*$/;
const ITEM = /^(\s*)([-*+]|\d{1,9}[.)])\s+(.*)$/;
const TABLE_RULE = /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/;

const isBlank = (line) => !line || !line.trim();

/** Cells of one row of a pipe table. */
export const splitRow = (line) => {
  let text = String(line).trim();
  if (text.startsWith("|")) text = text.slice(1);
  if (text.endsWith("|") && !text.endsWith("\\|")) text = text.slice(0, -1);
  const cells = [];
  let cell = "";
  for (let i = 0; i < text.length; i += 1) {
    if (text[i] === "\\" && text[i + 1] === "|") {
      cell += "|";
      i += 1;
    } else if (text[i] === "|") {
      cells.push(cell.trim());
      cell = "";
    } else cell += text[i];
  }
  cells.push(cell.trim());
  return cells;
};

const isTableStart = (lines, at) =>
  lines[at].includes("|") && at + 1 < lines.length && lines[at + 1].includes("-") && TABLE_RULE.test(lines[at + 1]) && (lines[at + 1].includes("|") || lines[at].trim().startsWith("|"));

const startsBlock = (lines, at) =>
  FENCE.test(lines[at]) || HEADING.test(lines[at]) || RULE.test(lines[at]) || ITEM.test(lines[at]) || isTableStart(lines, at);

/** Lists from the flat items of one run of list lines (nested by indentation). */
const toLists = (items) => {
  const root = [];
  const stack = [{ indent: -1, items: root }];
  items.forEach((item) => {
    while (stack.length > 1 && item.indent <= stack[stack.length - 1].indent) stack.pop();
    const node = { ordered: item.ordered, start: item.start, text: item.text, items: [] };
    stack[stack.length - 1].items.push(node);
    stack.push({ indent: item.indent, items: node.items });
  });
  const group = (nodes) => {
    const lists = [];
    nodes.forEach((node) => {
      let list = lists[lists.length - 1];
      if (!list || list.ordered !== node.ordered) {
        list = { type: "list", ordered: node.ordered, start: node.ordered ? node.start : undefined, items: [] };
        lists.push(list);
      }
      list.items.push({ children: parseInline(node.text), lists: group(node.items) });
    });
    return lists;
  };
  return group(root);
};

/**
 * Markdown text as blocks:
 *   { type: "paragraph", children }            { type: "heading", level, children }
 *   { type: "list", ordered, start, items: [{ children, lists }] }
 *   { type: "table", header: [children], align: ["left"|"right"|"center"|null], rows: [[children]] }
 *   { type: "code", text }                     { type: "rule" }
 * `children` are the nodes of `parseInline`.
 */
export const parseMarkdown = (source) => {
  const lines = String(source ?? "")
    .replace(/\r\n?/g, "\n")
    .replace(/\t/g, "    ")
    .split("\n");
  const blocks = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (isBlank(line)) {
      i += 1;
      continue;
    }
    const fence = line.match(FENCE);
    if (fence) {
      const body = [];
      i += 1;
      while (i < lines.length && !lines[i].trim().startsWith(fence[1])) {
        body.push(lines[i]);
        i += 1;
      }
      i += 1;
      blocks.push({ type: "code", text: body.join("\n") });
      continue;
    }
    const heading = line.match(HEADING);
    if (heading) {
      blocks.push({ type: "heading", level: heading[1].length, children: parseInline(heading[2]) });
      i += 1;
      continue;
    }
    if (RULE.test(line)) {
      blocks.push({ type: "rule" });
      i += 1;
      continue;
    }
    if (isTableStart(lines, i)) {
      const header = splitRow(line);
      const align = splitRow(lines[i + 1]).map((cell) => {
        const left = cell.startsWith(":");
        const right = cell.endsWith(":");
        return left && right ? "center" : right ? "right" : left ? "left" : null;
      });
      const rows = [];
      i += 2;
      while (i < lines.length && !isBlank(lines[i]) && lines[i].includes("|")) {
        const cells = splitRow(lines[i]);
        // every row gets as many cells as the header
        rows.push(header.map((_, column) => parseInline(cells[column] ?? "")));
        i += 1;
      }
      blocks.push({ type: "table", header: header.map(parseInline), align: header.map((_, column) => align[column] || null), rows });
      continue;
    }
    if (ITEM.test(line)) {
      const items = [];
      while (i < lines.length) {
        const item = lines[i].match(ITEM);
        if (item) {
          const ordered = /\d/.test(item[2]);
          items.push({ indent: item[1].length, ordered, start: ordered ? parseInt(item[2], 10) : undefined, text: item[3] });
          i += 1;
        } else if (isBlank(lines[i])) {
          // a blank line ends the list unless more of it follows
          let next = i + 1;
          while (next < lines.length && isBlank(lines[next])) next += 1;
          if (next < lines.length && (ITEM.test(lines[next]) || /^\s{2,}\S/.test(lines[next]))) i = next;
          else break;
        } else if (/^\s{2,}\S/.test(lines[i]) && !FENCE.test(lines[i])) {
          items[items.length - 1].text += ` ${lines[i].trim()}`;
          i += 1;
        } else break;
      }
      blocks.push(...toLists(items));
      continue;
    }
    const text = [line.replace(/^\s{0,3}>\s?/, "").trim()];
    i += 1;
    while (i < lines.length && !isBlank(lines[i]) && !startsBlock(lines, i)) {
      text.push(lines[i].replace(/^\s{0,3}>\s?/, "").trim());
      i += 1;
    }
    blocks.push({ type: "paragraph", children: parseInline(text.join(" ")) });
  }
  return blocks;
};

const BLOCK_TYPES = ["paragraph", "heading", "list", "table", "code", "rule"];

/** The text of blocks or inline nodes without any markup (blocks are joined by a space). */
export const plainText = (nodes) => {
  const list = nodes || [];
  const blocks = list.some((node) => BLOCK_TYPES.includes(node.type));
  return list
    .map((node) => {
      if (node.type === "text" || node.type === "code") return node.text;
      if (node.type === "rule") return "";
      if (node.type === "list") return node.items.map((item) => `${plainText(item.children)} ${plainText(item.lists)}`.trim()).join(" ");
      if (node.type === "table") return [node.header, ...node.rows].map((row) => row.map(plainText).join(" ")).join(" ");
      return plainText(node.children);
    })
    .join(blocks ? " " : "");
};
