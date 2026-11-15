import { pdfToolboxFeature, svgToolboxFeature } from "../../utils/exporters";
import { TableExportButtons } from "../export-buttons";
import React, { useState, useEffect, useMemo } from 'react';
import { Tabs, Tab, Dialog, DialogTitle, DialogContent } from '@mui/material';
import Axios from "axios";
import { waitForTaskCompletion } from "../../store/api/websocket";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { MAX_GENES_IN_ADDRESS, tfRegulatorsPath } from "../../utils/regulators";
import { fetchBlacklistData } from "../../store/blacklist";
import { GeneSetEnrichmentTable } from "../enrichment";
import { MaterialReactTable } from 'material-react-table';
import ReactECharts from 'echarts-for-react';
import styles from './deregulated-genes.module.scss';
import { SERVER_ADDRESS } from "../../store/api/config";
import { escapeHtml } from "../../utils/escapeHtml";
import { withErrorBoundary } from "../error-boundary";
import { useChartTheme, saveImageFeature } from "../../utils/chartTheme";
import { mrtLook, numericColumn } from "../../utils/tableStyle";
import { EmptyState, Panel, ToolbarButton, uiStyles } from "../ui";

const formatZ = (value) =>
  typeof value === "number" && Number.isFinite(value) ? value.toFixed(3) : "";

// Diverging colour scales for the heatmap: purple = down, orange = up (the
// direction colours of the other charts), through the page background.
const HEATMAP_COLORS = {
  light: ["#40196d", "#5e3c99", "#8f78c4", "#c3b7e0", "#ebe7f3", "#f7f7f7", "#fde6cb", "#fdb863", "#e66101", "#b35806", "#7f3b08"],
  dark: ["#d9cdf7", "#b39ae8", "#8a70c9", "#5c4a8c", "#3a3354", "#232a33", "#4d3a25", "#8a5a26", "#c97f33", "#f6a04d", "#ffd0a0"],
};

// Colour of a direction label ("Upstream Positive", "Downstream Up-regulated", ...)
const directionTone = (label) => {
  const text = String(label || "").toLowerCase();
  if (text.includes("down-") || text.endsWith("down") || text.includes("negative")) return "down";
  if (text.includes("up-") || text.endsWith("up") || text.includes("positive")) return "up";
  return null;
};

const DeregulatedGenes = ({ data, multiDatasetData }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const chart = useChartTheme();
  const blacklistData = useSelector((state) => state.blacklist?.data);
  const blacklistLoading = useSelector((state) => state.blacklist?.loading);
  const deregulatedSettings = useSelector((state) => state.settings?.deregulatedGenes);
  const [activeTab, setActiveTab] = useState("table");
  const [heatmapData, setHeatmapData] = useState(null);
  // "ready" | "loading" | "error": what to say while there is no heatmap
  const [heatmapStatus, setHeatmapStatus] = useState("ready");
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailData, setDetailData] = useState({ gene: null, entries: [] });
  const [tableDataset, setTableDataset] = useState(null);

  // Load blacklist data once
  useEffect(() => {
    if (!blacklistData && !blacklistLoading) {
      dispatch(fetchBlacklistData());
    }
  }, [blacklistData, blacklistLoading, dispatch]);

  const explainer = [
    "For each selected perturbation we collect the top N most up- and down-regulated genes (by z-score and your threshold).",
    "Perturbation Count: how many of the selected perturbations included this gene in their top lists.",
    "Frequency: Perturbation Count expressed as a percentage of all analyzed perturbations.",
    "Direction uses your mode: Downstream = how perturbations change genes; Upstream = potential positive/negative regulators.",
    "Avg Z-Score (or Avg Rank): average across all appearances for that gene.",
    multiDatasetData ? "Select 'Multi' in the dataset picker to see genes common across datasets." : null,
  ].filter(Boolean);

  // initialize selected dataset for table
  useEffect(() => {
    if (multiDatasetData?.datasets) {
      // Keep the current choice only while it still exists in the new result
      setTableDataset((prev) =>
        prev && (prev === "MULTI" || multiDatasetData.datasets[prev]) ? prev : "MULTI"
      );
    } else if (data?.metadata?.dataset) {
      setTableDataset(data.metadata.dataset);
    }
  }, [multiDatasetData, data]);

  // Which result the table shows (derived, no state)
  const { sourceResults, tableDatasetLabel, showHeatmap } = useMemo(() => {
    if (tableDataset === "MULTI") {
      return {
        sourceResults: multiDatasetData?.common_genes || [],
        tableDatasetLabel: "Multi Dataset Aggregate",
        showHeatmap: false,
      };
    }
    if (multiDatasetData?.datasets && tableDataset && multiDatasetData.datasets[tableDataset]) {
      return {
        sourceResults: multiDatasetData.datasets[tableDataset].results || [],
        tableDatasetLabel: tableDataset,
        showHeatmap: true,
      };
    }
    if (data?.results) {
      return {
        sourceResults: data.results,
        tableDatasetLabel: data?.metadata?.dataset || tableDataset || "Selected dataset",
        showHeatmap: true,
      };
    }
    return { sourceResults: null, tableDatasetLabel: "", showHeatmap: true };
  }, [tableDataset, multiDatasetData, data]);

  // Table rows. Recomputed whenever the result, the blacklist data (loaded
  // asynchronously) or the blacklist settings change, so the filter is always
  // applied to what is on screen.
  const tableData = useMemo(() => {
    if (!sourceResults) return [];

    const filterEnabled = !!deregulatedSettings?.filterBlacklistEnabled;
    const threshold = deregulatedSettings?.filterBlackListed ?? 0;

    const passesBlacklist = (gene, avgZ) => {
      if (!filterEnabled || !blacklistData) return true;
      if (typeof avgZ !== "number" || Number.isNaN(avgZ)) return true;
      if (avgZ < 0 && blacklistData.blackListDown && blacklistData.blackListDown[gene] !== undefined) {
        return blacklistData.blackListDown[gene] <= threshold;
      }
      if (avgZ > 0 && blacklistData.blackListUp && blacklistData.blackListUp[gene] !== undefined) {
        return blacklistData.blackListUp[gene] <= threshold;
      }
      return true;
    };

    return sourceResults
      .map((gene, index) => {
        const avg = Number(gene.avg_z_score);
        return {
          id: index,
          gene: gene.gene_symbol || gene.gene,
          // Kept numeric so the column sorts numerically; formatted in the cell.
          avgZScore: Number.isFinite(avg) ? avg : 0,
          frequency: gene.frequency || 0,
          direction: gene.direction_label || gene.direction || 'N/A',
          perturbationCount: gene.perturbation_count || 0,
          datasetCount: gene.dataset_count || 0,
        };
      })
      .filter((row) => passesBlacklist(row.gene, row.avgZScore));
  }, [
    sourceResults,
    blacklistData,
    deregulatedSettings?.filterBlacklistEnabled,
    deregulatedSettings?.filterBlackListed,
  ]);

  // The heatmap tab does not exist for the multi-dataset aggregate.
  useEffect(() => {
    if (!showHeatmap && activeTab === "heatmap") {
      setActiveTab("table");
    }
  }, [showHeatmap, activeTab]);

  useEffect(() => {
    // Set when the selection changes or the component unmounts, so a slow
    // request for a previous dataset can never overwrite the current heatmap.
    let cancelled = false;

    // Process heatmap when a single dataset is selected
    const loadHeatmap = async () => {
      if (tableDataset === "MULTI" || !tableDataset) {
        setHeatmapData(null);
        return;
      }

      // If current single-dataset payload matches selection and has heatmap, reuse it
      if (data?.metadata?.dataset === tableDataset && data?.heatmap_data) {
        setHeatmapData(usableHeatmap(data.heatmap_data));
        return;
      }

      // Do not keep showing another dataset's heatmap while loading
      setHeatmapData(null);
      setHeatmapStatus("ready");

      // Try to fetch heatmap for selected dataset using existing metadata
      const meta =
        multiDatasetData?.datasets?.[tableDataset]?.metadata ||
        data?.metadata;

      const perturbations = meta?.perturbations_requested || [];
      if (!perturbations.length) {
        setHeatmapData(null);
        return;
      }

      const payload = {
        request: "calcDeregulatedGenes",
        perturbation_list: perturbations.join(";"),
        cell_line: tableDataset,
        top_n_genes: meta?.top_n_genes || 500,
        min_perturbations: meta?.min_perturbations_applied || meta?.min_perturbations || 2,
        min_perturbations_type: meta?.min_perturbations_type || "number",
        z_score_threshold: meta?.z_score_threshold ?? 0,
        average_method: meta?.average_method || "zscore",
        require_same_direction: meta?.require_same_direction ?? true,
        direction_mode: meta?.direction_mode || "downstream",
      };

      setHeatmapStatus("loading");
      try {
        const response = await Axios.post(
          `${SERVER_ADDRESS}/getData`,
          { body: JSON.stringify(payload) },
          { headers: { "ngrok-skip-browser-warning": "69420" } }
        );
        const { task_id } = response.data;
        const taskResult = await waitForTaskCompletion(task_id, null, {
          useWebSocket: true,
          fallbackToPolling: true,
          useVersionedEndpoint: false,
        });
        if (cancelled) return;
        const parsed = typeof taskResult === "string" ? JSON.parse(taskResult) : taskResult;
        setHeatmapData(usableHeatmap(parsed?.heatmap_data));
        setHeatmapStatus("ready");
      } catch (e) {
        if (!cancelled) {
          setHeatmapData(null);
          setHeatmapStatus("error");
        }
      }
    };

    loadHeatmap();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, multiDatasetData, tableDataset]);

  // The heatmap payload, or null when it is unusable
  const usableHeatmap = (payload) =>
    payload && payload.genes && payload.perturbations && payload.matrix ? payload : null;

  // ECharts option of the heatmap; rebuilt when the theme changes
  const heatmapOption = useMemo(() => {
    if (!heatmapData) return null;
    const p = chart.p;

    // Symmetric colour scale that follows the data (a fixed -5..5 range
    // washed out datasets with small z-scores and saturated large ones).
    let maxAbs = 0;
    heatmapData.matrix.forEach((row) => {
      (row || []).forEach((value) => {
        const magnitude = Math.abs(Number(value));
        if (Number.isFinite(magnitude) && magnitude > maxAbs) maxAbs = magnitude;
      });
    });
    const scaleLimit = Math.min(Math.max(Math.ceil(maxAbs), 1), 10);
    const manyColumns = heatmapData.perturbations.length > 40;
    const manyRows = heatmapData.genes.length > 40;

    return {
      tooltip: {
        position: 'top',
        formatter: (params) => {
          const perturbation = heatmapData.perturbations[params.value[0]];
          const gene = heatmapData.genes[params.value[1]];
          const zScore = params.value[2];
          return `<b>${escapeHtml(gene)}</b><br/>Perturbation: ${escapeHtml(perturbation)}<br/>Z-score: ${formatZ(zScore) || "n/a"}`;
        }
      },
      grid: {
        left: 16,
        right: manyRows ? 40 : 24,
        top: 64,
        bottom: manyColumns ? 34 : 12,
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: heatmapData.perturbations,
        axisTick: { show: false },
        axisLine: { show: false },
        splitLine: { show: false },
        axisLabel: {
          interval: manyColumns ? 'auto' : 0,
          rotate: 45,
          fontSize: 11
        }
      },
      yAxis: {
        type: 'category',
        data: heatmapData.genes,
        axisTick: { show: false },
        axisLine: { show: false },
        splitLine: { show: false },
        axisLabel: {
          fontSize: 11
        }
      },
      visualMap: {
        min: -scaleLimit,
        max: scaleLimit,
        text: ['Up', 'Down'],
        calculable: true,
        orient: 'horizontal',
        left: 'center',
        top: 8,
        itemWidth: 12,
        itemHeight: 160,
        precision: 1,
        inRange: {
          color: chart.isDark ? HEATMAP_COLORS.dark : HEATMAP_COLORS.light
        }
      },
      toolbox: {
        right: 10,
        top: 6,
        feature: {
          saveAsImage: saveImageFeature(p, 'genesetr_deregulated_genes_heatmap'),
          mySvg: svgToolboxFeature("genesetr-deregulated-genes"),
          myPdf: pdfToolboxFeature("genesetr-deregulated-genes"),
        },
      },
      dataZoom: [
        ...(manyColumns ? [{ type: 'inside', xAxisIndex: 0 }, { type: 'slider', xAxisIndex: 0, height: 14, bottom: 6 }] : []),
        ...(manyRows ? [{ type: 'inside', yAxisIndex: 0 }, { type: 'slider', yAxisIndex: 0, width: 14, right: 8 }] : []),
      ],
      series: [{
        name: 'Z-Score',
        type: 'heatmap',
        data: heatmapData.matrix.flatMap((row, i) =>
          row.map((value, j) => [j, i, value])
        ),
        itemStyle: { borderColor: p.bg, borderWidth: manyColumns || manyRows ? 0 : 1 },
        emphasis: {
          itemStyle: {
            borderColor: p.text,
            borderWidth: 1,
          }
        }
      }]
    };
  }, [heatmapData, chart.p, chart.isDark]);

  const enrichmentGeneLists = useMemo(() => {
    if (!tableData || tableData.length === 0) return null;
    const takeNames = (arr, n) =>
      arr
        .slice(0, n)
        .map((g) => g.gene)
        .filter(Boolean)
        .join(",");

    // Group genes by direction label
    const groups = {
      "Upstream Positive": [],
      "Upstream Negative": [],
      "Downstream Positive": [],
      "Downstream Negative": [],
    };

    const sortedGenes = [...tableData].sort(
      (a, b) => (b.perturbationCount || 0) - (a.perturbationCount || 0)
    );

    sortedGenes.forEach((g) => {
      const label = (g.direction_label || g.direction || "").toLowerCase();
      if (label.includes("upstream") && label.includes("positive")) {
        groups["Upstream Positive"].push(g);
      } else if (label.includes("upstream") && label.includes("negative")) {
        groups["Upstream Negative"].push(g);
      } else if (label.includes("downstream") && label.includes("up")) {
        groups["Downstream Positive"].push(g);
      } else if (label.includes("downstream") && label.includes("down")) {
        groups["Downstream Negative"].push(g);
      }
    });

    const lists = {};
    Object.entries(groups).forEach(([name, genes]) => {
      if (genes.length) {
        lists[`${name} (Top 20)`] = takeNames(genes, 20);
        lists[`${name} (Top 50)`] = takeNames(genes, 50);
      }
    });

    return Object.keys(lists).length ? lists : null;
  }, [tableData]);

  // Genes the perturbations raise and lower, for the "TF regulators" page.
  // Only for downstream results: upstream rows are regulators, not targets.
  const signatureLists = useMemo(() => {
    const up = [];
    const down = [];
    [...tableData]
      .sort((a, b) => (b.perturbationCount || 0) - (a.perturbationCount || 0))
      .forEach((row) => {
        const label = String(row.direction || "").toLowerCase();
        if (!label.includes("downstream")) return;
        if (label.includes("down-") || label.endsWith("down")) down.push(row.gene);
        else if (label.includes("up")) up.push(row.gene);
      });
    return { up, down };
  }, [tableData]);

  const baseColumns = [
    {
      accessorKey: 'gene',
      header: 'Gene Symbol',
      size: 150,
      Cell: ({ cell }) => <span style={{ fontWeight: 600 }}>{cell.getValue()}</span>,
    },
    {
      accessorKey: 'avgZScore',
      header: 'Avg Z-Score',
      size: 120,
      sortingFn: 'basic', // numeric
      ...numericColumn,
      Cell: ({ cell }) => {
        const value = cell.getValue();
        const color = value > 0 ? "var(--gs-up)" : value < 0 ? "var(--gs-down)" : undefined;
        return <span style={{ color, fontWeight: 600 }}>{formatZ(value)}</span>;
      },
    },
    {
      accessorKey: 'frequency',
      header: 'Frequency',
      size: 100,
      ...numericColumn,
    },
    {
      accessorKey: 'direction',
      header: 'Direction',
      size: 160,
      Cell: ({ cell }) => {
        const tone = directionTone(cell.getValue());
        return (
          <span className={tone === "up" ? styles.directionUp : tone === "down" ? styles.directionDown : undefined}>
            {cell.getValue()}
          </span>
        );
      },
    },
    {
      accessorKey: 'perturbationCount',
      header: 'Perturbation Count',
      size: 150,
      ...numericColumn,
    },
  ];

  const tableColumns = tableDataset === "MULTI"
    ? [
        ...baseColumns,
        {
          accessorKey: 'datasetCount',
          header: '#Datasets',
          size: 100,
          ...numericColumn,
        },
      ]
    : baseColumns;

  const openDetailForGene = (geneSymbol) => {
    const entries = [];
    const datasetName = data?.metadata?.dataset || "Selected dataset";

    if (data?.results?.length) {
      const found = data.results.find((g) => (g.gene_symbol || g.gene) === geneSymbol);
      if (found?.contributing_perturbations?.length) {
        found.contributing_perturbations.forEach((c) =>
          entries.push({
            dataset: datasetName,
            perturbation: c.perturbation,
            direction: c.direction,
            z_score: c.z_score,
          })
        );
      }
    }

    if (multiDatasetData?.datasets) {
      Object.entries(multiDatasetData.datasets).forEach(([datasetId, info]) => {
        const geneEntry = info?.results?.find((g) => (g.gene_symbol || g.gene) === geneSymbol);
        if (geneEntry?.contributing_perturbations?.length) {
          geneEntry.contributing_perturbations.forEach((c) =>
            entries.push({
              dataset: datasetId,
              perturbation: c.perturbation,
              direction: c.direction,
              z_score: c.z_score,
            })
          );
        }
      });
    }

    // deduplicate entries by dataset+perturbation+direction
    const seen = new Set();
    const uniqueEntries = [];
    entries.forEach((e) => {
      const key = `${e.dataset}__${e.perturbation}__${e.direction}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueEntries.push(e);
      }
    });

    setDetailData({ gene: geneSymbol, entries: uniqueEntries });
    setDetailOpen(true);
  };

  const look = mrtLook({
    pageSize: 50,
    maxHeight: 'calc(100vh - 330px)',
    initialState: {
      sorting: [{ id: tableDataset === "MULTI" ? 'datasetCount' : 'perturbationCount', desc: true }],
    },
  });

  return (
    <div className={styles.container}>
      <details className={styles.explainer}>
        <summary className={styles.explainerTitle}>How these metrics are calculated</summary>
        <ul>
          {explainer.map((line, idx) => (
            <li key={idx}>{line}</li>
          ))}
        </ul>
      </details>

      <div className={styles.tabRow}>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)} sx={{ borderBottom: 0 }}>
          <Tab value="table" label="Table" />
          {showHeatmap && <Tab value="heatmap" label="Heatmap" />}
        </Tabs>
        {(activeTab === "table" || activeTab === "heatmap") && (
          <div className={styles.datasetSelector}>
            <label htmlFor="datasetSelect" title='Choose the dataset to show; select "Multi" for genes common to all datasets'>
              Dataset
            </label>
            <select
              id="datasetSelect"
              value={tableDataset || ""}
              onChange={(e) => setTableDataset(e.target.value)}
            >
              {multiDatasetData?.datasets && <option value="MULTI">Multi</option>}
              {multiDatasetData?.datasets
                ? Object.keys(multiDatasetData.datasets).map((ds) => (
                    <option key={ds} value={ds}>{ds}</option>
                  ))
                : data?.metadata?.dataset
                  ? <option value={data.metadata.dataset}>{data.metadata.dataset}</option>
                  : null}
            </select>
          </div>
        )}
      </div>

      <div className={styles.tabBody}>
        {activeTab === "table" && (
          <div className={styles.tableContainer}>
            {multiDatasetData?.datasets && (
              <div className={styles.datasetBadge}>Showing results for: <strong>{tableDatasetLabel}</strong></div>
            )}
            {tableData.length > 0 ? (
              <>
                <MaterialReactTable
                  // A new table per dataset view: the default sort column differs
                  // between "Multi" and a single dataset and only applies on mount.
                  key={tableDataset}
                  columns={tableColumns}
                  data={tableData}
                  {...look}
                  renderTopToolbarCustomActions={({ table }) => (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      <TableExportButtons
                        filename="genesetr-deregulated-genes"
                        columns={tableColumns}
                        rows={() => table.getPrePaginationRowModel().rows.map((row) => row.original)}
                      />
                      {signatureLists.up.length + signatureLists.down.length >= 3 && (
                        <ToolbarButton
                          size="sm"
                          title={`Find transcription factors that switch these genes on or off (${Math.min(signatureLists.up.length, MAX_GENES_IN_ADDRESS)} up, ${Math.min(signatureLists.down.length, MAX_GENES_IN_ADDRESS)} down; of longer lists the genes shared by most perturbations)`}
                          onClick={() => navigate(tfRegulatorsPath({ ...signatureLists, run: true }))}
                        >
                          TF regulators of these genes
                        </ToolbarButton>
                      )}
                    </span>
                  )}
                  enableSorting
                  enablePagination
                  muiTableBodyRowProps={({ row }) => ({
                    onClick: () => openDetailForGene(row.original.gene),
                    title: "Show the perturbations behind this gene",
                    sx: { ...look.muiTableBodyRowProps.sx, cursor: 'pointer' },
                  })}
                />
                {enrichmentGeneLists && Object.keys(enrichmentGeneLists).length > 0 && (
                  <div style={{ marginTop: "14px" }}>
                    <GeneSetEnrichmentTable genesets={enrichmentGeneLists} />
                  </div>
                )}
              </>
            ) : (
              <EmptyState
                title="No results available"
                hint="No gene passed the thresholds. Lower the z-score threshold or the minimum number of perturbations in the sidebar."
              />
            )}
          </div>
        )}

        {activeTab === "heatmap" && showHeatmap && (
          <Panel
            title="Z-scores of the deregulated genes"
            subtitle={tableDatasetLabel}
            flush
          >
            {heatmapOption ? (
              <ReactECharts
                option={heatmapOption}
                theme={chart.theme}
                // A smaller heatmap must not inherit the sliders of the previous one
                notMerge={true}
                style={{ height: 'calc(100vh - 300px)', minHeight: 420, width: '100%' }}
                opts={{ renderer: 'canvas' }}
              />
            ) : (
              <EmptyState
                title={
                  heatmapStatus === "loading"
                    ? "Computing the heatmap for this dataset…"
                    : heatmapStatus === "error"
                    ? "The heatmap for this dataset could not be computed. Try again or pick another dataset."
                    : "No heatmap data available"
                }
              />
            )}
          </Panel>
        )}
      </div>

      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontSize: 16, fontWeight: 600 }}>
          {detailData.gene ? `Contributing perturbations for ${detailData.gene}` : "No gene selected"}
        </DialogTitle>
        <DialogContent dividers>
          {detailData.entries.length === 0 && (
            <p className={uiStyles.muted}>No contributing perturbations were recorded for this gene.</p>
          )}
          {detailData.entries.length > 0 && (
            <div className={uiStyles.tableScroll} style={{ maxHeight: "60vh" }}>
              <table className={uiStyles.table}>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Perturbation</th>
                    <th>Dataset</th>
                    <th>Direction</th>
                    <th className={uiStyles.num}>Z-Score</th>
                  </tr>
                </thead>
                <tbody>
                  {detailData.entries.map((entry, idx) => {
                    const z = Number(entry.z_score);
                    return (
                      <tr key={`${entry.dataset}-${entry.perturbation}-${idx}`}>
                        <td>{idx + 1}</td>
                        <td style={{ fontWeight: 600 }}>{entry.perturbation}</td>
                        <td>{entry.dataset}</td>
                        <td>{entry.direction}</td>
                        <td
                          className={uiStyles.num}
                          style={{ color: z > 0 ? "var(--gs-up)" : z < 0 ? "var(--gs-down)" : undefined, fontWeight: 600 }}
                        >
                          {entry.z_score?.toFixed ? entry.z_score.toFixed(3) : entry.z_score}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

const SafeDeregulatedGenes = withErrorBoundary(DeregulatedGenes, {
  label: "Deregulated genes",
  resetKeys: (props) => [props.data, props.multiDatasetData],
});

export { SafeDeregulatedGenes as DeregulatedGenes };
