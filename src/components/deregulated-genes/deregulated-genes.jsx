import { svgToolboxFeature } from "../../utils/exporters";
import { TableExportButtons } from "../export-buttons";
import React, { useState, useEffect, useMemo } from 'react';
import { Tabs, Tab, Box, Typography, Dialog, DialogTitle, DialogContent, List, ListItem, ListItemText, Divider } from '@mui/material';
import Axios from "axios";
import { waitForTaskCompletion } from "../../store/api/websocket";
import { useDispatch, useSelector } from "react-redux";
import { fetchBlacklistData } from "../../store/blacklist";
import { GeneSetEnrichmentTable } from "../enrichment";
import { MaterialReactTable } from 'material-react-table';
import ReactECharts from 'echarts-for-react';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import styles from './deregulated-genes.module.scss';
import { SERVER_ADDRESS } from "../../store/api/config";
import { escapeHtml } from "../../utils/escapeHtml";
import { withErrorBoundary } from "../error-boundary";

const formatZ = (value) =>
  typeof value === "number" && Number.isFinite(value) ? value.toFixed(3) : "";

const DeregulatedGenes = ({ data, multiDatasetData }) => {
  const dispatch = useDispatch();
  const blacklistData = useSelector((state) => state.blacklist?.data);
  const blacklistLoading = useSelector((state) => state.blacklist?.loading);
  const deregulatedSettings = useSelector((state) => state.settings?.deregulatedGenes);
  const [activeTab, setActiveTab] = useState("table");
  const [heatmapData, setHeatmapData] = useState(null);
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
        setHeatmapData(buildHeatmapOption(data.heatmap_data));
        return;
      }

      // Do not keep showing another dataset's heatmap while loading
      setHeatmapData(null);

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
        setHeatmapData(buildHeatmapOption(parsed?.heatmap_data));
      } catch (e) {
        if (!cancelled) setHeatmapData(null);
      }
    };

    loadHeatmap();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, multiDatasetData, tableDataset]);

  // ECharts option for a heatmap payload, or null when the payload is unusable
  const buildHeatmapOption = (heatmapData) => {
    if (!heatmapData || !heatmapData.genes || !heatmapData.perturbations || !heatmapData.matrix) {
      return null;
    }

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

    const option = {
      tooltip: {
        position: 'top',
        formatter: (params) => {
          const perturbation = heatmapData.perturbations[params.value[0]];
          const gene = heatmapData.genes[params.value[1]];
          const zScore = params.value[2];
          return `Gene: ${escapeHtml(gene)}<br/>Perturbation: ${escapeHtml(perturbation)}<br/>Z-Score: ${formatZ(zScore) || "n/a"}`;
        }
      },
      grid: {
        left: 120,
        right: 50,
        top: 100,
        bottom: 50
      },
      xAxis: {
        type: 'category',
        data: heatmapData.perturbations,
        axisLabel: {
          interval: manyColumns ? 'auto' : 0,
          rotate: 45,
          fontSize: 10
        }
      },
      yAxis: {
        type: 'category',
        data: heatmapData.genes,
        axisLabel: {
          fontSize: 10
        }
      },
      visualMap: {
        min: -scaleLimit,
        max: scaleLimit,
        text: ['Up', 'Down'],
        calculable: true,
        orient: 'horizontal',
        left: 'center',
        top: 20,
        inRange: {
          color: ['#313695', '#4575b4', '#74add1', '#abd9e9', '#e0f3f8', '#ffffbf', '#fee090', '#fdae61', '#f46d43', '#d73027', '#a50026']
        }
      },
      toolbox: {
        right: 10,
        top: 10,
        feature: {
          saveAsImage: { name: 'genesetr_deregulated_genes_heatmap', pixelRatio: 2 },
          mySvg: svgToolboxFeature("genesetr-deregulated-genes"),
        },
      },
      dataZoom: [
        ...(manyColumns ? [{ type: 'inside', xAxisIndex: 0 }, { type: 'slider', xAxisIndex: 0, height: 14, bottom: 4 }] : []),
        ...(manyRows ? [{ type: 'inside', yAxisIndex: 0 }, { type: 'slider', yAxisIndex: 0, width: 14, right: 8 }] : []),
      ],
      series: [{
        name: 'Z-Score',
        type: 'heatmap',
        data: heatmapData.matrix.flatMap((row, i) =>
          row.map((value, j) => [j, i, value])
        ),
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        }
      }]
    };

    return option;
  };

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

  const baseColumns = [
    {
      accessorKey: 'gene',
      header: 'Gene Symbol',
      size: 150,
    },
    {
      accessorKey: 'avgZScore',
      header: 'Avg Z-Score',
      size: 120,
      sortingFn: 'basic', // numeric
      Cell: ({ cell }) => formatZ(cell.getValue()),
    },
    {
      accessorKey: 'frequency',
      header: 'Frequency',
      size: 100,
    },
    {
      accessorKey: 'direction',
      header: 'Direction',
      size: 100,
    },
    {
      accessorKey: 'perturbationCount',
      header: 'Perturbation Count',
      size: 150,
    },
  ];

  const tableColumns = tableDataset === "MULTI"
    ? [
        ...baseColumns,
        {
          accessorKey: 'datasetCount',
          header: '#Datasets',
          size: 100,
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

  return (
    <div className={styles.container}>
      <div className={styles.explainer}>
        <div className={styles.explainerTitle}>How these metrics are calculated</div>
        <ul>
          {explainer.map((line, idx) => (
            <li key={idx}>{line}</li>
          ))}
        </ul>
      
      </div>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
          <Tab value="table" label="Table" />
          {showHeatmap && <Tab value="heatmap" label="Heatmap" />}
        </Tabs>
      </Box>

      <Box sx={{ padding: 2, height: 'calc(100% - 48px)', overflow: 'auto' }}>
        {(activeTab === "table" || activeTab === "heatmap") && (
          <div className={styles.datasetSelector}>
            <label htmlFor="datasetSelect">Choose dataset for table view (select "Multi" for common genes):</label>
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

        {activeTab === "table" && (
          <div className={styles.tableContainer}>
            {multiDatasetData?.datasets && (
              <div className={styles.datasetBadge}>Showing results for: {tableDatasetLabel}</div>
            )}
            {tableData.length > 0 ? (
              <>
                <MaterialReactTable
                  columns={tableColumns}
                  data={tableData}
                  renderTopToolbarCustomActions={({ table }) => (
                    <TableExportButtons
                      filename="genesetr-deregulated-genes"
                      columns={tableColumns}
                      rows={() => table.getPrePaginationRowModel().rows.map((row) => row.original)}
                    />
                  )}
                  enableSorting
                  enablePagination
                  initialState={{
                    pagination: {
                      pageSize: 50,
                      pageIndex: 0,
                    },
                    sorting: [{ id: tableDataset === "MULTI" ? 'datasetCount' : 'perturbationCount', desc: true }],
                  }}
                  muiTableContainerProps={{
                    sx: { maxHeight: 'calc(100vh - 300px)' }
                  }}
                  muiTableBodyRowProps={({ row }) => ({
                    onClick: () => openDetailForGene(row.original.gene),
                    sx: { cursor: 'pointer' },
                  })}
                />
                {enrichmentGeneLists && Object.keys(enrichmentGeneLists).length > 0 && (
                  <div style={{ marginTop: "12px" }}>
                    <GeneSetEnrichmentTable genesets={enrichmentGeneLists} />
                  </div>
                )}
              </>
            ) : (
              <div className={styles.noData}>No results available</div>
            )}
          </div>
        )}

        {activeTab === "heatmap" && showHeatmap && (
          <div className={styles.heatmapContainer}>
            {heatmapData ? (
              <ReactECharts
                option={heatmapData}
                style={{ height: 'calc(100vh - 250px)', width: '100%' }}
                opts={{ renderer: 'canvas' }}
              />
            ) : (
              <div className={styles.noData}>No heatmap data available</div>
            )}
          </div>
        )}

      </Box>

      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {detailData.gene ? `Contributing perturbations for ${detailData.gene}` : "No gene selected"}
        </DialogTitle>
        <DialogContent dividers>
          {detailData.entries.length === 0 && (
            <Typography variant="body2">No contributing perturbations were recorded for this gene.</Typography>
          )}
          {detailData.entries.length > 0 && (
            <List dense>
              {detailData.entries.map((entry, idx) => (
                <React.Fragment key={`${entry.dataset}-${entry.perturbation}-${idx}`}>
                  <ListItem>
                    <ListItemText
                      primary={`${idx + 1}. ${entry.perturbation} (${entry.dataset})`}
                      secondary={`Direction: ${entry.direction} | Z-Score: ${entry.z_score?.toFixed ? entry.z_score.toFixed(3) : entry.z_score}`}
                    />
                  </ListItem>
                  {idx < detailData.entries.length - 1 && <Divider component="li" />}
                </React.Fragment>
              ))}
            </List>
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
