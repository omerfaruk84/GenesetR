// NetworkGraphAlternatives.jsx
// Network visualization with multiple renderer options + graceful fallbacks
// Sigma fixed (auto-fit, seeded positions), Cytoscape stable layout, ForceGraph 2D/3D layouts

import React, { useMemo, useState, useEffect, useRef, useCallback } from "react";
import ForceGraph2D from "react-force-graph-2d";
import ForceGraph3D from "react-force-graph-3d";
import { getGeneInfo } from "../../utils/geneFunctionUtils";
import { escapeHtml } from "../../utils/escapeHtml";
import { ErrorBoundary } from "../error-boundary";
import { ChartLegend, Toolbar } from "../ui";
import { usePalette } from "../../utils/theme";
import { networkColors } from "./networkColors";
import { NetworkExportButtons } from "../export-buttons";

// ---- Optional libraries (try to load, but keep app running if missing) ----
let CytoscapeComponent; // react-cytoscapejs
let SigmaContainer, ControlsContainer, ZoomControl, FullScreenControl, useSigma;
let GraphClass, forceAtlas2; // graphology + FA2
let circular, randomLayout, grid, radial, noverlap; // graphology-layouts

// Cytoscape
try {
  CytoscapeComponent = require("react-cytoscapejs").default;
} catch (e) {
  console.log("Cytoscape not available:", e?.message || e);
}

// Sigma core + Graphology + FA2 + Label Renderers
let drawLabel, drawHover;
try {
  const s = require("@react-sigma/core");
  SigmaContainer = s.SigmaContainer;
  ControlsContainer = s.ControlsContainer;
  ZoomControl = s.ZoomControl;
  FullScreenControl = s.FullScreenControl;
  useSigma = s.useSigma;

  const graphology = require("graphology");
  GraphClass = graphology?.default || graphology?.Graph || graphology;

  forceAtlas2 = require("graphology-layout-forceatlas2");

  // Import the default label renderers from sigma
  try {
    const labelRenderers = require("sigma/rendering");
    drawLabel = labelRenderers.drawLabel;
    drawHover = labelRenderers.drawHover;
  } catch (labelErr) {
    console.log("Sigma label renderers not available:", labelErr?.message || labelErr);
  }

  try {
    require("@react-sigma/core/lib/style.css");
  } catch (cssErr) {
    console.log("Sigma styles not loaded:", cssErr?.message || cssErr);
  }
} catch (e) {
  console.log("Sigma/Graphology not available:", e?.message || e);
}

// Try direct sigma library as fallback
let DirectSigma;
try {
  DirectSigma = require("sigma");
} catch (e) {
  console.log("Direct Sigma not available:", e?.message || e);
}

// Graphology layout helpers (optional)
try {
  circular = require("graphology-layout/circular");
  randomLayout = require("graphology-layout/random");
  // eslint-disable-next-line
  grid = require("graphology-layout/grid");
  // eslint-disable-next-line
  radial = require("graphology-layout/radial");
  noverlap = require("graphology-layout-noverlap");
} catch (e) {
  console.log("Graphology extra layouts not available:", e?.message || e);
}

// ------------------ Shared utilities ------------------
const EDGE_WIDTHS = { Exp: 1.6, Corr: 1.1 };

/**
 * Everything the renderers draw with, for one theme: node colours by group,
 * edge colours by class, label and background colours. Built from the palette
 * in the main component and handed to every renderer, so a theme switch
 * redraws them and the legend always shows the colours on screen.
 */
function graphLook(p) {
  const c = networkColors(p);
  return {
    mode: p.mode,
    categories: {
      0: c.upstreamPositive, // UPR
      1: c.upstreamNegative, // UNR
      2: c.downstreamPositive, // DPR
      3: c.downstreamNegative, // DNR
      default: c.neutral,
    },
    edges: { Exp: c.neutral, Corr: c.correlation },
    label: p.text,
    halo: p.bg,
    background: p.bg,
    surface: p.surface,
    border: p.borderStrong,
    hover: p.link,
    hoverSoft: p.mode === "dark" ? "rgba(122, 184, 255, 0.25)" : "rgba(21, 101, 192, 0.18)",
  };
}

// Chrome drawn over the graphs (control panels, tooltips, cards): CSS tokens,
// so it follows the theme without code.
const floatPanelStyle = {
  position: "absolute",
  top: 12,
  right: 12,
  zIndex: 10,
  display: "flex",
  flexWrap: "wrap",
  alignItems: "flex-end",
  gap: 10,
  padding: "8px 12px",
  border: "1px solid var(--gs-border)",
  borderRadius: 8,
  background: "var(--gs-surface)",
  color: "var(--gs-text)",
  boxShadow: "var(--gs-shadow)",
};
const controlLabelStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 3,
  fontSize: 11,
  fontWeight: 600,
  color: "var(--gs-muted)",
};
const checkLabelStyle = {
  display: "flex",
  alignItems: "center",
  gap: 5,
  fontSize: 12,
  color: "var(--gs-text)",
};
const selectStyle = {
  height: 28,
  padding: "0 6px",
  border: "1px solid var(--gs-border-strong)",
  borderRadius: 6,
  background: "var(--gs-surface)",
  color: "var(--gs-text)",
  fontFamily: "inherit",
  fontSize: 12.5,
};
const canvasFrame = (look, height) => ({
  position: "relative",
  width: "100%",
  height,
  border: "1px solid var(--gs-border)",
  borderRadius: 8,
  background: look.background,
  overflow: "hidden",
});
const TOOLTIP_CSS = `
  position: fixed;
  background: var(--gs-surface);
  color: var(--gs-text);
  border: 1px solid var(--gs-border-strong);
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 12px;
  pointer-events: none;
  z-index: 9999;
  display: none;
  max-width: 350px;
  line-height: 1.4;
  box-shadow: var(--gs-shadow-pop);
`;
const fallbackStyle = (height) => ({
  width: "100%",
  height,
  border: "2px dashed var(--gs-border-strong)",
  borderRadius: 8,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  textAlign: "center",
  color: "var(--gs-muted)",
});

function normalizeGraph(graph) {
  if (!graph) return { nodes: [], edges: [] };
  const nodeMap = new Map(
    (graph.nodes || []).map((n) => [String(n.id), { id: String(n.id), ...n }])
  );

  const edges = (graph.edges || [])
    .map((e) => ({
      source: e.source ?? e.From,
      target: e.target ?? e.To,
      value: Number(e.value ?? 0),
      Type2: e.Type2 || "Exp",
      Type: e.Type || "",
      id:
        e.id ||
        `${e.From || e.source}+${e.Type2 || "Exp"}+${e.To || e.target}`,
    }))
    .filter(
      (e) =>
        e.source &&
        e.target &&
        e.source !== e.target &&
        Number.isFinite(e.value)
    );

  edges.forEach((e) => {
    if (!nodeMap.has(String(e.source)))
      nodeMap.set(String(e.source), { id: String(e.source) });
    if (!nodeMap.has(String(e.target)))
      nodeMap.set(String(e.target), { id: String(e.target) });
  });

  const nodes = Array.from(nodeMap.values());
  return { nodes, edges };
}

function degreeMap(nodes, edges) {
  const deg = Object.fromEntries(nodes.map((n) => [n.id, 0]));
  edges.forEach((e) => {
    if (deg[e.source] != null) deg[e.source] += 1;
    if (deg[e.target] != null) deg[e.target] += 1;
  });
  return deg;
}

function filterEdgesBySettings(edges, settings) {
  if (!settings) return edges;
  const allowExp = settings.include_exp ?? true;
  const allowCorr = settings.include_corr ?? true;

  const allow = (e) => {
    if (e.Type2 === "Exp" && !allowExp) return false;
    if (e.Type2 === "Corr" && !allowCorr) return false;
    const key = (settingsKeyForType(e.Type) || "").toLowerCase();
    if (key && settings[key] === false) return false;
    return true;
  };

  let filteredEdges = edges.filter(allow);

  // Calculate node counts for all nodes (needed for sizing and simplified view)
  const nodeCounts = {};
  filteredEdges.forEach(edge => {
    nodeCounts[edge.source] = (nodeCounts[edge.source] || 0) + 1;
    nodeCounts[edge.target] = (nodeCounts[edge.target] || 0) + 1;
  });

  // Apply simplified view filtering if enabled
  if (settings.simplifiedViewEnabled && settings.selectedGene) {
    // Filter edges to only those connected to the selected gene
    // and meeting the minimum neighbor count requirement
    filteredEdges = filteredEdges.filter(edge => {
      const source = edge.source;
      const target = edge.target;
      
      // Keep edges connected to the selected gene
      if (source === settings.selectedGene || target === settings.selectedGene) {
        // Check if the other node meets the minimum neighbor count
        const otherNode = target === settings.selectedGene ? source : target;
        const totalNeighbors = nodeCounts[otherNode] || 0;
        
        // For the selected gene, we don't count it in the neighbor count
        if (otherNode !== settings.selectedGene && totalNeighbors >= (settings.simplifiedViewMinNeighbors || 1)) {
          return true;
        }
      }
      return false;
    });
  }

  // Store node counts in the edges for later use
  filteredEdges.forEach(edge => {
    edge.sourceNeighborCount = nodeCounts[edge.source] || 0;
    edge.targetNeighborCount = nodeCounts[edge.target] || 0;
    edge.totalNeighborCount = (nodeCounts[edge.source] || 0) + (nodeCounts[edge.target] || 0);
  });

  return filteredEdges;
}

function settingsKeyForType(t) {
  return t ? t.replace(/\s+/g, "_").toLowerCase() : null;
}

function nodeColor(n, look) {
  const cat = n?.category;
  return look.categories[cat ?? "default"] || look.categories.default;
}

function edgeColor(e, look) {
  return look.edges[e.Type2] || look.edges.Exp;
}

function edgeWidth(e) {
  return EDGE_WIDTHS[e.Type2] || EDGE_WIDTHS.Exp;
}

// Largest degree in the graph. Computed once per graph and passed to nodeSize
// (it used to be recomputed for every node on every style pass / frame).
function maxDegreeOf(deg) {
  let max = 0;
  for (const key in deg) {
    if (deg[key] > max) max = deg[key];
  }
  return max;
}

function nodeSize(n, deg, settings, maxDegree) {
  const baseSize = 8;
  const degree = deg[n.id] || 0;
  const neighbourCount = n.neighbourCount || 0;
  
  if (settings?.nodeStyle === "degree") {
    return baseSize + Math.min(12, degree * 1.5);
  } else if (settings?.nodeStyle === "knockdown" && n.kd !== undefined) {
    return baseSize + Math.abs(n.kd) * 4;
  } else if (settings?.nodeStyle === "mixed") {
    return baseSize + Math.min(8, degree) + (n.kd ? Math.abs(n.kd) * 2 : 0);
  } else if (settings?.nodeStyle === "neighbourCount") {
    // Use neighbor count for sizing, similar to original module
    const minSize = 6;
    const maxSize = 30;
    const minNeighbours = 1;
    const maxNeighbours = Math.max(
      10,
      Number.isFinite(maxDegree) ? maxDegree : maxDegreeOf(deg)
    );
    const sizeRange = maxSize - minSize;
    const neighbourRange = maxNeighbours - minNeighbours;

    if (neighbourRange > 0) {
      const normalizedCount = (neighbourCount - minNeighbours) / neighbourRange;
      return Math.max(3, minSize + normalizedCount * sizeRange);
    }
    return baseSize + Math.min(6, neighbourCount);
  }
  return baseSize + Math.min(6, degree);
}

// Stable, cheap signature of a node set: changes whenever the genes change,
// not only when their number does.
function nodeSignature(nodes) {
  let hash = 0;
  for (const n of nodes) {
    const id = String(n.id);
    for (let i = 0; i < id.length; i++) {
      hash = (hash * 31 + id.charCodeAt(i)) | 0;
    }
    hash = (hash * 31 + 124) | 0;
  }
  return `${nodes.length}:${hash}`;
}

// ------------------ Main exported component ------------------
export default function NetworkGraphAlternatives({
  graph,
  settings,
  height = 640,
  initialRenderer = "Cytoscape",
}) {
  const [renderer, setRenderer] = useState(initialRenderer);
  const palette = usePalette();
  const look = useMemo(() => graphLook(palette), [palette]);
  const g = useMemo(() => normalizeGraph(graph), [graph]);
  const filteredEdges = useMemo(
    () => filterEdgesBySettings(g.edges, settings),
    [g.edges, settings]
  );
  
  // Calculate node counts for all nodes
  const nodeCounts = useMemo(() => {
    const counts = {};
    filteredEdges.forEach(edge => {
      counts[edge.source] = (counts[edge.source] || 0) + 1;
      counts[edge.target] = (counts[edge.target] || 0) + 1;
    });
    return counts;
  }, [filteredEdges]);

  // Filter nodes to only include those connected by filtered edges (for simplified view)
  const filteredNodes = useMemo(() => {
    if (!settings?.simplifiedViewEnabled || !settings?.selectedGene) {
      return g.nodes.map(node => ({
        ...node,
        neighbourCount: nodeCounts[node.id] || 0
      }));
    }
    
    const connectedNodes = new Set();
    connectedNodes.add(settings.selectedGene); // Always keep the selected gene
    
    filteredEdges.forEach(edge => {
      if (edge.source !== edge.target) {
        connectedNodes.add(edge.source);
        connectedNodes.add(edge.target);
      }
    });
    
    return g.nodes
      .filter(node => connectedNodes.has(node.id))
      .map(node => ({
        ...node,
        neighbourCount: nodeCounts[node.id] || 0
      }));
  }, [g.nodes, filteredEdges, settings, nodeCounts]);
  
  const deg = useMemo(
    () => degreeMap(filteredNodes, filteredEdges),
    [filteredNodes, filteredEdges]
  );

  // Lookups shared by all renderers (avoid O(n) searches per node per frame)
  const nodeById = useMemo(
    () => new Map(filteredNodes.map((node) => [node.id, node])),
    [filteredNodes]
  );
  const maxDegree = useMemo(() => maxDegreeOf(deg), [deg]);

  const common = {
    nodes: filteredNodes,
    edges: filteredEdges,
    deg,
    height,
    settings,
    nodeById,
    maxDegree,
    look,
  };

  return (
    <div style={{ display: "grid", gridTemplateRows: "auto 1fr", gap: 8 }}>
      <div>
        <Toolbar style={{ marginBottom: 8, justifyContent: "space-between" }}>
          <Header renderer={renderer} setRenderer={setRenderer} />
          <NetworkExportButtons
            network={() => ({ nodes: filteredNodes, edges: filteredEdges })}
            filename="genesetr-gene-regulation"
          />
        </Toolbar>
        <ChartLegend
          label="Network legend"
          items={[
            { label: "Upstream positive regulator", color: look.categories[0] },
            { label: "Upstream negative regulator", color: look.categories[1] },
            { label: "Downstream, positively regulated", color: look.categories[2] },
            { label: "Downstream, negatively regulated", color: look.categories[3] },
            { label: "Gene of interest / other", color: look.categories.default },
            { label: "Expression effect", color: look.edges.Exp, line: "solid" },
            { label: "Correlation", color: look.edges.Corr, line: "dashed" },
          ]}
        />
      </div>
      <div style={{ height }}>
        {/* A failing renderer must not blank the page: the user can pick another one. */}
        <ErrorBoundary label={`${renderer} network view`} resetKeys={[renderer, graph]}>
          {renderer === "Cytoscape" &&
            (CytoscapeComponent ? (
              <CytoscapeRenderer {...common} />
            ) : (
              <CytoscapeFallback {...common} />
            ))}
          {renderer === "Sigma" &&
            (SigmaContainer ? (
              <SigmaRenderer {...common} />
            ) : DirectSigma ? (
              <DirectSigmaRenderer {...common} />
            ) : (
              <SigmaFallback {...common} />
            ))}
          {renderer === "ForceGraph2D" && <ForceGraph2DRenderer {...common} />}
          {renderer === "ForceGraph3D" && <ForceGraph3DRenderer {...common} />}
        </ErrorBoundary>
      </div>
    </div>
  );
}

function Header({ renderer, setRenderer }) {
  const renderers = [
    {
      value: "Cytoscape",
      label: `Cytoscape${CytoscapeComponent ? "" : " (not installed)"}`,
      available: !!CytoscapeComponent,
    },
    {
      value: "Sigma",
      label: `Sigma.js${SigmaContainer ? "" : " (not installed)"}`,
      available: !!SigmaContainer,
    },
    {
      value: "ForceGraph2D",
      label: "ForceGraph 2D",
      available: true,
    },
    {
      value: "ForceGraph3D",
      label: "ForceGraph 3D",
      available: true,
    },
  ];

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--gs-text)" }}>
      <label htmlFor="network-renderer" style={{ fontSize: 13, fontWeight: 600 }}>
        Renderer
      </label>
      <select
        id="network-renderer"
        value={renderer}
        onChange={(e) => setRenderer(e.target.value)}
        style={selectStyle}
      >
        {renderers.map((r) => (
          <option key={r.value} value={r.value} disabled={!r.available}>
            {r.label}
          </option>
        ))}
      </select>
      {!(CytoscapeComponent || SigmaContainer) && (
        <span style={{ fontSize: 12, color: "var(--gs-muted)" }}>
          Install renderers: npm i react-cytoscapejs cytoscape @react-sigma/core graphology
        </span>
      )}
    </div>
  );
}

// ------------------ Cytoscape renderer (stable layout + rich tooltips) ------------------
function CytoscapeRenderer({ nodes, edges, deg, height, settings, nodeById, maxDegree, look }) {
  const [layoutName, setLayoutName] = useState(settings?.cyLayout || "cose");
  const [colorMode, setColorMode] = useState(
    settings?.cyColorMode ||
      (settings?.nodeStyle === "degree" ? "degree" : "category")
  );
  const [showLabels, setShowLabels] = useState(settings?.cyShowLabels ?? true);
  const cyRef = useRef(null);

  const elements = useMemo(() => {
    const cyNodes = nodes.map((n) => ({
      data: {
        id: n.id,
        label: n.id,
        category: n.category,
        kd: n.kd,
        degree: deg[n.id] || 0,
      },
    }));
    const cyEdges = edges.map((e) => ({
      data: {
        id: e.id,
        source: e.source,
        target: e.target,
        label: `${e.Type2} ${e.value.toFixed(2)}`,
        Type2: e.Type2,
        Type: e.Type,
        value: e.value,
      },
    }));
    return [...cyNodes, ...cyEdges];
  }, [nodes, edges, deg]);

  const degreeStats = useMemo(() => {
    const vals = nodes.map((n) => deg[n.id] || 0);
    return {
      min: vals.length ? Math.min(...vals) : 0,
      max: vals.length ? Math.max(...vals) : 0,
    };
  }, [nodes, deg]);

  const kdStats = useMemo(() => {
    const vals = nodes
      .map((n) =>
        Number.isFinite(n.kd)
          ? n.kd
          : typeof n.kd === "string"
          ? Number.parseFloat(n.kd)
          : undefined
      )
      .filter((v) => Number.isFinite(v));
    return {
      min: vals.length ? Math.min(...vals) : -1,
      max: vals.length ? Math.max(...vals) : 1,
    };
  }, [nodes]);

  // Networks with many nodes get a wider layout. The view is then zoomed out
  // to fit, so circles and labels are drawn larger to stay legible.
  const crowded = nodes.length > 120;
  const crowdScale = crowded ? 1.5 : 1;

  const layoutOptions = useMemo(() => {
    // animate:false to prevent easing on hover-triggered renders
    const base = { animate: false, fit: true, padding: 20 };
    switch (layoutName) {
      case "concentric":
        return {
          ...base,
          name: "concentric",
          minNodeSpacing: 15,
          concentric: (node) => node.data("degree") || 0,
          levelWidth: () => 2,
        };
      case "breadthfirst":
        return {
          ...base,
          name: "breadthfirst",
          spacingFactor: 1.25,
          directed: true,
          avoidOverlap: true,
        };
      case "grid":
        return { ...base, name: "grid", avoidOverlap: true, spacingFactor: 1.1 };
      case "circle":
        return {
          ...base,
          name: "circle",
          avoidOverlap: true,
          spacingFactor: 1.2,
        };
      case "cose":
      default:
        // Large networks need more room between nodes, or they collapse into
        // one blob of overlapping circles.
        return {
          ...base,
          name: "cose",
          nodeOverlap: 20,
          idealEdgeLength: () => (crowded ? 90 : 80),
          nodeRepulsion: () => (crowded ? 900000 : 400000),
          gravity: crowded ? 60 : 80,
          numIter: crowded ? 1500 : 1000,
        };
    }
  }, [layoutName, crowded]);

  const colorForNode = useMemo(() => {
    const clamp = (val) => Math.max(0, Math.min(1, val));
    const lerp = (a, b, t) => a + (b - a) * t;
    const hexToRgb = (hex) => {
      const normalized = hex.replace("#", "");
      const bigint = Number.parseInt(normalized, 16);
      const r = (bigint >> 16) & 255;
      const g = (bigint >> 8) & 255;
      const b = bigint & 255;
      return { r, g, b };
    };
    const rgbToHex = ({ r, g, b }) => {
      const toHex = (v) => v.toString(16).padStart(2, "0");
      return `#${toHex(Math.round(r))}${toHex(Math.round(g))}${toHex(
        Math.round(b)
      )}`;
    };
    const blend = (colors, t) => {
      if (colors.length === 1) return colors[0];
      const scaled = clamp(t) * (colors.length - 1);
      const idx = Math.floor(scaled);
      const localT = clamp(scaled - idx);
      const start = hexToRgb(colors[idx]);
      const end = hexToRgb(colors[Math.min(idx + 1, colors.length - 1)]);
      return rgbToHex({
        r: lerp(start.r, end.r, localT),
        g: lerp(start.g, end.g, localT),
        b: lerp(start.b, end.b, localT),
      });
    };

    return (node) => {
      if (!node) return look.categories.default;
      if (colorMode === "degree") {
        const val = deg[node.id] || 0;
        const { min, max } = degreeStats;
        const denom = max - min || 1;
        const t = clamp((val - min) / denom);
        // pale to strong, ending on the shade that stands out on the background
        return blend(
          look.mode === "dark" ? ["#3a4374", "#7c86f2", "#e0e4ff"] : ["#c7d2fe", "#6366f1", "#312e81"],
          t
        );
      }
      if (colorMode === "kd") {
        const kdValue = Number.isFinite(node.kd)
          ? node.kd
          : typeof node.kd === "string"
          ? Number.parseFloat(node.kd)
          : 0;
        const { min, max } = kdStats;
        const denom = max - min || 1;
        const t = clamp((kdValue - min) / denom);
        return blend(["#f87171", "#facc15", "#34d399"], t);
      }
      return nodeColor(node, look);
    };
  }, [colorMode, degreeStats, kdStats, deg, look]);

  const stylesheet = useMemo(
    () => [
      {
        selector: "node",
        style: {
          label: showLabels ? "data(label)" : "",
          "background-color": (ele) => colorForNode(nodeById.get(ele.id())),
          width: (ele) =>
            nodeSize(nodeById.get(ele.id()) || {}, deg, settings, maxDegree) * 2 * crowdScale,
          height: (ele) =>
            nodeSize(nodeById.get(ele.id()) || {}, deg, settings, maxDegree) * 2 * crowdScale,
          color: look.label,
          "font-size": crowded ? 20 : 10,
          "min-zoomed-font-size": 5,
          "font-weight": 600,
          "text-valign": "bottom",
          "text-halign": "center",
          "text-margin-y": 3,
          // halo in the background colour: labels stay readable over edges
          "text-outline-color": look.halo,
          "text-outline-width": 2,
          "text-outline-opacity": 1,
          "border-width": 1.5,
          "border-color": look.halo,
        },
      },
      {
        selector: "node:selected",
        style: { "border-width": 3, "border-color": look.hover },
      },
      {
        selector: "edge",
        style: {
          width: (ele) => edgeWidth({ Type2: ele.data("Type2") }),
          "line-color": (ele) => edgeColor({ Type2: ele.data("Type2") }, look),
          "target-arrow-color": (ele) => edgeColor({ Type2: ele.data("Type2") }, look),
          "curve-style": "bezier",
          "target-arrow-shape": "triangle",
          "arrow-scale": crowded ? 1.2 : 0.9,
          opacity: edges.length > 600 ? 0.35 : 0.75,
          "line-style": (ele) =>
            ele.data("Type2") === "Corr" ? "dashed" : "solid",
        },
      },
      {
        selector: "edge:selected",
        style: { "line-color": look.hover, "target-arrow-color": look.hover, opacity: 1 },
      },
    ],
    [nodeById, deg, settings, maxDegree, colorForNode, showLabels, look, crowded, crowdScale, edges.length]
  );

  // Run layout ONLY when the node set, the number of edges or layoutName
  // changes (not on hover / style updates). The node signature covers the
  // case of a new graph that happens to have the same node and edge counts.
  const dataKey = useMemo(
    () => `${nodeSignature(nodes)}:${edges.length}:${layoutName}`,
    [nodes, edges.length, layoutName]
  );

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    const layout = cy.layout(layoutOptions);
    layout.run();
  }, [dataKey, layoutOptions]);

  // Tooltips (do not trigger layout). Mount-only: gene info comes from the
  // shared cache in utils, so loading it never re-runs this effect (which used
  // to remove the tooltip the moment the information arrived).
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return undefined;

    const tooltip = document.createElement("div");
    tooltip.setAttribute("data-cy-tooltip", "true");
    tooltip.style.cssText = TOOLTIP_CSS;
    document.body.appendChild(tooltip);

    // Id of the element the pointer is currently over (null when none).
    let hoveredId = null;

    const showTooltip = (e, content) => {
      tooltip.innerHTML = content;
      tooltip.style.display = "block";
      const x = e.originalEvent?.clientX ?? 0;
      const y = e.originalEvent?.clientY ?? 0;
      tooltip.style.left = x + 10 + "px";
      tooltip.style.top = y + 10 + "px";
    };
    const hideTooltip = () => {
      hoveredId = null;
      tooltip.style.display = "none";
    };

    const nodeHtml = (node, geneInfo, loading) => {
      const kd = node.data("kd");
      let html = `<div style="font-weight:600;margin-bottom:4px;">${escapeHtml(node.id())}`;
      if (geneInfo?.name) html += ` (${escapeHtml(geneInfo.name)})`;
      html += `</div>`;
      html += `<div>Category: ${escapeHtml(node.data("category") ?? "N/A")}</div>`;
      html += `<div>Degree: ${escapeHtml(node.data("degree"))}</div>`;
      if (Number.isFinite(kd)) html += `<div>Knockdown: ${(+kd).toFixed(3)}</div>`;
      if (loading) {
        html += `<div style="font-style:italic;color:var(--gs-muted);margin-top:4px;">Loading gene info...</div>`;
      } else if (geneInfo?.description) {
        html += `<div style="margin-top:6px;padding-top:6px;border-top:1px solid var(--gs-border);color:var(--gs-muted);">${escapeHtml(geneInfo.description)}</div>`;
      }
      return html;
    };

    const onNodeOver = (e) => {
      const node = e.target;
      const nodeId = node.id();
      hoveredId = nodeId;
      showTooltip(e, nodeHtml(node, null, true));

      getGeneInfo(nodeId).then((geneInfo) => {
        // Only update when the pointer is still on the same node.
        if (hoveredId !== nodeId) return;
        tooltip.innerHTML = nodeHtml(node, geneInfo, false);
      });
    };

    const onEdgeOver = (e) => {
      const edge = e.target;
      hoveredId = edge.id();
      const value = edge.data("value");
      let html = `<div style="font-weight:600;margin-bottom:4px;">${escapeHtml(
        edge.source().id()
      )} → ${escapeHtml(edge.target().id())}</div>`;
      html += `<div>Type: ${escapeHtml(edge.data("Type") || "N/A")}</div>`;
      html += `<div>Class: ${escapeHtml(edge.data("Type2"))}</div>`;
      if (Number.isFinite(value)) html += `<div>Value: ${(+value).toFixed(3)}</div>`;
      showTooltip(e, html);
    };

    cy.on("mouseover", "node", onNodeOver);
    cy.on("mouseout", "node", hideTooltip);
    cy.on("mouseover", "edge", onEdgeOver);
    cy.on("mouseout", "edge", hideTooltip);

    return () => {
      hoveredId = null;
      cy.off("mouseover", "node", onNodeOver);
      cy.off("mouseout", "node", hideTooltip);
      cy.off("mouseover", "edge", onEdgeOver);
      cy.off("mouseout", "edge", hideTooltip);
      tooltip.remove();
    };
  }, []);

  return (
    <div style={canvasFrame(look, height)}>
      <div style={floatPanelStyle}>
        <label style={controlLabelStyle}>
          Layout
          <select
            value={layoutName}
            onChange={(e) => setLayoutName(e.target.value)}
            style={selectStyle}
          >
            <option value="cose">CoSE (force)</option>
            <option value="concentric">Concentric</option>
            <option value="breadthfirst">Breadth-First</option>
            <option value="circle">Circle</option>
            <option value="grid">Grid</option>
          </select>
        </label>
        <label style={controlLabelStyle}>
          Color
          <select
            value={colorMode}
            onChange={(e) => setColorMode(e.target.value)}
            style={selectStyle}
          >
            <option value="category">Category</option>
            <option value="degree">Degree</option>
            <option value="kd">Knockdown</option>
          </select>
        </label>
        <label style={{ ...checkLabelStyle, height: 28 }}>
          <input
            type="checkbox"
            checked={showLabels}
            onChange={(e) => setShowLabels(e.target.checked)}
          />
          Labels
        </label>
      </div>

      <CytoscapeComponent
        elements={elements}
        stylesheet={stylesheet}
        style={{ width: "100%", height: "100%" }}
        layout={layoutOptions}
        wheelSensitivity={0.2}
        cy={(cy) => (cyRef.current = cy)}
      />
    </div>
  );
}

// ------------------ Enhanced Sigma.js renderer with full interactivity ------------------
function SigmaRenderer({ nodes, edges, deg, height, settings, nodeById, look }) {
  const [sigmaLayout, setSigmaLayout] = useState("fa2");
  const [hoveredNode, setHoveredNode] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [tooltip, setTooltip] = useState(null);
  const [showLabels, setShowLabels] = useState(true);
  const [nodeSizeMode, setNodeSizeMode] = useState("degree"); // 'degree' | 'knockdown' | 'fixed'
  // Latest hovered node; a gene-info lookup that resolves late is ignored.
  const hoverRef = useRef(null);

  // Create the graph with enhanced features
  const graph = useMemo(() => {
    if (!GraphClass) return null;

    try {
      // multi: true - an expression edge and a correlation edge may connect the
      // same ordered pair of genes; a simple graph would throw on the second.
      const g = new GraphClass({ multi: true, type: "directed", allowSelfLoops: false });

      let maxNeighbourCount = 0;
      nodes.forEach((n) => {
        if ((n?.neighbourCount || 0) > maxNeighbourCount) maxNeighbourCount = n.neighbourCount;
      });

      // Add nodes with enhanced properties
      const radius = Math.max(50, nodes.length * 3);
      nodes.forEach((n, i) => {
        if (!n?.id) return;
        const id = String(n.id);
        if (g.hasNode(id)) return;
        const angle = (2 * Math.PI * i) / nodes.length;
        const x = Number.isFinite(n.x) ? n.x : radius * Math.cos(angle);
        const y = Number.isFinite(n.y) ? n.y : radius * Math.sin(angle);

        // Dynamic node sizing
        let size = 8;
        if (nodeSizeMode === "degree") {
          size = 8 + Math.min(12, (deg[n.id] || 0) * 1.5);
        } else if (nodeSizeMode === "knockdown" && n.kd !== undefined) {
          size = 8 + Math.abs(n.kd) * 4;
        } else if (nodeSizeMode === "mixed") {
          size = 8 + Math.min(8, (deg[n.id] || 0)) + (n.kd ? Math.abs(n.kd) * 2 : 0);
        } else if (nodeSizeMode === "neighbourCount") {
          // Use neighbor count for sizing, similar to original module
          const neighbourCount = n.neighbourCount || 0;
          const minSize = 6;
          const maxSize = 30;
          const minNeighbours = 1;
          const maxNeighbours = Math.max(10, maxNeighbourCount);
          const sizeRange = maxSize - minSize;
          const neighbourRange = maxNeighbours - minNeighbours;

          if (neighbourRange > 0) {
            const normalizedCount = (neighbourCount - minNeighbours) / neighbourRange;
            size = Math.max(3, minSize + normalizedCount * sizeRange);
          } else {
            size = 8 + Math.min(6, neighbourCount);
          }
        }
        if (!Number.isFinite(size)) size = 8;

        g.addNode(id, {
          x,
          y,
          size,
          label: id,
          color: nodeColor(n, look),
          category: n.category,
          kd: n.kd,
          degree: deg[n.id] || 0,
          neighbourCount: n.neighbourCount || 0,
          // Enhanced properties for interactivity
          highlighted: false,
          selected: false,
          hovered: false,
        });
      });

      // Add edges with enhanced properties
      edges.forEach((e) => {
        const s = String(e.source);
        const t = String(e.target);
        if (s === t || !g.hasNode(s) || !g.hasNode(t)) return;

        g.addEdge(s, t, {
          size: edgeWidth(e),
          color: edgeColor(e, look),
          Type2: e.Type2,
          Type: e.Type,
          value: e.value,
          highlighted: false,
        });
      });

      // Apply layout
      switch (sigmaLayout) {
        case "circular":
          circular?.assign?.(g);
          break;
        case "grid":
          grid?.assign?.(g, { dimensions: 2 });
          break;
        case "radial":
          radial?.assign?.(g, {
            attributes: { node: "category" },
          });
          break;
        case "random+noverlap":
          randomLayout?.assign?.(g);
          noverlap?.assign?.(g, { margin: 2 });
          break;
        case "fa2":
        default:
          if (forceAtlas2?.assign) {
            forceAtlas2.assign(g, {
              iterations: 250,
              settings: {
                slowDown: 10,
                gravity: 1.2,
                startingIterations: 5,
                barnesHutOptimize: g.order > 100,
                scalingRatio: 10,
              },
            });
          }
      }

      return g;
    } catch (err) {
      console.error("Sigma graph could not be built:", err);
      return null;
    }
  }, [nodes, edges, deg, settings, sigmaLayout, nodeSizeMode, look]);

  // Tooltip: shown immediately, completed when the (cached) gene info arrives.
  // Stable identity, so the Sigma event listeners are registered only once.
  const handleNodeHover = useCallback((nodeId) => {
    hoverRef.current = nodeId || null;
    if (!nodeId) {
      setTooltip(null);
      setHoveredNode(null);
      return;
    }

    setHoveredNode(nodeId);

    const node = nodeById?.get(nodeId);
    const base = {
      nodeId,
      node,
      geneInfo: null,
      degree: deg[nodeId] || 0,
      neighbourCount: node?.neighbourCount || 0,
      category: node?.category,
      kd: node?.kd,
    };
    setTooltip(base);

    getGeneInfo(nodeId).then((geneInfo) => {
      if (hoverRef.current !== nodeId || !geneInfo) return;
      setTooltip({ ...base, geneInfo });
    });
  }, [nodeById, deg]);

  const handleNodeClick = useCallback((nodeId) => setSelectedNode(nodeId), []);

  if (!graph) {
    return <SigmaFallback nodes={nodes} edges={edges} height={height} />;
  }

  // Hover label in the theme's colours (the library default is a white box)
  const drawThemedHover = (context, data, sigmaSettings) => {
    const size = sigmaSettings.labelSize;
    context.font = `${sigmaSettings.labelWeight} ${size}px ${sigmaSettings.labelFont}`;
    const label = typeof data.label === "string" ? data.label : "";
    const pad = 4;
    const textWidth = label ? context.measureText(label).width : 0;
    context.beginPath();
    context.arc(data.x, data.y, data.size + 3, 0, Math.PI * 2);
    context.fillStyle = look.hoverSoft;
    context.fill();
    if (!label) return;
    const x = data.x + data.size + 4;
    const boxHeight = size + pad * 2;
    context.fillStyle = look.surface;
    context.strokeStyle = look.border;
    context.lineWidth = 1;
    context.beginPath();
    context.rect(x, data.y - boxHeight / 2, textWidth + pad * 2, boxHeight);
    context.fill();
    context.stroke();
    context.fillStyle = look.label;
    context.fillText(label, x + pad, data.y + size / 3);
  };

  return (
    <div style={canvasFrame(look, height)}>
      {/* Control panel */}
      <div style={{ ...floatPanelStyle, flexDirection: "column", alignItems: "stretch", minWidth: 180 }}>
        <label style={controlLabelStyle}>
          Layout
          <select
            value={sigmaLayout}
            onChange={(e) => setSigmaLayout(e.target.value)}
            style={selectStyle}
          >
            <option value="fa2">ForceAtlas2</option>
            <option value="circular">Circular</option>
            <option value="grid">Grid</option>
            <option value="radial">Radial (by category)</option>
            <option value="random+noverlap">Random + Noverlap</option>
          </select>
        </label>

        <label style={controlLabelStyle}>
          Node Size
          <select
            value={nodeSizeMode}
            onChange={(e) => setNodeSizeMode(e.target.value)}
            style={selectStyle}
          >
            <option value="degree">By Degree</option>
            <option value="knockdown">By Knockdown</option>
            <option value="mixed">Mixed</option>
            <option value="neighbourCount">By Neighbor Count</option>
            <option value="fixed">Fixed</option>
          </select>
        </label>

        <label style={checkLabelStyle}>
          <input
            type="checkbox"
            checked={showLabels}
            onChange={(e) => setShowLabels(e.target.checked)}
          />
          Show Labels
        </label>
      </div>

      {/* Enhanced Tooltip */}
      {tooltip && (
        <div style={{
          position: "absolute",
          left: "12px",
          top: "12px",
          background: "var(--gs-surface)",
          color: "var(--gs-text)",
          border: "1px solid var(--gs-border-strong)",
          padding: "10px 12px",
          borderRadius: 8,
          fontSize: 12,
          lineHeight: 1.45,
          maxWidth: "300px",
          zIndex: 15,
          boxShadow: "var(--gs-shadow-pop)",
        }}>
          <div style={{ fontWeight: 600, marginBottom: 6, fontSize: 14 }}>
            {tooltip.nodeId}
            {tooltip.geneInfo?.name && (
              <span style={{ fontWeight: 400, color: "var(--gs-muted)", marginLeft: 4 }}>
                ({tooltip.geneInfo.name})
              </span>
            )}
          </div>
          <div>Category: {tooltip.category ?? "N/A"}</div>
          <div>Degree: {tooltip.degree}</div>
          <div>Neighbor Count: {tooltip.neighbourCount}</div>
          {Number.isFinite(tooltip.kd) && <div>Knockdown: {(+tooltip.kd).toFixed(3)}</div>}
          {tooltip.geneInfo?.description && (
            <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid var(--gs-border)", color: "var(--gs-muted)", fontSize: 11, lineHeight: 1.4 }}>
              {tooltip.geneInfo.description}
            </div>
          )}
        </div>
      )}

      <SigmaContainer
        // remounted on a theme switch: label and hover colours are settings
        key={look.mode}
        style={{ width: "100%", height: "100%", background: look.background }}
        graph={graph}
        settings={{
          allowInvalidContainer: true,
          enableEdgeEvents: true,
          renderLabels: showLabels,
          renderEdgeLabels: false,
          labelRenderedSizeThreshold: 8,
          labelSize: 12,
          labelFont: 'Inter, "Segoe UI", Arial, sans-serif',
          labelWeight: '600',
          labelColor: { color: look.label },
          defaultEdgeColor: look.edges.Exp,
          labelDensity: 0.5,
          labelGridCellSize: 100,
          minCameraRatio: 0.1,
          maxCameraRatio: 10,
          // Enhanced interactivity
          enableNodeDrag: true,
          zIndex: true,
          // Provide the label renderer if available
          ...(drawLabel && { labelRenderer: drawLabel }),
          defaultDrawNodeHover: drawThemedHover,
          ...(drawHover && { hoverRenderer: drawThemedHover }),
        }}
      >
        <SigmaAutoFit />
        <SigmaInteractivity
          onNodeHover={handleNodeHover}
          onNodeClick={handleNodeClick}
          selectedNode={selectedNode}
          hoveredNode={hoveredNode}
        />
        <ControlsContainer position="bottom-right">
          <ZoomControl />
          <FullScreenControl />
        </ControlsContainer>
      </SigmaContainer>
    </div>
  );
}


// Enhanced interactivity component for SigmaJS
function SigmaInteractivity({ onNodeHover, onNodeClick, selectedNode, hoveredNode }) {
  const sigma = useSigma?.();

  useEffect(() => {
    if (!sigma) return undefined;

    // Named handlers: the very same function objects are passed to off(), so
    // every listener added here is removed again on cleanup.
    const handleEnterNode = (event) => onNodeHover?.(event.node);
    const handleLeaveNode = () => onNodeHover?.(null);
    const handleClickNode = (event) => onNodeClick?.(event.node);
    const handleClickStage = () => onNodeClick?.(null);

    sigma.on('enterNode', handleEnterNode);
    sigma.on('leaveNode', handleLeaveNode);
    sigma.on('clickNode', handleClickNode);
    sigma.on('clickStage', handleClickStage);

    return () => {
      sigma.off('enterNode', handleEnterNode);
      sigma.off('leaveNode', handleLeaveNode);
      sigma.off('clickNode', handleClickNode);
      sigma.off('clickStage', handleClickStage);
    };
  }, [sigma, onNodeHover, onNodeClick]);

  // Update node highlighting
  useEffect(() => {
    if (!sigma) return;

    const graph = sigma.getGraph();
    if (!graph) return;

    // Reset all nodes
    graph.forEachNode((nodeId) => {
      graph.setNodeAttribute(nodeId, 'highlighted', false);
      graph.setNodeAttribute(nodeId, 'selected', false);
    });

    // Highlight hovered node (it may belong to a previous graph)
    if (hoveredNode && graph.hasNode(hoveredNode)) {
      graph.setNodeAttribute(hoveredNode, 'highlighted', true);
    }

    // Highlight selected node
    if (selectedNode && graph.hasNode(selectedNode)) {
      graph.setNodeAttribute(selectedNode, 'selected', true);
    }

    // Refresh the renderer
    sigma.refresh();
  }, [sigma, hoveredNode, selectedNode]);

  return null;
}

// Show the whole graph when a Sigma instance is created.
// Sigma cameras work in normalised coordinates: (0.5, 0.5) with ratio 1 frames
// the entire graph, whatever the graph's own coordinate range is.
function SigmaAutoFit() {
  const sigma = useSigma?.();
  useEffect(() => {
    if (!sigma) return;
    const g = sigma.getGraph();
    if (!g || g.order === 0) return;
    try {
      sigma.getCamera().setState({ x: 0.5, y: 0.5, ratio: 1, angle: 0 });
    } catch (e) {
      // keep the default camera
    }
  }, [sigma]);
  return null;
}

// ------------------ ForceGraph2D renderer (layouts + drag + details) ------------------
function ForceGraph2DRenderer({ nodes, edges, deg, height, settings, nodeById, maxDegree, look }) {
  const [layout, setLayout] = useState("force"); // 'force' | 'circular' | 'grid' | 'radialByCategory' | 'layersByDegree'
  const [hoverNode, setHoverNode] = useState(null);
  const [hoverLink, setHoverLink] = useState(null);
  const [selNode, setSelNode] = useState(null);
  const [nodeTooltips, setNodeTooltips] = useState({});

  const data = useMemo(
    () => ({
      nodes: nodes.map((n) => ({
        id: n.id,
        category: n.category,
        kd: n.kd,
        degree: deg[n.id] || 0,
      })),
      links: edges.map((e) => ({
        source: e.source,
        target: e.target,
        value: Math.abs(e.value),
        t2: e.Type2,
        Type: e.Type,
      })),
    }),
    [nodes, edges, deg]
  );

  const fgRef = useRef();

  // Force vs static layouts.
  // Static layouts pin every node at its seeded position; "Force" releases the
  // pins and reheats the simulation. The forces themselves are never removed,
  // so switching back to "Force" always works and links stay resolved.
  useEffect(() => {
    const fg = fgRef.current;
    if (!fg) return;

    const n = data.nodes;

    if (layout === "force") {
      fg.d3Force("charge")?.strength(-120);
      fg.d3Force("link")?.distance(80).strength(0.6);
      fg.d3Force("center")?.strength(0.1);
      n.forEach((node) => {
        node.fx = undefined;
        node.fy = undefined;
      });
      fg.d3ReheatSimulation?.();
      return;
    }

    // Static: seed positions and pin them
    if (layout === "circular") seedCircular(n, 260);
    else if (layout === "grid") seedGrid(n);
    else if (layout === "radialByCategory") seedRadialByCategory(n, (x) => x.category, 160);
    else if (layout === "layersByDegree") seedLayersByDegree(n, (x) => x.degree, 90);

    n.forEach((node) => {
      node.fx = node.x;
      node.fy = node.y;
    });

    fg.d3ReheatSimulation?.();
    fg.refresh?.(); // only the 3D graph has refresh()
    try {
      fg.zoomToFit?.(400, 60);
    } catch (e) {
      // zoomToFit can fail before the first frame; harmless
    }
  }, [layout, data]);

  // Drag handlers keep node in place
  const handleNodeDrag = useCallback((node) => {
    node.fx = node.x;
    node.fy = node.y;
  }, []);
  const handleNodeDragEnd = useCallback((node) => {
    node.fx = node.x;
    node.fy = node.y;
  }, []);

  const getNode = (id) => nodeById?.get(id);

  // Fetch gene info on first hover (shared, cached lookup in utils)
  useEffect(() => {
    if (!hoverNode) return undefined;
    const nodeId = hoverNode.id;
    if (nodeTooltips[nodeId] !== undefined) return undefined;

    let cancelled = false;
    getGeneInfo(nodeId).then((geneInfo) => {
      if (cancelled) return;
      // false = looked up, nothing available (stops the "Loading" hint)
      setNodeTooltips((p) => ({ ...p, [nodeId]: geneInfo || false }));
    });
    return () => {
      cancelled = true;
    };
  }, [hoverNode, nodeTooltips]);

  const getNodeLabel = useCallback(
    (n) => {
      const geneInfo = nodeTooltips[n.id];
      let label = escapeHtml(n.id);
      if (geneInfo?.name) label += ` (${escapeHtml(geneInfo.name)})`;
      label += `<br/>Category: ${escapeHtml(n.category ?? "N/A")}`;
      label += `<br/>Degree: ${escapeHtml(n.degree)}`;
      if (Number.isFinite(n.kd)) label += `<br/>KD: ${(+n.kd).toFixed(2)}`;
      if (geneInfo?.description) {
        const d =
          geneInfo.description.length > 120
            ? geneInfo.description.slice(0, 120) + "..."
            : geneInfo.description;
        label += `<br/><br/>${escapeHtml(d)}`;
      } else if (hoverNode?.id === n.id && geneInfo === undefined) {
        label += `<br/><br/>Loading gene info...`;
      }
      return label;
    },
    [nodeTooltips, hoverNode]
  );

  return (
    <div style={canvasFrame(look, height)}>
      <div style={{ ...floatPanelStyle, zIndex: 5 }}>
        <label style={controlLabelStyle}>
          Layout
          <select value={layout} onChange={(e) => setLayout(e.target.value)} style={selectStyle}>
            <option value="force">Force</option>
            <option value="circular">Circular</option>
            <option value="grid">Grid</option>
            <option value="radialByCategory">Radial by Category</option>
            <option value="layersByDegree">Layers by Degree</option>
          </select>
        </label>
      </div>

      <ForceGraph2D
        ref={fgRef}
        graphData={data}
        height={height}
        backgroundColor={look.background}
        cooldownTicks={layout === "force" ? 100 : 0}
        nodeRelSize={1}
        // The library's hit area and arrow offset follow nodeVal (area), not the
        // custom drawing below; without it only a ~2 px centre reacted and the
        // arrowheads were hidden under the node.
        nodeVal={(node) => nodeSize(getNode(node.id) || {}, deg, settings, maxDegree) ** 2}
        enableNodeDrag={true}
        onNodeDrag={handleNodeDrag}
        onNodeDragEnd={handleNodeDragEnd}
        onNodeHover={setHoverNode}
        onLinkHover={setHoverLink}
        onNodeClick={(n) => setSelNode(n)}
        nodeLabel={(n) => getNodeLabel(n)}
        linkLabel={(l) =>
          `${escapeHtml(l.source?.id || l.source)} → ${escapeHtml(l.target?.id || l.target)}<br/>Type: ${escapeHtml(
            l.Type || "N/A"
          )}<br/>Class: ${escapeHtml(l.t2 || "N/A")}${
            Number.isFinite(l.value) ? `<br/>Value: ${(+l.value).toFixed(2)}` : ""
          }`
        }
        linkDirectionalArrowLength={6}
        linkDirectionalArrowRelPos={1}
        linkWidth={(l) => (l === hoverLink ? 3 : l.t2 === "Corr" ? EDGE_WIDTHS.Corr : EDGE_WIDTHS.Exp)}
        linkColor={(l) => (l === hoverLink ? look.hover : edgeColor({ Type2: l.t2 }, look))}
        linkLineDash={(l) => (l.t2 === "Corr" ? [4, 2] : null)}
        linkDirectionalParticles={(l) => (l === hoverLink ? 4 : 0)}
        linkDirectionalParticleSpeed={0.006}
        nodeCanvasObject={(node, ctx, globalScale) => {
          const ndata = getNode(node.id) || {};
          const size = nodeSize(ndata, deg, settings, maxDegree);
          const color = nodeColor(ndata, look);

          if (hoverNode?.id === node.id || selNode?.id === node.id) {
            ctx.beginPath();
            ctx.arc(node.x, node.y, size + 6, 0, 2 * Math.PI, false);
            ctx.fillStyle = look.hoverSoft;
            ctx.fill();
          }

          ctx.beginPath();
          ctx.arc(node.x, node.y, size, 0, 2 * Math.PI, false);
          ctx.fillStyle = color;
          ctx.fill();
          ctx.strokeStyle = look.halo;
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // label with a halo in the background colour
          const fontSize = Math.max(8, 10 / Math.sqrt(globalScale));
          ctx.font = `600 ${fontSize}px Inter, "Segoe UI", sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "top";
          ctx.lineJoin = "round";
          ctx.lineWidth = Math.max(2, fontSize / 4);
          ctx.strokeStyle = look.halo;
          ctx.strokeText(node.id, node.x, node.y + size + 3);
          ctx.fillStyle = look.label;
          ctx.fillText(node.id, node.x, node.y + size + 3);
        }}
      />

      {selNode && (
        <DetailsCard
          node={selNode}
          info={nodeTooltips[selNode.id]}
          onClose={() => setSelNode(null)}
        />
      )}
    </div>
  );
}

// ------------------ ForceGraph3D renderer (layouts + drag + details) ------------------
function ForceGraph3DRenderer({ nodes, edges, deg, height, settings, look }) {
  const [layout, setLayout] = useState("force"); // 'force' | 'circular' | 'grid' | 'radialByCategory' | 'layersByDegree'
  const [hoverNode, setHoverNode] = useState(null);
  const [hoverLink, setHoverLink] = useState(null);
  const [selNode, setSelNode] = useState(null);
  const [nodeTooltips, setNodeTooltips] = useState({});

  const data = useMemo(
    () => ({
      nodes: nodes.map((n) => ({
        id: n.id,
        category: n.category,
        kd: n.kd,
        degree: deg[n.id] || 0,
      })),
      links: edges.map((e) => ({
        source: e.source,
        target: e.target,
        value: Math.abs(e.value),
        t2: e.Type2,
        Type: e.Type,
      })),
    }),
    [nodes, edges, deg]
  );

  const fgRef = useRef();

  // Force vs static layouts.
  // Static layouts pin every node at its seeded position; "Force" releases the
  // pins and reheats the simulation. The forces themselves are never removed,
  // so switching back to "Force" always works and links stay resolved.
  useEffect(() => {
    const fg = fgRef.current;
    if (!fg) return;

    const n = data.nodes;

    if (layout === "force") {
      fg.d3Force("charge")?.strength(-120);
      fg.d3Force("link")?.distance(80).strength(0.6);
      fg.d3Force("center")?.strength(0.1);
      n.forEach((node) => {
        node.fx = undefined;
        node.fy = undefined;
        node.fz = undefined;
      });
      fg.d3ReheatSimulation?.();
      return;
    }

    // Static: seed positions and pin them
    if (layout === "circular") seedCircular3D(n, 260);
    else if (layout === "grid") seedGrid3D(n);
    else if (layout === "radialByCategory") seedRadialByCategory3D(n, (x) => x.category, 160);
    else if (layout === "layersByDegree") seedLayersByDegree3D(n, (x) => x.degree, 120);

    n.forEach((node) => {
      node.fx = node.x;
      node.fy = node.y;
      node.fz = node.z;
    });

    fg.d3ReheatSimulation?.();
    fg.refresh?.(); // only the 3D graph has refresh()
    try {
      fg.zoomToFit?.(400, 60);
    } catch (e) {
      // zoomToFit can fail before the first frame; harmless
    }
  }, [layout, data]);

  // Drag handlers keep node in place
  const handleNodeDrag = useCallback((node) => {
    node.fx = node.x;
    node.fy = node.y;
    node.fz = node.z;
  }, []);
  const handleNodeDragEnd = useCallback((node) => {
    node.fx = node.x;
    node.fy = node.y;
    node.fz = node.z;
  }, []);

  // Note: getNode is defined but not currently used
  // const getNode = (id) => nodes.find((n) => n.id === id);

  // Fetch gene info on first hover (shared, cached lookup in utils)
  useEffect(() => {
    if (!hoverNode) return undefined;
    const nodeId = hoverNode.id;
    if (nodeTooltips[nodeId] !== undefined) return undefined;

    let cancelled = false;
    getGeneInfo(nodeId).then((geneInfo) => {
      if (cancelled) return;
      // false = looked up, nothing available (stops the "Loading" hint)
      setNodeTooltips((p) => ({ ...p, [nodeId]: geneInfo || false }));
    });
    return () => {
      cancelled = true;
    };
  }, [hoverNode, nodeTooltips]);

  const getNodeLabel = useCallback(
    (n) => {
      const geneInfo = nodeTooltips[n.id];
      let label = escapeHtml(n.id);
      if (geneInfo?.name) label += ` (${escapeHtml(geneInfo.name)})`;
      label += `<br/>Category: ${escapeHtml(n.category ?? "N/A")}`;
      label += `<br/>Degree: ${escapeHtml(n.degree)}`;
      if (Number.isFinite(n.kd)) label += `<br/>KD: ${(+n.kd).toFixed(2)}`;
      if (geneInfo?.description) {
        const d =
          geneInfo.description.length > 120
            ? geneInfo.description.slice(0, 120) + "..."
            : geneInfo.description;
        label += `<br/><br/>${escapeHtml(d)}`;
      } else if (hoverNode?.id === n.id && geneInfo === undefined) {
        label += `<br/><br/>Loading gene info...`;
      }
      return label;
    },
    [nodeTooltips, hoverNode]
  );

  return (
    <div style={canvasFrame(look, height)}>
      <div style={{ ...floatPanelStyle, zIndex: 5 }}>
        <label style={controlLabelStyle}>
          Layout
          <select value={layout} onChange={(e) => setLayout(e.target.value)} style={selectStyle}>
            <option value="force">Force</option>
            <option value="circular">Circular</option>
            <option value="grid">Grid</option>
            <option value="radialByCategory">Radial by Category</option>
            <option value="layersByDegree">Layers by Degree</option>
          </select>
        </label>
      </div>

      <ForceGraph3D
        ref={fgRef}
        graphData={data}
        height={height}
        backgroundColor={look.background}
        cooldownTicks={layout === "force" ? 100 : 0}
        nodeRelSize={4}
        enableNodeDrag={true}
        onNodeDrag={handleNodeDrag}
        onNodeDragEnd={handleNodeDragEnd}
        onNodeHover={setHoverNode}
        onLinkHover={setHoverLink}
        onNodeClick={(n) => setSelNode(n)}
        nodeLabel={(n) => getNodeLabel(n)}
        linkLabel={(l) =>
          `${escapeHtml(l.source?.id || l.source)} → ${escapeHtml(l.target?.id || l.target)}<br/>Type: ${escapeHtml(
            l.Type || "N/A"
          )}<br/>Class: ${escapeHtml(l.t2 || "N/A")}${
            Number.isFinite(l.value) ? `<br/>Value: ${(+l.value).toFixed(2)}` : ""
          }`
        }
        linkDirectionalArrowLength={4}
        linkDirectionalArrowRelPos={1}
        linkWidth={(l) => (l === hoverLink ? 2.5 : l.t2 === "Corr" ? 1 : 1.4)}
        linkColor={(l) => (l === hoverLink ? look.hover : edgeColor({ Type2: l.t2 }, look))}
        linkOpacity={0.6}
        linkDirectionalParticles={(l) => (l === hoverLink ? 6 : 0)}
        linkDirectionalParticleSpeed={0.01}
        // Default 3D node (sphere) color:
        nodeColor={(n) => nodeColor(n, look)}
        nodeOpacity={0.95}
      />

      {selNode && (
        <DetailsCard
          node={selNode}
          info={nodeTooltips[selNode.id]}
          onClose={() => setSelNode(null)}
        />
      )}
    </div>
  );
}

// ------------------ Shared UI bits ------------------
function DetailsCard({ node, info, onClose }) {
  return (
    <div
      style={{
        position: "absolute",
        right: 12,
        top: 70,
        zIndex: 6,
        background: "var(--gs-surface)",
        color: "var(--gs-text)",
        border: "1px solid var(--gs-border-strong)",
        padding: "10px 12px",
        borderRadius: 8,
        boxShadow: "var(--gs-shadow-pop)",
        minWidth: 220,
        maxWidth: 350,
        fontSize: 12,
        lineHeight: 1.45,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <strong>
          {node.id}
          {info?.name && (
            <span style={{ fontWeight: "normal", fontSize: 11, color: "var(--gs-muted)" }}>
              {" "}
              ({info.name})
            </span>
          )}
        </strong>
        <button
          onClick={onClose}
          style={{ border: 0, background: "transparent", color: "var(--gs-muted)", cursor: "pointer", fontSize: 16 }}
          aria-label="Close details"
          title="Close"
        >
          ✕
        </button>
      </div>
      <div>Category: {node.category ?? "N/A"}</div>
      <div>Degree: {node.degree ?? 0}</div>
      {Number.isFinite(node.kd) && <div>KD: {(+node.kd).toFixed(2)}</div>}
      {info?.description && (
        <div
          style={{
            marginTop: 8,
            paddingTop: 8,
            borderTop: "1px solid var(--gs-border)",
            fontSize: 11,
            lineHeight: 1.4,
            color: "var(--gs-muted)",
          }}
        >
          {info.description}
        </div>
      )}
    </div>
  );
}

// ------------------ Static layout seeders (2D) ------------------
function seedCircular(arr, r = 200) {
  const n = arr.length || 1;
  arr.forEach((node, i) => {
    const a = (2 * Math.PI * i) / n;
    node.x = r * Math.cos(a);
    node.y = r * Math.sin(a);
  });
}
function seedGrid(arr, cols = Math.ceil(Math.sqrt(arr.length)), gap = 40) {
  arr.forEach((node, i) => {
    const row = Math.floor(i / cols),
      col = i % cols;
    node.x = col * gap;
    node.y = row * gap;
  });
}
function seedRadialByCategory(arr, getCat = (n) => n.category, ringGap = 140) {
  const groups = new Map();
  arr.forEach((n) => {
    const c = getCat(n) ?? "0";
    if (!groups.has(c)) groups.set(c, []);
    groups.get(c).push(n);
  });
  const cats = [...groups.keys()].sort();
  cats.forEach((c, idx) => {
    const ring = (idx + 1) * ringGap;
    seedCircular(groups.get(c), ring);
  });
}
function seedLayersByDegree(arr, getDeg = (n) => n.degree, gap = 70) {
  const byDeg = new Map();
  arr.forEach((n) => {
    const d = getDeg(n) || 0;
    if (!byDeg.has(d)) byDeg.set(d, []);
    byDeg.get(d).push(n);
  });
  const degs = [...byDeg.keys()].sort((a, b) => a - b);
  degs.forEach((d, i) => {
    const layer = byDeg.get(d);
    const y = i * gap;
    seedCircular(layer, 200);
    layer.forEach((n) => {
      n.y += y;
    });
  });
}

// ------------------ Static layout seeders (3D) ------------------
function seedCircular3D(arr, r = 200) {
  const n = arr.length || 1;
  arr.forEach((node, i) => {
    const a = (2 * Math.PI * i) / n;
    node.x = r * Math.cos(a);
    node.y = r * Math.sin(a);
    node.z = 0;
  });
}
function seedGrid3D(arr, cols = Math.ceil(Math.sqrt(arr.length)), gap = 40) {
  arr.forEach((node, i) => {
    const row = Math.floor(i / cols),
      col = i % cols;
    node.x = col * gap;
    node.y = row * gap;
    node.z = (Math.random() - 0.5) * gap; // small depth jitter
  });
}
function seedRadialByCategory3D(arr, getCat = (n) => n.category, ringGap = 140) {
  const groups = new Map();
  arr.forEach((n) => {
    const c = getCat(n) ?? "0";
    if (!groups.has(c)) groups.set(c, []);
    groups.get(c).push(n);
  });
  const cats = [...groups.keys()].sort();
  cats.forEach((c, idx) => {
    const ring = (idx + 1) * ringGap;
    const g = groups.get(c);
    const n = g.length || 1;
    g.forEach((node, i) => {
      const a = (2 * Math.PI * i) / n;
      node.x = ring * Math.cos(a);
      node.y = ring * Math.sin(a);
      node.z = (idx - cats.length / 2) * 80; // stacked rings in Z
    });
  });
}
function seedLayersByDegree3D(arr, getDeg = (n) => n.degree, gap = 120) {
  const byDeg = new Map();
  arr.forEach((n) => {
    const d = getDeg(n) || 0;
    if (!byDeg.has(d)) byDeg.set(d, []);
    byDeg.get(d).push(n);
  });
  const degs = [...byDeg.keys()].sort((a, b) => a - b);
  degs.forEach((d, i) => {
    const layer = byDeg.get(d);
    const z = (i - degs.length / 2) * gap;
    seedCircular(layer, 200);
    layer.forEach((n) => {
      n.z = z;
    });
  });
}

// ------------------ Direct Sigma renderer (using direct sigma library) ------------------
function DirectSigmaRenderer({ nodes, edges, deg, height, settings, look }) {
  const containerRef = useRef(null);
  const sigmaRef = useRef(null);

  useEffect(() => {
    if (!DirectSigma || !containerRef.current) return;

    try {
      // Create a new graph instance
      // multi: true - parallel Exp/Corr edges between the same genes are allowed
      const g = new GraphClass({ multi: true, type: "directed", allowSelfLoops: false });

      // Add nodes
      const radius = Math.max(50, nodes.length * 3);
      nodes.forEach((n, i) => {
        if (!n?.id) return;
        const angle = (2 * Math.PI * i) / nodes.length;
        const x = Number.isFinite(n.x) ? n.x : radius * Math.cos(angle);
        const y = Number.isFinite(n.y) ? n.y : radius * Math.sin(angle);
        const size = 5 + Math.min(15, (deg[n.id] || 0) * 1.2);
        
        g.addNode(String(n.id), {
          x,
          y,
          size,
          label: String(n.id),
          color: nodeColor(n, look),
          category: n.category,
          kd: n.kd,
          degree: deg[n.id] || 0,
        });
      });

      // Add edges
      edges.forEach((e) => {
        const s = String(e.source);
        const t = String(e.target);
        if (s === t || !g.hasNode(s) || !g.hasNode(t)) return;
        
        g.addEdge(s, t, {
          size: edgeWidth(e),
          color: edgeColor(e, look),
          Type2: e.Type2,
          Type: e.Type,
          value: e.value,
        });
      });

      // Apply layout
      switch (settings?.sigmaLayout) {
        case "circular":
          circular?.assign?.(g);
          break;
        case "grid":
          grid?.assign?.(g, { dimensions: 2 });
          break;
        case "radial":
          radial?.assign?.(g, {
            attributes: { node: "category" },
          });
          break;
        case "random+noverlap":
          randomLayout?.assign?.(g);
          noverlap?.assign?.(g, { margin: 2 });
          break;
        case "fa2":
        default:
          if (forceAtlas2?.assign) {
            forceAtlas2.assign(g, {
              iterations: 250,
              settings: {
                slowDown: 10,
                gravity: 1.2,
                startingIterations: 5,
                barnesHutOptimize: g.order > 100,
                scalingRatio: 10,
              },
            });
          }
      }

      // Create Sigma instance
      const sigma = new DirectSigma(g, containerRef.current, {
        labelColor: { color: look.label },
        defaultEdgeColor: look.edges.Exp,
      });
      sigmaRef.current = sigma;

      return () => {
        if (sigmaRef.current) {
          sigmaRef.current.kill();
          sigmaRef.current = null;
        }
        g?.clear?.();
      };
    } catch (err) {
      console.error("DirectSigmaRenderer error:", err);
    }
  }, [nodes, edges, deg, settings, look]);

  return (
    <div style={canvasFrame(look, height)}>
      <div style={{ ...floatPanelStyle, zIndex: 5 }}>
        <label style={{ fontSize: 11, fontWeight: 600, color: "var(--gs-muted)" }}>Layout</label>
        <select 
          value={settings?.sigmaLayout || "fa2"} 
          onChange={(e) => {
            // This would need to be handled by parent component
            console.log("Layout change:", e.target.value);
          }} 
          style={selectStyle}
        >
          <option value="fa2">ForceAtlas2</option>
          <option value="circular">Circular</option>
          <option value="grid">Grid</option>
          <option value="radial">Radial (by category)</option>
          <option value="random+noverlap">Random + Noverlap</option>
        </select>
      </div>
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
    </div>
  );
}

// ------------------ Fallback renderers ------------------
function CytoscapeFallback({ nodes, edges, height }) {
  return (
    <div
      style={fallbackStyle(height)}
    >
      <div>
        <h3>Cytoscape Not Available</h3>
        <p>
          Install: <code>npm i react-cytoscapejs cytoscape</code>
        </p>
        <p>
          {nodes.length} nodes, {edges.length} edges ready to render
        </p>
      </div>
    </div>
  );
}

function SigmaFallback({ nodes, edges, height }) {
  return (
    <div
      style={fallbackStyle(height)}
    >
      <div>
        <h3>Sigma.js Not Available</h3>
        <p>
          Install:{" "}
          <code>npm i @react-sigma/core graphology graphology-layout-forceatlas2 graphology-layout graphology-layout-noverlap</code>
        </p>
        <p>
          {nodes.length} nodes, {edges.length} edges ready to render
        </p>
      </div>
    </div>
  );
}
