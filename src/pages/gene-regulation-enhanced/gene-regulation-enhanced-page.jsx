import React, { useMemo, useState, useEffect } from "react";
import { connect } from "react-redux";
import styles from "../gene-regulation/gene-regulation-page.module.scss";
import { ModulePathNames } from "../../store/results/enums";
import VideoHelpPage from "../../components/video-help";
import helpVideo from "../../common/videos/3.webm";
import { Accordion, AccordionSummary, AccordionDetails } from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { LoadingPage } from "../../components/loading-page";
import NetworkGraphAlternatives from "../../components/NetworkGraphAlternatives";
import { ButtonGroup, Spacer } from "@oliasoft-open-source/react-ui-library";
import { FaChartBar, FaTable } from "react-icons/fa";
import EnrichmentTable from "../../components/enrichment-table-new/index.jsx";

const moduleDescription = {
  title: "Enhanced Gene Regulation Network Analysis (Multi-Experiment)",
  description: "This advanced module combines data from multiple Perturb-seq experiments to identify and visualize upstream and downstream regulators of a gene of interest. It offers enhanced robustness through cross-experiment validation and adaptive filtering to manage network complexity.",
  features: [
    "Multi-experiment data combination (weighted mean, median, rank-based)",
    "Adaptive top-K filtering to control network size and complexity",
    "Enhanced cache system with experiment-specific optimization",
    "Global graph pruning with configurable node/edge limits",
    "Robust statistical aggregation across different cell lines",
    "Improved correlation analysis with cross-experiment validation",
    "Advanced noise filtering and edge deduplication",
    "Multiple visualization engines (Cytoscape, Sigma.js, ReactFlow, ForceGraph2D)"
  ],
  differences: [
    "Supports combining K562, HCT116, HEK293, and other whole-genome datasets",
    "Configurable experiment weights for custom prioritization",
    "Dynamic network size management with adaptive caps",
    "Enhanced statistical robustness through multi-experiment consensus",
    "Improved cache efficiency and reduced memory usage",
    "Interactive renderer selection for optimal visualization performance"
  ]
};


function parseMaybeString(x) {
  if (!x) return null;
  if (typeof x === "string") {
    try { 
      return JSON.parse(x); 
    } catch (e) { 
      console.error("JSON parse failed:", e, x); 
      return null; 
    }
  }
  return x;
}

function normalizeGraph(raw) {
  console.log("🔍 normalizeGraph input:", { 
    rawType: typeof raw, 
    rawValue: raw,
    isString: typeof raw === "string",
    hasTaskResult: raw && typeof raw === "object" && "task_result" in raw
  });

  // handle either the object itself or { task_result: "..." }
  const maybe = parseMaybeString(raw);
  console.log("🔍 maybe after parseMaybeString:", maybe);
  
  const graph = (maybe?.nodes && maybe?.edges) ? maybe : parseMaybeString(maybe?.task_result);
  console.log("🔍 graph after extraction:", graph);
  
  if (!graph || !Array.isArray(graph.nodes) || !Array.isArray(graph.edges)) {
    console.log("🚫 No valid graph data found:", {
      hasGraph: !!graph,
      hasNodes: graph?.nodes,
      nodesIsArray: Array.isArray(graph?.nodes),
      hasEdges: graph?.edges,
      edgesIsArray: Array.isArray(graph?.edges)
    });
    return null;
  }

  console.log("📊 Processing graph:", {
    nodeCount: graph.nodes.length,
    edgeCount: graph.edges.length,
    sampleEdges: graph.edges.slice(0, 2)
  });

  // Enhanced edge processing with detailed logging
  const edges = [];
  const skippedEdges = [];
  const bestByKey = new Map();
  
  for (const e of graph.edges) {
    const source = e.source ?? e.From;
    const target = e.target ?? e.To;
    const value = Number(e.value);
    
    if (!source || !target) {
      skippedEdges.push({ reason: "missing source/target", edge: e });
      continue;
    }
    
    if (source === target) {
      skippedEdges.push({ reason: "self-loop", edge: e });
      continue;
    }
    
    if (!Number.isFinite(value)) {
      skippedEdges.push({ reason: "invalid value", edge: e });
      continue;
    }
    
    const type2 = e.Type2 ?? e.type ?? "Exp";
    const id = e.id ?? `${source}+${type2}+${target}`;
    const key = `${source}|${target}|${type2}`;
    const cur = bestByKey.get(key);
    
    if (!cur || Math.abs(value) > Math.abs(cur.value)) {
      bestByKey.set(key, { ...e, source, target, value, id, Type2: type2 });
    }
  }
  
  edges.push(...bestByKey.values());
  
  console.log("🔗 Edge processing results:", {
    originalEdgeCount: graph.edges.length,
    validEdgeCount: edges.length,
    skippedEdgeCount: skippedEdges.length,
    skippedReasons: skippedEdges.reduce((acc, se) => {
      acc[se.reason] = (acc[se.reason] || 0) + 1;
      return acc;
    }, {}),
    sampleValidEdges: edges.slice(0, 2)
  });

  // ensure all edge endpoints exist as nodes
  const nodeMap = new Map();
  for (const n of (graph.nodes || [])) nodeMap.set(String(n.id), { id: String(n.id), ...n });
  for (const e of edges) {
    if (!nodeMap.has(String(e.source))) nodeMap.set(String(e.source), { id: String(e.source) });
    if (!nodeMap.has(String(e.target))) nodeMap.set(String(e.target), { id: String(e.target) });
  }
  const nodes = Array.from(nodeMap.values());

  const result = nodes.length && edges.length ? { nodes, edges } : null;
  console.log("✅ Final graph result:", {
    hasResult: !!result,
    nodeCount: result?.nodes?.length || 0,
    edgeCount: result?.edges?.length || 0
  });

  return result;
}

const GeneRegulationEnhancedPage = ({
  rawResult,
  isRunning,
  blacklistData,
  blacklistLoading,
  geneRegulationEnhancedSettings,
  calcResults,
  path,
}) => {
  const [selectedView, setSelectedView] = useState(0);
  const [tableData, setTableData] = useState([]);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(true);

  // Auto-close description after 10 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsDescriptionExpanded(false);
    }, 10000); // 10 seconds

    return () => clearTimeout(timer);
  }, []);

  // Close description when calculation runs or results appear
  useEffect(() => {
    if (isRunning || rawResult) {
      setIsDescriptionExpanded(false);
    }
  }, [isRunning, rawResult]);

  // Table columns configuration for gene regulation data
  const columns = useMemo(
    () => [
      {
        id: "Regulation",
        header: "Regulation",
        columns: [
          {
            accessorKey: "Regulation Type",
            header: "Regulation Type",
            Header: <>Type</>,
            size: 50,
            maxSize: 50,
            filterVariant: "select",
            muiFilterTextFieldProps: {
              placeholder: "Select",
              size: "small",
            },
          },
          {
            accessorKey: "Direction",
            header: "Direction",
            size: 50,
            maxSize: 50,
            filterVariant: "select",
            muiFilterTextFieldProps: {
              placeholder: "Select",
              size: "small",
            },
          },
        ],
      },
      {
        id: "GeneSymbols",
        header: "Gene Symbol",
        columns: [
          {
            accessorKey: "Gene Symbol From",
            header: "Gene Symbol From",
            Header: <>From</>,
            size: 75,
            filterVariant: "autocomplete",
            minSize: 50,
            maxSize: 150,
            muiFilterTextFieldProps: {
              placeholder: "Symbol",
              size: "small",
            },
          },
          {
            accessorKey: "Gene Symbol To",
            header: "Gene Symbol To",
            Header: <>To</>,
            size: 75,
            filterVariant: "autocomplete",
            muiFilterTextFieldProps: {
              placeholder: "Symbol",
              size: "small",
            },
          },
        ],
      },
      {
        id: "Z-Score",
        header: "Z-Score",
        columns: [
          {
            accessorKey: "Score",
            header: "Score",
            size: 50,
            filterVariant: "range-slider",
            muiFilterSliderProps: {
              size: "small",
              color: "primary",
              step: 0.01,
            },
            enableResizing: true,
          },
        ],
      },
      {
        id: "NeighbourCount",
        header: "Neighbour Count",
        columns: [
          {
            accessorKey: "Source NC",
            header: "Source Neighbour Count",
            Header: <>Source</>,
            size: 50,
            filterVariant: "range-slider",
            muiFilterSliderProps: {
              size: "small",
              color: "primary",
            },
            enableResizing: true,
          },
          {
            accessorKey: "Target NC",
            header: "Target Neighbour Count",
            Header: <>Target</>,
            size: 50,
            filterVariant: "range-slider",
            filterFn: "betweenInclusive",
            muiFilterSliderProps: {
              size: "small",
              color: "primary",
            },
          },
          {
            accessorKey: "Total NC",
            header: "Total Neighbour Count",
            Header: <>Total</>,
            size: 50,
            filterVariant: "range-slider",
            muiFilterSliderProps: {
              size: "small",
              color: "primary",
            },
          },
        ],
      },
    ],
    []
  );
  // Parse and normalize the graph data
  const geneRegulationResults = useMemo(
    () => normalizeGraph(rawResult),
    [rawResult]
  );

  // Process graph data into table format
  const processedTableData = useMemo(() => {
    if (!geneRegulationResults || !geneRegulationResults.nodes || !geneRegulationResults.edges) {
      return [];
    }

    const { nodes, edges } = geneRegulationResults;
    
    // Calculate node counts for neighbor count information
    const nodeCounts = {};
    edges.forEach((edge) => {
      const source = edge.source;
      const target = edge.target;
      nodeCounts[source] = (nodeCounts[source] || 0) + 1;
      nodeCounts[target] = (nodeCounts[target] || 0) + 1;
    });

    // Transform edges into table rows
    const tableInfo = edges.map((edge) => ({
      "Regulation Type": edge.Type2 || edge.type || "Exp",
      "Direction": edge.type || "Unknown",
      "Gene Symbol From": edge.source,
      "Gene Symbol To": edge.target,
      "Score": typeof edge.value === 'number' ? Number(edge.value.toFixed(2)) : edge.value,
      "Source NC": nodeCounts[edge.source] || 0,
      "Target NC": nodeCounts[edge.target] || 0,
      "Total NC": (nodeCounts[edge.source] || 0) + (nodeCounts[edge.target] || 0),
    }));

    // Sort by total neighbor count (descending)
    tableInfo.sort((a, b) => b["Total NC"] - a["Total NC"]);
    
    return tableInfo;
  }, [geneRegulationResults]);

  // Debug: helps confirm we have an object with nodes/edges
  console.log("🚀 Enhanced Gene Regulation Debug:", {
    rawResult,
    rawResultType: typeof rawResult,
    geneRegulationResults,
    hasResults: !!geneRegulationResults,
    settingsKeys: Object.keys(geneRegulationEnhancedSettings || {})
  });

  // Transform geneRegulationResults to format expected by MultiDatasetComparison
  const transformedData = useMemo(() => {
    if (!geneRegulationResults) return null;
    
    // Extract the target gene from settings
    const targetGene = geneRegulationEnhancedSettings?.selectedGene;
    if (!targetGene) return null;
    
    // Get selected experiments
    const selectedExperiments = geneRegulationEnhancedSettings?.selectedExperiments || ["K562gwps"];
    
    // Transform nodes and edges into the format expected by MultiDatasetComparison
    // This is a simplified transformation - you may need to adjust based on your actual data structure
    const transformedResult = {
      gene: targetGene,
      datasets: selectedExperiments,
      // Create mock data structure for MultiDatasetComparison
      // You'll need to implement proper data transformation based on your actual data
      [selectedExperiments[0]]: {
        perturbation_effects: {
          downstream: {},
          correlation: {}
        },
        perturbed_by: {
          upstream: {},
          correlation: {}
        }
      }
    };
    
    return transformedResult;
  }, [geneRegulationResults, geneRegulationEnhancedSettings]);

  const showLoading = isRunning && !geneRegulationResults;
  const graphHeight = geneRegulationEnhancedSettings?.graphHeight || 640;
  
  // Get progress state
  const resultKey = ModulePathNames?.[path] || "geneRegulationEnhancedGraph";
  const progressMessage = calcResults?.[resultKey]?.progressMessage;
  const progressPercentage = calcResults?.[resultKey]?.progressPercentage;

  return (
    <div className={styles.mainView}>
      {showLoading && (
        <LoadingPage 
          progressMessage={progressMessage}
          progressPercentage={progressPercentage}
        />
      )}

      {!showLoading && (
      <>
      {geneRegulationResults ? (
        <div>
          {/* View Toggle */}
          <ButtonGroup
            items={[
              {
                icon: <FaChartBar />,
                key: 0,
                label: "Network Graph",
              },
              {
                icon: <FaTable />,
                key: 1,
                label: "Link Table",
              },
            ]}
            onSelected={(key) => setSelectedView(key)}
            value={selectedView}
          />
          
          <Spacer height={10} />

          {/* Table View */}
          {selectedView === 1 && processedTableData.length > 0 && (
            <EnrichmentTable data={processedTableData} columns={columns} />
          )}

          {/* Graph View */}
          {selectedView === 0 && (
            <>
              {/* Enhanced Multi-Dataset Comparison */}
              <NetworkGraphAlternatives
                graph={geneRegulationResults}
                settings={geneRegulationEnhancedSettings}
                height={graphHeight}
              />

              {/* Summary Stats */}
              <div style={{
                marginTop: "16px",
                padding: "12px",
                backgroundColor: "#e8f5e8",
                borderLeft: "4px solid #28a745",
                borderRadius: "4px",
                color: "#155724"
              }}>
                ✅ <strong>Analysis Complete:</strong> Successfully generated network with {geneRegulationResults.nodes.length} nodes and {geneRegulationResults.edges.length} edges from {geneRegulationEnhancedSettings?.selectedExperiments?.length || 1} experiment(s) using {geneRegulationEnhancedSettings?.combineMethod || "weighted_mean"} aggregation.
              </div>
            </>
          )}

          {/* No data message for table view */}
          {selectedView === 1 && processedTableData.length === 0 && (
            <div style={{
              padding: "12px",
              backgroundColor: "#fff3cd",
              borderLeft: "4px solid #ffc107",
              borderRadius: "4px",
              color: "#856404",
              marginBottom: "8px"
            }}>
              ⚠️ No table data available. The network may not contain any valid edges.
            </div>
          )}
        </div>
      ) : (
        <div>
          <Accordion 
            expanded={isDescriptionExpanded}
            onChange={(event, expanded) => setIsDescriptionExpanded(expanded)}
            sx={{
              marginBottom: "14px",
              backgroundColor: "#f8f9fa",
              border: "1px solid #e9ecef",
              borderRadius: "8px",
              "&:before": { display: "none" },
              "& .MuiAccordionSummary-root": { minHeight: "30px", height: "30px" },
              "& .MuiAccordionSummary-root.Mui-expanded": { minHeight: "30px", height: "30px" }
            }}
          >
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              sx={{
                backgroundColor: "#f5f5f5",
                borderBottom: "1px solid #e0e0e0",
                minHeight: "30px",
              }}
            >
              <h3 style={{ margin: 0, color: "#495057", fontSize: "16px" }}>{moduleDescription.title}</h3>
            </AccordionSummary>
            <AccordionDetails sx={{ backgroundColor: "#fafafa", padding: "16px" }}>
              <div style={{ marginBottom: "0px" }}>
                <p style={{ marginBottom: "10px", lineHeight: "1.6" }}>{moduleDescription.description}</p>

                <h4 style={{ marginBottom: "6px", color: "#424242" }}>Key Features:</h4>
                <ul style={{ marginBottom: "12px", paddingLeft: "20px" }}>
                  {moduleDescription.features.map((feature, index) => (
                    <li key={index} style={{ marginBottom: "3px" }}>{feature}</li>
                  ))}
                </ul>

                <h4 style={{ marginBottom: "6px", color: "#424242" }}>Enhancements over Standard Module:</h4>
                <ul style={{ marginBottom: "0px", paddingLeft: "20px" }}>
                  {moduleDescription.differences.map((diff, index) => (
                    <li key={index} style={{ marginBottom: "3px" }}>{diff}</li>
                  ))}
                </ul>
              </div>
            </AccordionDetails>
          </Accordion>

          {rawResult && !geneRegulationResults && (
            <div style={{
              padding: "12px",
              backgroundColor: "#f8d7da",
              borderLeft: "4px solid #dc3545",
              borderRadius: "4px",
              color: "#721c24",
              marginBottom: "8px"
            }}>
              ⚠️ <strong>Data Issue:</strong> Raw data received but no valid graph generated. 
              Check console for detailed debugging information. This often happens when only self-loops are present.
            </div>
          )}

          <div style={{
            padding: "12px",
            backgroundColor: "#fff3cd",
            borderLeft: "4px solid #ffc107",
            borderRadius: "4px",
            color: "#856404",
            marginBottom: "8px"
          }}>
            🚀 <strong>Enhanced Module:</strong> This module combines multiple experiments for more robust gene regulation analysis. Configure experiment selection and weights in the settings panel.
          </div>

          <div style={{
            padding: "12px",
            backgroundColor: "#e3f2fd",
            borderLeft: "4px solid #1976d2",
            borderRadius: "4px",
            color: "#1565c0",
            marginBottom: "8px"
          }}>
            💡 To start, select experiments from the left sidebar, configure their weights and visualization preferences, then choose a gene from the enhanced gene regulation settings.
          </div>

          <VideoHelpPage videoFile={helpVideo} />
        </div>
      )}
      </>
      )}
    </div>
  );
};

// ——— Redux mapping ———
// Use a single, consistent key. Fall back to the known worker key if ModulePathNames[path] is missing.
const mapStateToProps = ({ calcResults, blacklist, settings }, { path }) => {
  const resultKey = ModulePathNames?.[path] || "geneRegulationEnhancedGraph";
  const raw =
    calcResults?.[resultKey]?.result ??
    calcResults?.[resultKey]?.task_result ?? // <-- your sample lives here
    null;

  return {
    rawResult: raw,
    isRunning: !!calcResults?.[resultKey]?.running,
    blacklistData: blacklist?.data,
    blacklistLoading: blacklist?.loading,
    geneRegulationEnhancedSettings: settings?.geneRegulationEnhanced ?? {},
    calcResults,
    path,
  };
};

const MainContainer = connect(mapStateToProps)(GeneRegulationEnhancedPage);
export { MainContainer as GeneRegulationEnhancedPage }; 