import React from "react";
import { toast } from "@oliasoft-open-source/react-ui-library";
import { FaDownload } from "react-icons/fa";
import { downloadNetwork, downloadTable } from "../../utils/exporters";
import { ToolbarButton } from "../ui";

const nothing = () =>
  toast({ message: { type: "Warning", icon: true, content: "There is nothing to export yet" }, autoClose: 2500 });

const wrapStyle = { display: "inline-flex", alignItems: "center", gap: 6, flexWrap: "wrap" };

const DownloadButton = ({ children, ...rest }) => (
  <ToolbarButton size="sm" icon={<FaDownload size={11} aria-hidden="true" />} {...rest}>
    {children}
  </ToolbarButton>
);

/**
 * CSV, TSV and Excel download for a table.
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
      <DownloadButton onClick={() => run("csv")} title="Comma separated; opens in Excel">
        CSV
      </DownloadButton>
      <DownloadButton onClick={() => run("tsv")} title="Tab separated; for R, Python and spreadsheets">
        TSV
      </DownloadButton>
      <DownloadButton onClick={() => run("xlsx")} title="Excel workbook; numbers stay numbers">
        Excel
      </DownloadButton>
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
      <DownloadButton onClick={() => run("graphml")} title="GraphML: opens in Cytoscape, Gephi, yEd">
        GraphML
      </DownloadButton>
      <DownloadButton onClick={() => run("cyjs")} title="Cytoscape JSON (.cyjs)">
        Cytoscape
      </DownloadButton>
    </span>
  );
};
