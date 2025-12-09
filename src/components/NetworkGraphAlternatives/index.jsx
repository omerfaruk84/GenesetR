// NetworkGraphAlternatives.jsx
// Network visualization with multiple renderer options + graceful fallbacks
// Sigma fixed (auto-fit, seeded positions), Cytoscape stable layout, ForceGraph 2D/3D layouts

import React, { useMemo, useState, useEffect, useRef, useCallback } from "react";
import ForceGraph2D from "react-force-graph-2d";
import ForceGraph3D from "react-force-graph-3d";
import { fetchGeneInfo, cleanGeneSymbol } from "../../utils/geneFunctionUtils";

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
const CATEGORY_COLORS = {
  0: "#7c3aed", // UPR
  1: "#0ea5e9", // UNR
  2: "#22c55e", // DPR
  3: "#eab308", // DNR
  default: "#94a3b8",
};

const EDGE_STYLES = {
  Exp: { color: "#64748b", width: 1.8, dash: false },
  Corr: { color: "#ef4444", width: 1.2, dash: true },
};

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

function nodeColor(n, settings) {
  const cat = n?.category;
  return CATEGORY_COLORS[cat ?? "default"] || CATEGORY_COLORS.default;
}

function edgeColor(e) {
  const style = EDGE_STYLES[e.Type2] || EDGE_STYLES.Exp;
  return style.color;
}

function edgeWidth(e) {
  const style = EDGE_STYLES[e.Type2] || EDGE_STYLES.Exp;
  return style.width;
}

function nodeSize(n, deg, settings) {
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
    const maxNeighbours = Math.max(10, Math.max(...Object.values(deg)));
    const sizeRange = maxSize - minSize;
    const neighbourRange = maxNeighbours - minNeighbours;
    
    if (neighbourRange > 0) {
      const normalizedCount = (neighbourCount - minNeighbours) / neighbourRange;
      return minSize + normalizedCount * sizeRange;
    }
    return baseSize + Math.min(6, neighbourCount);
  }
  return baseSize + Math.min(6, degree);
}

// ------------------ Main exported component ------------------
export default function NetworkGraphAlternatives({
  graph,
  settings,
  height = 640,
  initialRenderer = "Cytoscape",
}) {
  const [renderer, setRenderer] = useState(initialRenderer);
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

  const common = { nodes: filteredNodes, edges: filteredEdges, deg, height, settings };

  return (
    <div style={{ display: "grid", gridTemplateRows: "auto 1fr", gap: 12 }}>
      <Header renderer={renderer} setRenderer={setRenderer} />
      <div style={{ height }}>
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
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <strong style={{ fontSize: 16 }}>Renderer:</strong>
      <select
        value={renderer}
        onChange={(e) => setRenderer(e.target.value)}
        style={{ padding: 6 }}
      >
        {renderers.map((r) => (
          <option
            key={r.value}
            value={r.value}
            style={{ color: r.available ? "black" : "gray" }}
          >
            {r.label}
          </option>
        ))}
      </select>
      <span style={{ opacity: 0.7, marginLeft: 8 }}>
        {CytoscapeComponent || SigmaContainer
          ? "Advanced renderers available!"
          : "Install renderers: npm i react-cytoscapejs cytoscape @react-sigma/core graphology"}
      </span>
    </div>
  );
}

// ------------------ Cytoscape renderer (stable layout + rich tooltips) ------------------
function CytoscapeRenderer({ nodes, edges, deg, height, settings }) {
  const [layoutName, setLayoutName] = useState(settings?.cyLayout || "cose");
  const [colorMode, setColorMode] = useState(
    settings?.cyColorMode ||
      (settings?.nodeStyle === "degree" ? "degree" : "category")
  );
  const [showLabels, setShowLabels] = useState(settings?.cyShowLabels ?? true);
  const cyRef = useRef(null);
  const [geneInfoCache, setGeneInfoCache] = useState({});

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
        return { ...base, name: "cose", nodeOverlap: 10, idealEdgeLength: 80 };
    }
  }, [layoutName]);

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
      if (!node) return CATEGORY_COLORS.default;
      if (colorMode === "degree") {
        const val = deg[node.id] || 0;
        const { min, max } = degreeStats;
        const denom = max - min || 1;
        const t = clamp((val - min) / denom);
        return blend(["#c7d2fe", "#6366f1", "#312e81"], t);
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
      return nodeColor(node, settings);
    };
  }, [colorMode, degreeStats, kdStats, deg, settings]);

  const stylesheet = useMemo(
    () => [
      {
        selector: "node",
        style: {
          label: showLabels ? "data(label)" : "",
          "background-color": (ele) => {
            const node = nodes.find((n) => n.id === ele.id());
            return colorForNode(node);
          },
          width: (ele) => {
            const node = nodes.find((n) => n.id === ele.id());
            return nodeSize(node || {}, deg, settings) * 2;
          },
          height: (ele) => {
            const node = nodes.find((n) => n.id === ele.id());
            return nodeSize(node || {}, deg, settings) * 2;
          },
          color: "#0f172a",
          "font-size": 10,
          "text-valign": "center",
          "text-halign": "center",
          "border-width": 1,
          "border-color": "#e2e8f0",
        },
      },
      {
        selector: "edge",
        style: {
          width: (ele) => edgeWidth({ Type2: ele.data("Type2") }),
          "line-color": (ele) => edgeColor({ Type2: ele.data("Type2") }),
          "target-arrow-color": (ele) => edgeColor({ Type2: ele.data("Type2") }),
          "curve-style": "bezier",
          "target-arrow-shape": "triangle",
          "line-style": (ele) =>
            ele.data("Type2") === "Corr" ? "dashed" : "solid",
        },
      },
    ],
    [nodes, deg, settings, colorForNode, showLabels]
  );

  // Run layout ONLY when data size or layoutName changes
  const dataKey = useMemo(
    () => `${nodes.length}:${edges.length}:${layoutName}`,
    [nodes.length, edges.length, layoutName]
  );

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    const layout = cy.layout(layoutOptions);
    layout.run();
  }, [dataKey, layoutOptions]);

  // Tooltips (do not trigger layout)
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    let tooltip = document.getElementById("cy-tooltip");
    if (!tooltip) {
      tooltip = document.createElement("div");
      tooltip.id = "cy-tooltip";
      tooltip.style.cssText = `
        position: fixed;
        background: rgba(0,0,0,0.85);
        color: white;
        padding: 8px 12px;
        border-radius: 6px;
        font-size: 12px;
        pointer-events: none;
        z-index: 9999;
        display: none;
        max-width: 350px;
        line-height: 1.4;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      `;
      document.body.appendChild(tooltip);
    }

    const showTooltip = (e, content) => {
      tooltip.innerHTML = content;
      tooltip.style.display = "block";
      tooltip.style.left = e.originalEvent.clientX + 10 + "px";
      tooltip.style.top = e.originalEvent.clientY + 10 + "px";
    };
    const hideTooltip = () => (tooltip.style.display = "none");

    cy.on("mouseover", "node", async (e) => {
      const node = e.target;
      const nodeId = node.id();
      const category = node.data("category");
      const kd = node.data("kd");
      const degree = node.data("degree");

      let html = `<div style="font-weight:600;margin-bottom:4px;">${nodeId}</div>`;
      html += `<div>Category: ${category ?? "N/A"}</div>`;
      html += `<div>Degree: ${degree}</div>`;
      if (Number.isFinite(kd)) html += `<div>Knockdown: ${(+kd).toFixed(3)}</div>`;
      html += `<div style="font-style:italic;color:#ccc;margin-top:4px;">Loading gene info...</div>`;
      showTooltip(e, html);

      try {
        const clean = cleanGeneSymbol(nodeId);
        let geneInfo = geneInfoCache[clean];
        if (!geneInfo) {
          const cached = localStorage.getItem(clean);
          if (cached) {
            geneInfo = JSON.parse(cached);
            setGeneInfoCache((p) => ({ ...p, [clean]: geneInfo }));
          } else {
            const content = await fetchGeneInfo(nodeId);
            if (content) {
              geneInfo = typeof content === "string" ? JSON.parse(content) : content;
              localStorage.setItem(clean, JSON.stringify(geneInfo));
              setGeneInfoCache((p) => ({ ...p, [clean]: geneInfo }));
            }
          }
        }
        if (geneInfo && tooltip.style.display === "block") {
          let enhanced = `<div style="font-weight:600;margin-bottom:4px;">${nodeId}`;
          if (geneInfo.name) enhanced += ` (${geneInfo.name})`;
          enhanced += `</div>`;
          enhanced += `<div>Category: ${category ?? "N/A"}</div>`;
          enhanced += `<div>Degree: ${degree}</div>`;
          if (Number.isFinite(kd)) enhanced += `<div>Knockdown: ${(+kd).toFixed(3)}</div>`;
          if (geneInfo.description) {
            enhanced += `<div style="margin-top:6px;padding-top:6px;border-top:1px solid rgba(255,255,255,0.2);">${geneInfo.description}</div>`;
          }
          tooltip.innerHTML = enhanced;
        }
      } catch (err) {
        console.error("Gene info error:", err);
      }
    });

    cy.on("mouseout", "node", hideTooltip);

    cy.on("mouseover", "edge", (e) => {
      const edge = e.target;
      const source = edge.source().id();
      const target = edge.target().id();
      const type = edge.data("Type");
      const type2 = edge.data("Type2");
      const value = edge.data("value");
      let html = `<div style="font-weight:600;margin-bottom:4px;">${source} → ${target}</div>`;
      html += `<div>Type: ${type || "N/A"}</div>`;
      html += `<div>Class: ${type2}</div>`;
      if (Number.isFinite(value)) html += `<div>Value: ${(+value).toFixed(3)}</div>`;
      showTooltip(e, html);
    });
    cy.on("mouseout", "edge", hideTooltip);

    return () => {
      cy.off("mouseover", "node");
      cy.off("mouseout", "node");
      cy.off("mouseover", "edge");
      cy.off("mouseout", "edge");
      const el = document.getElementById("cy-tooltip");
      if (el) el.remove();
    };
  }, [geneInfoCache]);

  return (
    <div style={{ position: "relative", width: "100%", height }}>
      <div
        style={{
          position: "absolute",
          top: 12,
          right: 12,
          zIndex: 10,
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          background: "rgba(255,255,255,0.92)",
          padding: "8px 12px",
          borderRadius: 8,
          boxShadow: "0 4px 12px rgba(15, 23, 42, 0.12)",
        }}
      >
        <label style={{ display: "flex", flexDirection: "column", fontSize: 11, color: "#1f2937" }}>
          Layout
          <select
            value={layoutName}
            onChange={(e) => setLayoutName(e.target.value)}
            style={{ marginTop: 4, padding: "4px 6px", fontSize: 12 }}
          >
            <option value="cose">CoSE (force)</option>
            <option value="concentric">Concentric</option>
            <option value="breadthfirst">Breadth-First</option>
            <option value="circle">Circle</option>
            <option value="grid">Grid</option>
          </select>
        </label>
        <label style={{ display: "flex", flexDirection: "column", fontSize: 11, color: "#1f2937" }}>
          Color
          <select
            value={colorMode}
            onChange={(e) => setColorMode(e.target.value)}
            style={{ marginTop: 4, padding: "4px 6px", fontSize: 12 }}
          >
            <option value="category">Category</option>
            <option value="degree">Degree</option>
            <option value="kd">Knockdown</option>
          </select>
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#1f2937" }}>
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
function SigmaRenderer({ nodes, edges, deg, height, settings }) {
  const [sigmaLayout, setSigmaLayout] = useState("fa2");
  const [hoveredNode, setHoveredNode] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [geneInfoCache, setGeneInfoCache] = useState({});
  const [tooltip, setTooltip] = useState(null);
  const [showLabels, setShowLabels] = useState(true);
  const [nodeSizeMode, setNodeSizeMode] = useState("degree"); // 'degree' | 'knockdown' | 'fixed'
  
  // Create the graph with enhanced features
  const graph = useMemo(() => {
    if (!GraphClass) return null;
    
    const g = new GraphClass({ multi: false, type: "directed", allowSelfLoops: false });

    // Add nodes with enhanced properties
      const radius = Math.max(50, nodes.length * 3);
      nodes.forEach((n, i) => {
        if (!n?.id) return;
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
        const maxNeighbours = Math.max(10, Math.max(...nodes.map(n => n.neighbourCount || 0)));
        const sizeRange = maxSize - minSize;
        const neighbourRange = maxNeighbours - minNeighbours;
        
        if (neighbourRange > 0) {
          const normalizedCount = (neighbourCount - minNeighbours) / neighbourRange;
          size = minSize + normalizedCount * sizeRange;
        } else {
          size = 8 + Math.min(6, neighbourCount);
        }
      }
      
          g.addNode(String(n.id), {
            x,
            y,
            size,
            label: String(n.id),
            color: nodeColor(n, settings),
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
            color: edgeColor(e),
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
  }, [nodes, edges, deg, settings, sigmaLayout, nodeSizeMode]);

  // Enhanced tooltip system
  const handleNodeHover = useCallback(async (nodeId) => {
    if (!nodeId) {
      setTooltip(null);
      setHoveredNode(null);
      return;
    }

    setHoveredNode(nodeId);
    
    // Fetch gene information
    const clean = cleanGeneSymbol(nodeId);
    let geneInfo = geneInfoCache[clean];
    
    if (!geneInfo) {
      try {
        const cached = localStorage.getItem(clean);
        if (cached) {
          geneInfo = JSON.parse(cached);
          setGeneInfoCache(prev => ({ ...prev, [clean]: geneInfo }));
        } else {
          const content = await fetchGeneInfo(nodeId);
          if (content) {
            geneInfo = typeof content === "string" ? JSON.parse(content) : content;
            localStorage.setItem(clean, JSON.stringify(geneInfo));
            setGeneInfoCache(prev => ({ ...prev, [clean]: geneInfo }));
          }
        }
      } catch (err) {
        console.error("Gene info error:", err);
      }
    }

    const node = nodes.find(n => n.id === nodeId);
    setTooltip({
      nodeId,
      node,
      geneInfo,
      degree: deg[nodeId] || 0,
      neighbourCount: node?.neighbourCount || 0,
      category: node?.category,
      kd: node?.kd,
    });
  }, [nodes, deg, geneInfoCache]);

  // Search functionality
  // Note: filteredNodes is computed but currently not used in rendering
  // const filteredNodes = useMemo(() => {
  //   if (!searchTerm) return nodes;
  //   return nodes.filter(n => 
  //     n.id.toLowerCase().includes(searchTerm.toLowerCase())
  //   );
  // }, [nodes, searchTerm]);

  if (!graph) {
    return <SigmaFallback nodes={nodes} edges={edges} height={height} />;
  }

  return (
    <div style={{ width: "100%", height, position: "relative", background: "#fff", borderRadius: 8, overflow: "hidden" }}>
      {/* Enhanced Control Panel */}
      <div style={{ 
        position: "absolute", 
        top: 12, 
        right: 12, 
        zIndex: 10, 
        background: "rgba(255,255,255,0.95)", 
        padding: "12px", 
        borderRadius: 8, 
        border: "1px solid #e5e7eb",
        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        minWidth: "200px"
      }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Controls</div>
        
        {/* Layout Selection */}
        <div>
          <label style={{ fontSize: 11, color: "#666", display: "block", marginBottom: 2 }}>Layout</label>
          <select 
            value={sigmaLayout} 
            onChange={(e) => setSigmaLayout(e.target.value)} 
            style={{ fontSize: 11, padding: "4px 6px", width: "100%" }}
          >
            <option value="fa2">ForceAtlas2</option>
            <option value="circular">Circular</option>
            <option value="grid">Grid</option>
            <option value="radial">Radial (by category)</option>
            <option value="random+noverlap">Random + Noverlap</option>
          </select>
        </div>

        {/* Node Size Mode */}
        <div>
          <label style={{ fontSize: 11, color: "#666", display: "block", marginBottom: 2 }}>Node Size</label>
          <select 
            value={nodeSizeMode} 
            onChange={(e) => setNodeSizeMode(e.target.value)} 
            style={{ fontSize: 11, padding: "4px 6px", width: "100%" }}
          >
            <option value="degree">By Degree</option>
            <option value="knockdown">By Knockdown</option>
            <option value="mixed">Mixed</option>
            <option value="neighbourCount">By Neighbor Count</option>
            <option value="fixed">Fixed</option>
          </select>
        </div>

        {/* Toggle Labels */}
        <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11 }}>
          <input
            type="checkbox"
            checked={showLabels}
            onChange={(e) => setShowLabels(e.target.checked)}
          />
          Show Labels
        </label>

        {/* Search */}
        <div>
          <label style={{ fontSize: 11, color: "#666", display: "block", marginBottom: 2 }}>Search Gene</label>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Type gene name..."
            style={{ fontSize: 11, padding: "4px 6px", width: "100%", border: "1px solid #ddd", borderRadius: 4 }}
          />
        </div>
      </div>

      {/* Enhanced Tooltip */}
      {tooltip && (
        <div style={{
          position: "absolute",
          left: "12px",
          top: "12px",
          background: "rgba(0,0,0,0.9)",
          color: "white",
          padding: "12px",
          borderRadius: 8,
          fontSize: 12,
          maxWidth: "300px",
          zIndex: 15,
          boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
        }}>
          <div style={{ fontWeight: 600, marginBottom: 6, fontSize: 14 }}>
            {tooltip.nodeId}
            {tooltip.geneInfo?.name && (
              <span style={{ fontWeight: 400, color: "#ccc", marginLeft: 4 }}>
                ({tooltip.geneInfo.name})
              </span>
            )}
          </div>
          <div>Category: {tooltip.category ?? "N/A"}</div>
          <div>Degree: {tooltip.degree}</div>
          <div>Neighbor Count: {tooltip.neighbourCount}</div>
          {Number.isFinite(tooltip.kd) && <div>Knockdown: {(+tooltip.kd).toFixed(3)}</div>}
          {tooltip.geneInfo?.description && (
            <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid rgba(255,255,255,0.2)", fontSize: 11, lineHeight: 1.4 }}>
              {tooltip.geneInfo.description}
            </div>
          )}
        </div>
      )}

      <SigmaContainer
        style={{ width: "100%", height: "100%", background: "#fafafa" }}
        graph={graph}
        settings={{
          allowInvalidContainer: true,
          enableEdgeEvents: true,
          renderLabels: showLabels,
          renderEdgeLabels: false,
          labelRenderedSizeThreshold: 8,
          labelSize: 12,
          labelFont: 'Arial, sans-serif',
          labelWeight: 'normal',
          labelColor: { color: '#000' },
          labelDensity: 0.5,
          labelGridCellSize: 100,
          minCameraRatio: 0.1,
          maxCameraRatio: 10,
          // Enhanced interactivity
          enableNodeDrag: true,
          zIndex: true,
          // Provide the label renderer if available
          ...(drawLabel && { labelRenderer: drawLabel }),
          ...(drawHover && { hoverRenderer: drawHover }),
        }}
      >
        <SigmaAutoFit />
        <SigmaInteractivity 
          onNodeHover={handleNodeHover}
          onNodeClick={(nodeId) => setSelectedNode(nodeId)}
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
    if (!sigma) return;

    const handleNodeHover = (event) => {
      const nodeId = event.node;
      if (onNodeHover) {
        onNodeHover(nodeId);
      }
    };

    const handleNodeClick = (event) => {
      const nodeId = event.node;
      if (onNodeClick) {
        onNodeClick(nodeId);
      }
    };

    const handleStageClick = () => {
      if (onNodeClick) {
        onNodeClick(null);
      }
    };

    // Add event listeners
    sigma.on('enterNode', handleNodeHover);
    sigma.on('leaveNode', () => onNodeHover?.(null));
    sigma.on('clickNode', handleNodeClick);
    sigma.on('clickStage', handleStageClick);

    return () => {
      sigma.off('enterNode', handleNodeHover);
      sigma.off('leaveNode', () => onNodeHover?.(null));
      sigma.off('clickNode', handleNodeClick);
      sigma.off('clickStage', handleStageClick);
    };
  }, [sigma, onNodeHover, onNodeClick]);

  // Update node highlighting
  useEffect(() => {
    if (!sigma) return;
    
    const graph = sigma.getGraph();
    if (!graph) return;

    // Reset all nodes
    graph.forEachNode((nodeId, attributes) => {
      graph.setNodeAttribute(nodeId, 'highlighted', false);
      graph.setNodeAttribute(nodeId, 'selected', false);
    });

    // Highlight hovered node
    if (hoveredNode) {
      graph.setNodeAttribute(hoveredNode, 'highlighted', true);
    }

    // Highlight selected node
    if (selectedNode) {
      graph.setNodeAttribute(selectedNode, 'selected', true);
    }

    // Refresh the renderer
    sigma.refresh();
  }, [sigma, hoveredNode, selectedNode]);

  return null;
}

// Auto-fit camera to current graph bounds (once per mount)
function SigmaAutoFit({ padding = 60 }) {
  const sigma = useSigma?.();
  useEffect(() => {
    if (!sigma) return;
    const g = sigma.getGraph();
    if (!g || g.order === 0) return;

    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    g.forEachNode((key, a) => {
      if (Number.isFinite(a.x) && Number.isFinite(a.y)) {
        minX = Math.min(minX, a.x);
        minY = Math.min(minY, a.y);
        maxX = Math.max(maxX, a.x);
        maxY = Math.max(maxY, a.y);
      }
    });
    if (!isFinite(minX)) return;

    const width = sigma.getContainer().clientWidth || 1;
    const height = sigma.getContainer().clientHeight || 1;
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const dx = (maxX - minX) + padding;
    const dy = (maxY - minY) + padding;
    const ratio = Math.max(dx / width, dy / height) || 1;

    sigma.getCamera().setState({ x: cx, y: cy, ratio: ratio * 1.1 });
  }, [sigma, padding]);
  return null;
}

// ------------------ ForceGraph2D renderer (layouts + drag + details) ------------------
function ForceGraph2DRenderer({ nodes, edges, deg, height, settings }) {
  const [layout, setLayout] = useState("force"); // 'force' | 'circular' | 'grid' | 'radialByCategory' | 'layersByDegree'
  const [hoverNode, setHoverNode] = useState(null);
  const [hoverLink, setHoverLink] = useState(null);
  const [selNode, setSelNode] = useState(null);
  const [geneInfoCache, setGeneInfoCache] = useState({});
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

  // Force vs static layouts
  useEffect(() => {
    const fg = fgRef.current;
    if (!fg) return;
    const sim = fg.d3Force; // function accessor

    if (layout === "force") {
      sim("charge")?.strength(-120);
      sim("link")?.distance(80).strength(0.6);
      sim("center")?.strength(0.1);
      return;
    }

    // Static: disable forces & seed positions
    sim("charge", null);
    sim("link", null);
    sim("center", null);

    const n = data.nodes;
    if (layout === "circular") seedCircular(n, 260);
    else if (layout === "grid") seedGrid(n);
    else if (layout === "radialByCategory") seedRadialByCategory(n, (x) => x.category, 160);
    else if (layout === "layersByDegree") seedLayersByDegree(n, (x) => x.degree, 90);

    fg.refresh();
    try {
      fg.zoomToFit(400, 60);
    } catch {}
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

  const getNode = (id) => nodes.find((n) => n.id === id);

  // Fetch gene info on first hover
  useEffect(() => {
    if (!hoverNode) return;
    const nodeId = hoverNode.id;
    const clean = cleanGeneSymbol(nodeId);
    if (nodeTooltips[nodeId]) return;

    (async () => {
      try {
        let geneInfo = geneInfoCache[clean];
        if (!geneInfo) {
          const cached = localStorage.getItem(clean);
          if (cached) {
            geneInfo = JSON.parse(cached);
            setGeneInfoCache((p) => ({ ...p, [clean]: geneInfo }));
          } else {
            const content = await fetchGeneInfo(nodeId);
            if (content) {
              geneInfo = typeof content === "string" ? JSON.parse(content) : content;
              localStorage.setItem(clean, JSON.stringify(geneInfo));
              setGeneInfoCache((p) => ({ ...p, [clean]: geneInfo }));
            }
          }
        }
        if (geneInfo) setNodeTooltips((p) => ({ ...p, [nodeId]: geneInfo }));
      } catch (err) {
        console.error("Gene info (2D):", err);
      }
    })();
  }, [hoverNode, geneInfoCache, nodeTooltips]);

  const getNodeLabel = useCallback(
    (n) => {
      const geneInfo = nodeTooltips[n.id];
      let label = `${n.id}`;
      if (geneInfo?.name) label += ` (${geneInfo.name})`;
      label += `\nCategory: ${n.category ?? "N/A"}`;
      label += `\nDegree: ${n.degree}`;
      if (Number.isFinite(n.kd)) label += `\nKD: ${(+n.kd).toFixed(2)}`;
      if (geneInfo?.description) {
        const d =
          geneInfo.description.length > 120
            ? geneInfo.description.slice(0, 120) + "..."
            : geneInfo.description;
        label += `\n\n${d}`;
      } else if (hoverNode?.id === n.id && !geneInfo) {
        label += `\n\nLoading gene info...`;
      }
      return label;
    },
    [nodeTooltips, hoverNode]
  );

  return (
    <div style={{ position: "relative", width: "100%", height }}>
      <div style={{ position: "absolute", right: 12, top: 12, zIndex: 5, background: "#fff", padding: 6, borderRadius: 6, border: "1px solid #e5e7eb" }}>
        <label style={{ fontSize: 12, marginRight: 6 }}>Layout</label>
        <select value={layout} onChange={(e) => setLayout(e.target.value)} style={{ fontSize: 12 }}>
          <option value="force">Force</option>
          <option value="circular">Circular</option>
          <option value="grid">Grid</option>
          <option value="radialByCategory">Radial by Category</option>
          <option value="layersByDegree">Layers by Degree</option>
        </select>
      </div>

      <ForceGraph2D
        ref={fgRef}
        graphData={data}
        height={height}
        cooldownTicks={layout === "force" ? 100 : 0}
        nodeRelSize={1}
        enableNodeDrag={true}
        onNodeDrag={handleNodeDrag}
        onNodeDragEnd={handleNodeDragEnd}
        onNodeHover={setHoverNode}
        onLinkHover={setHoverLink}
        onNodeClick={(n) => setSelNode(n)}
        nodeLabel={(n) => getNodeLabel(n)}
        linkLabel={(l) =>
          `${l.source?.id || l.source} → ${l.target?.id || l.target}\nType: ${
            l.Type || "N/A"
          }\nClass: ${l.t2 || "N/A"}${
            Number.isFinite(l.value) ? `\nValue: ${(+l.value).toFixed(2)}` : ""
          }`
        }
        linkDirectionalArrowLength={6}
        linkDirectionalArrowRelPos={1}
        linkWidth={(l) => (l === hoverLink ? 3 : l.t2 === "Corr" ? 1.2 : 1.8)}
        linkColor={(l) =>
          l === hoverLink ? "#2563eb" : l.t2 === "Corr" ? EDGE_STYLES.Corr.color : EDGE_STYLES.Exp.color
        }
        linkLineDash={(l) => (l.t2 === "Corr" ? [4, 2] : null)}
        linkDirectionalParticles={(l) => (l === hoverLink ? 4 : 0)}
        linkDirectionalParticleSpeed={0.006}
        nodeCanvasObject={(node, ctx, globalScale) => {
          const ndata = getNode(node.id) || {};
          const size = nodeSize(ndata, deg, settings);
          const color = nodeColor(ndata, settings);

          if (hoverNode?.id === node.id || selNode?.id === node.id) {
            ctx.beginPath();
            ctx.arc(node.x, node.y, size + 6, 0, 2 * Math.PI, false);
            ctx.fillStyle = "rgba(37, 99, 235, 0.18)";
            ctx.fill();
          }

          ctx.beginPath();
          ctx.arc(node.x, node.y, size, 0, 2 * Math.PI, false);
          ctx.fillStyle = color;
          ctx.fill();
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 2;
          ctx.stroke();

          const fontSize = Math.max(8, 10 / Math.sqrt(globalScale));
          ctx.font = `${fontSize}px sans-serif`;
          ctx.fillStyle = "#0f172a";
          ctx.textAlign = "center";
          ctx.textBaseline = "top";
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
function ForceGraph3DRenderer({ nodes, edges, deg, height, settings }) {
  const [layout, setLayout] = useState("force"); // 'force' | 'circular' | 'grid' | 'radialByCategory' | 'layersByDegree'
  const [hoverNode, setHoverNode] = useState(null);
  const [hoverLink, setHoverLink] = useState(null);
  const [selNode, setSelNode] = useState(null);
  const [geneInfoCache, setGeneInfoCache] = useState({});
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

  useEffect(() => {
    const fg = fgRef.current;
    if (!fg) return;

    if (layout === "force") {
      fg.d3Force("charge")?.strength(-120);
      fg.d3Force("link")?.distance(80).strength(0.6);
      fg.d3Force("center")?.strength(0.1);
      return;
    }

    // Disable forces and seed 3D coordinates for static layouts
    fg.d3Force("charge", null);
    fg.d3Force("link", null);
    fg.d3Force("center", null);

    const n = data.nodes;
    if (layout === "circular") seedCircular3D(n, 260);
    else if (layout === "grid") seedGrid3D(n);
    else if (layout === "radialByCategory") seedRadialByCategory3D(n, (x) => x.category, 160);
    else if (layout === "layersByDegree") seedLayersByDegree3D(n, (x) => x.degree, 120);

    fg.refresh();
    try {
      fg.zoomToFit(400, 60);
    } catch {}
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

  // Fetch gene info on first hover
  useEffect(() => {
    if (!hoverNode) return;
    const nodeId = hoverNode.id;
    const clean = cleanGeneSymbol(nodeId);
    if (nodeTooltips[nodeId]) return;

    (async () => {
      try {
        let geneInfo = geneInfoCache[clean];
        if (!geneInfo) {
          const cached = localStorage.getItem(clean);
          if (cached) {
            geneInfo = JSON.parse(cached);
            setGeneInfoCache((p) => ({ ...p, [clean]: geneInfo }));
          } else {
            const content = await fetchGeneInfo(nodeId);
            if (content) {
              geneInfo = typeof content === "string" ? JSON.parse(content) : content;
              localStorage.setItem(clean, JSON.stringify(geneInfo));
              setGeneInfoCache((p) => ({ ...p, [clean]: geneInfo }));
            }
          }
        }
        if (geneInfo) setNodeTooltips((p) => ({ ...p, [nodeId]: geneInfo }));
      } catch (err) {
        console.error("Gene info (3D):", err);
      }
    })();
  }, [hoverNode, geneInfoCache, nodeTooltips]);

  const getNodeLabel = useCallback(
    (n) => {
      const geneInfo = nodeTooltips[n.id];
      let label = `${n.id}`;
      if (geneInfo?.name) label += ` (${geneInfo.name})`;
      label += `\nCategory: ${n.category ?? "N/A"}`;
      label += `\nDegree: ${n.degree}`;
      if (Number.isFinite(n.kd)) label += `\nKD: ${(+n.kd).toFixed(2)}`;
      if (geneInfo?.description) {
        const d =
          geneInfo.description.length > 120
            ? geneInfo.description.slice(0, 120) + "..."
            : geneInfo.description;
        label += `\n\n${d}`;
      } else if (hoverNode?.id === n.id && !geneInfo) {
        label += `\n\nLoading gene info...`;
      }
      return label;
    },
    [nodeTooltips, hoverNode]
  );

  return (
    <div style={{ position: "relative", width: "100%", height }}>
      <div style={{ position: "absolute", right: 12, top: 12, zIndex: 5, background: "#fff", padding: 6, borderRadius: 6, border: "1px solid #e5e7eb" }}>
        <label style={{ fontSize: 12, marginRight: 6 }}>Layout</label>
        <select value={layout} onChange={(e) => setLayout(e.target.value)} style={{ fontSize: 12 }}>
          <option value="force">Force</option>
          <option value="circular">Circular</option>
          <option value="grid">Grid</option>
          <option value="radialByCategory">Radial by Category</option>
          <option value="layersByDegree">Layers by Degree</option>
        </select>
      </div>

      <ForceGraph3D
        ref={fgRef}
        graphData={data}
        height={height}
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
          `${l.source?.id || l.source} → ${l.target?.id || l.target}\nType: ${
            l.Type || "N/A"
          }\nClass: ${l.t2 || "N/A"}${
            Number.isFinite(l.value) ? `\nValue: ${(+l.value).toFixed(2)}` : ""
          }`
        }
        linkDirectionalArrowLength={4}
        linkDirectionalArrowRelPos={1}
        linkWidth={(l) => (l === hoverLink ? 2.5 : l.t2 === "Corr" ? 1 : 1.4)}
        linkColor={(l) =>
          l === hoverLink ? "#2563eb" : l.t2 === "Corr" ? EDGE_STYLES.Corr.color : EDGE_STYLES.Exp.color
        }
        linkDirectionalParticles={(l) => (l === hoverLink ? 6 : 0)}
        linkDirectionalParticleSpeed={0.01}
        // Default 3D node (sphere) color:
        nodeColor={(n) => CATEGORY_COLORS[n.category ?? "default"] || CATEGORY_COLORS.default}
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
        top: 12,
        background: "rgba(255,255,255,0.95)",
        border: "1px solid #e5e7eb",
        padding: "10px 12px",
        borderRadius: 10,
        boxShadow: "0 10px 24px rgba(15,23,42,.12)",
        minWidth: 220,
        maxWidth: 350,
        fontSize: 12,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <strong>
          {node.id}
          {info?.name && (
            <span style={{ fontWeight: "normal", fontSize: 11, color: "#666" }}>
              {" "}
              ({info.name})
            </span>
          )}
        </strong>
        <button
          onClick={onClose}
          style={{ border: 0, background: "transparent", cursor: "pointer", fontSize: 16 }}
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
            borderTop: "1px solid #e5e7eb",
            fontSize: 11,
            lineHeight: 1.4,
            color: "#555",
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
function DirectSigmaRenderer({ nodes, edges, deg, height, settings }) {
  const containerRef = useRef(null);
  const sigmaRef = useRef(null);

  useEffect(() => {
    if (!DirectSigma || !containerRef.current) return;

    try {
      // Create a new graph instance
      const g = new GraphClass({ multi: false, type: "directed", allowSelfLoops: false });

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
          color: nodeColor(n, settings),
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
          color: edgeColor(e),
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
      const sigma = new DirectSigma(g, containerRef.current);
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
  }, [nodes, edges, deg, settings]);

  return (
    <div style={{ width: "100%", height, position: "relative", background: "#fff", borderRadius: 8, overflow: "hidden" }}>
      <div style={{ position: "absolute", right: 12, top: 12, zIndex: 5, background: "#fff", padding: 6, borderRadius: 6, border: "1px solid #e5e7eb" }}>
        <label style={{ fontSize: 12, marginRight: 6 }}>Layout</label>
        <select 
          value={settings?.sigmaLayout || "fa2"} 
          onChange={(e) => {
            // This would need to be handled by parent component
            console.log("Layout change:", e.target.value);
          }} 
          style={{ fontSize: 12 }}
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
      style={{
        width: "100%",
        height,
        border: "2px dashed #e2e8f0",
        borderRadius: "8px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        color: "#6c757d",
      }}
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
      style={{
        width: "100%",
        height,
        border: "2px dashed #e2e8f0",
        borderRadius: "8px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        color: "#6c757d",
      }}
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

// Note: ForceGraph2DFallback is defined but not currently used
// function ForceGraph2DFallback({ nodes, edges, height }) {
//   return (
//     <div
//       style={{
//         width: "100%",
//         height,
//         border: "2px dashed #e2e8f0",
//         borderRadius: "8px",
//         display: "flex",
//         alignItems: "center",
//         justifyContent: "center",
//         textAlign: "center",
//         color: "#6c757d",
//       }}
//     >
//       <div>
//         <h3>ForceGraph2D Not Available</h3>
//         <p>
//           Install: <code>npm i react-force-graph-2d</code>
//         </p>
//         <p>
//           {nodes.length} nodes, {edges.length} edges ready to render
//         </p>
//       </div>
//     </div>
//   );
// }

// Note: ForceGraph3DFallback is defined but not currently used
// function ForceGraph3DFallback({ nodes, edges, height }) {
//   return (
//     <div
//       style={{
//         width: "100%",
//         height,
//         border: "2px dashed #e2e8f0",
//         borderRadius: "8px",
//         display: "flex",
//         alignItems: "center",
//         justifyContent: "center",
//         textAlign: "center",
//         color: "#6c757d",
//       }}
//     >
//       <div>
//         <h3>ForceGraph3D Not Available</h3>
//         <p>
//           Install: <code>npm i react-force-graph-3d</code>
//         </p>
//         <p>
//           {nodes.length} nodes, {edges.length} edges ready to render
//         </p>
//       </div>
//     </div>
//   );
// }
