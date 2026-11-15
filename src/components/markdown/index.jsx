import React from "react";
import { parseMarkdown } from "../../utils/markdown";

const inline = (nodes) =>
  (nodes || []).map((node, index) => {
    if (node.type === "strong") return <strong key={index}>{inline(node.children)}</strong>;
    if (node.type === "em") return <em key={index}>{inline(node.children)}</em>;
    if (node.type === "code") return <code key={index}>{node.text}</code>;
    if (node.type === "link") {
      return (
        <a key={index} href={node.href} target="_blank" rel="noopener noreferrer nofollow">
          {inline(node.children)}
        </a>
      );
    }
    return <React.Fragment key={index}>{node.text}</React.Fragment>;
  });

const lists = (blocks, keyPrefix = "") =>
  (blocks || []).map((list, index) => {
    const Tag = list.ordered ? "ol" : "ul";
    return (
      <Tag key={`${keyPrefix}${index}`} start={list.ordered && list.start > 1 ? list.start : undefined}>
        {list.items.map((item, at) => (
          <li key={at}>
            {inline(item.children)}
            {lists(item.lists)}
          </li>
        ))}
      </Tag>
    );
  });

const block = (node, index) => {
  if (node.type === "heading") {
    const Tag = node.level <= 2 ? "h3" : "h4";
    return <Tag key={index}>{inline(node.children)}</Tag>;
  }
  if (node.type === "list") return lists([node], `${index}-`);
  if (node.type === "code") {
    return (
      <pre key={index}>
        <code>{node.text}</code>
      </pre>
    );
  }
  if (node.type === "rule") return <hr key={index} />;
  if (node.type === "table") {
    const align = (column) => (node.align[column] ? { textAlign: node.align[column] } : undefined);
    return (
      // a wide table scrolls inside its own box, not the page
      <div key={index} data-markdown-table="" style={{ overflowX: "auto" }}>
        <table>
          <thead>
            <tr>
              {node.header.map((cell, column) => (
                <th key={column} style={align(column)}>
                  {inline(cell)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {node.rows.map((row, at) => (
              <tr key={at}>
                {row.map((cell, column) => (
                  <td key={column} style={align(column)}>
                    {inline(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  return <p key={index}>{inline(node.children)}</p>;
};

/**
 * Markdown as React elements (bold, italics, inline code, http(s) links,
 * paragraphs, headings, lists, pipe tables, code blocks). The text is never
 * inserted as HTML: tags in it are shown as text. The look comes from the
 * caller's `className`.
 */
const Markdown = ({ text, className, ...rest }) => (
  <div className={className} {...rest}>
    {parseMarkdown(text).map(block)}
  </div>
);

export { Markdown };
