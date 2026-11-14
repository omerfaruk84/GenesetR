import React from "react";
import { toast } from "@oliasoft-open-source/react-ui-library";
import { FaDownload } from "react-icons/fa";
import { downloadNetwork, downloadTable } from "../../utils/exporters";

const buttonStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  height: 28,
  padding: "0 10px",
  border: "1px solid #c4c9d0",
  borderRadius: 4,
  background: "#fff",
  color: "#2b3440",
  fontFamily: "inherit",
  fontSize: 12.5,
  fontWeight: 500,
  whiteSpace: "nowrap",
  cursor: "pointer",
};

const nothing = () =>
  toast({ message: { type: "Warning", icon: true, content: "There is nothing to export yet" }, autoClose: 2500 });

const wrapStyle = { display: "inline-flex", alignItems: "center", gap: 6, flexWrap: "wrap" };

/**
 * CSV and TSV download for a table.
 *   rows     array of row objects, or a function returning it (called on click,
 *            e.g. to export the rows as currently filtered and sorted)
 *   columns  optional column definitions ({ accessorKey | accessorFn, header })
 */
export const TableExportButtons = ({ rows, columns, filename = "genesetr-table", style }) => {
  const run = (format) => {
    const data = typeof rows === "function" ? rows() : rows;
    if (!downloadTable(data, { columns, filename, format })) nothing();
  };
  return (
    <span style={{ ...wrapStyle, ...style }}>
      <button type="button" style={buttonStyle} onClick={() => run("csv")} title="Comma separated; opens in Excel">
        <FaDownload size={11} aria-hidden="true" /> CSV
      </button>
      <button type="button" style={buttonStyle} onClick={() => run("tsv")} title="Tab separated; for R, Python and spreadsheets">
        <FaDownload size={11} aria-hidden="true" /> TSV
      </button>
    </span>
  );
};

/**
 * GraphML and Cytoscape JSON download for a network.
 *   network  { nodes, links | edges } or a function returning it
 */
export const NetworkExportButtons = ({ network, filename = "genesetr-network", style }) => {
  const run = (format) => {
    const data = typeof network === "function" ? network() : network;
    if (!downloadNetwork(data, { format, filename })) nothing();
  };
  return (
    <span style={{ ...wrapStyle, ...style }}>
      <button type="button" style={buttonStyle} onClick={() => run("graphml")} title="GraphML: opens in Cytoscape, Gephi, yEd">
        <FaDownload size={11} aria-hidden="true" /> GraphML
      </button>
      <button type="button" style={buttonStyle} onClick={() => run("cyjs")} title="Cytoscape JSON (.cyjs)">
        <FaDownload size={11} aria-hidden="true" /> Cytoscape
      </button>
    </span>
  );
};
