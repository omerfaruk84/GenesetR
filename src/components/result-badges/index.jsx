import React from "react";
import { useSelector } from "react-redux";
import { useLocation } from "react-router-dom";
import { ROUTES } from "../../common/routes";
import { getLastRequest } from "../../store/api";
import { ModulePathNames } from "../../store/results/enums";

// Request fields shown as badges, with a readable label
const PARAMETER_LABELS = {
  processtype: "correlation",
  correlationType: "correlation",
  method: "method",
  dataType: "data",
  row_linkage: "row linkage",
  column_linkage: "column linkage",
  row_distance: "row distance",
  numcomponents: "components",
  min_cluster_size: "min cluster size",
  clusteringMetric: "cluster metric",
  z_score_threshold: "z threshold",
  top_n_genes: "top genes",
  average_method: "average",
  direction_mode: "direction",
  gene: "gene",
  combine: "combine",
  depth: "depth",
};
const LIST_FIELDS = { geneList: "perturbations", targetList: "genes", perturbation_list: "perturbations" };
const DATA_TYPE_NAMES = { 1: "perturbations", 2: "gene expression", pert: "perturbations", genes: "gene expression" };

const wrap = { display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6, margin: "0 0 10px" };
const badge = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  padding: "2px 9px",
  border: "1px solid #d5dae1",
  borderRadius: 999,
  background: "#f6f7f9",
  color: "#2b3440",
  fontSize: 12,
  lineHeight: 1.5,
  whiteSpace: "nowrap",
};
const datasetBadge = { ...badge, borderColor: "#a63648", background: "#fbeef0", color: "#7c2233", fontWeight: 600 };
const key = { color: "#5d6877" };

const countItems = (value) => String(value || "").split(/[;\n,]+/).filter(Boolean).length;

/**
 * Line of badges above a result: the dataset(s) and the main parameters of the
 * run that produced it, so a screenshot or a shared screen says what it shows.
 * Reads the last request of the current page (see store/api getLastRequest).
 */
const ResultBadges = () => {
  const { pathname } = useLocation();
  const currentModule = useSelector((state) => state.settings?.core?.currentModule);
  const datasetList = useSelector((state) => state.settings?.core?.datasetList) || [];
  const moduleName = pathname === ROUTES.DR ? ModulePathNames[`/${currentModule}`] : ModulePathNames[pathname];
  // Re-render when the result of this page arrives or is replaced
  const hasResult = useSelector((state) => !!state.calcResults?.[moduleName]?.result);
  const running = useSelector((state) => !!state.calcResults?.[moduleName]?.running);
  if (!moduleName || !hasResult || running) return null;

  const request = getLastRequest(moduleName);
  if (!request) return null;

  const ids = [].concat(request.datasets || [], request.cell_line || []).filter(Boolean);
  const names = [...new Set(ids)].map(
    (id) => datasetList.find((d) => String(d.id).toLowerCase() === String(id).toLowerCase())?.name || id
  );

  const parameters = [];
  Object.entries(LIST_FIELDS).forEach(([field, label]) => {
    const count = countItems(request[field]);
    if (count > 0) parameters.push([label, count]);
  });
  Object.entries(PARAMETER_LABELS).forEach(([field, label]) => {
    const value = request[field];
    if (value === undefined || value === null || value === "") return;
    parameters.push([label, field === "dataType" ? DATA_TYPE_NAMES[value] || value : String(value)]);
  });

  return (
    <div style={wrap} aria-label="Dataset and parameters of this result">
      {names.map((name) => (
        <span key={name} style={datasetBadge} title="Dataset">
          {name}
        </span>
      ))}
      {parameters.map(([label, value]) => (
        <span key={label} style={badge}>
          <span style={key}>{label}:</span> {value}
        </span>
      ))}
    </div>
  );
};

export { ResultBadges };
