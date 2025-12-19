import React, { useEffect, useMemo, useState } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { MaterialReactTable } from "material-react-table";
import { useSelector } from "react-redux";
import * as echarts from "echarts/core";
import { BarChart, LineChart } from "echarts/charts";
import { CanvasRenderer } from "echarts/renderers";
import { GridComponent, TooltipComponent } from "echarts/components";
import ReactEChartsCore from "echarts-for-react/lib/core";
import styles from "./cell-cycle-page.module.scss";
import {
  fetchCellCycleAggregateV2,
  fetchCellCycleComparisonV2,
} from "../../store/api/v2";

echarts.use([TooltipComponent, GridComponent, BarChart, LineChart, CanvasRenderer]);

const CONTROL_LABEL = "Non-Targeting";
const NO_DATA_FOR_GENE_MESSAGE = "No data available for this gene";

const toCellCycleDetailErrorMessage = (err, { anyFulfilled } = {}) => {
  if (!err) return null;

  const message = err?.message || String(err);
  const code = err?.code;
  const status = err?.response?.status;

  if (code === "NOT_FOUND" || status === 404) return NO_DATA_FOR_GENE_MESSAGE;

  if (typeof message === "string") {
    if (/not found/i.test(message)) return NO_DATA_FOR_GENE_MESSAGE;
    if (message === "Network Error" && anyFulfilled) return NO_DATA_FOR_GENE_MESSAGE;
  }

  return message;
};

const moduleDescription = {
  title: "Cell-Cycle Explorer",
  description:
    "Select multiple cell lines with cell-cycle annotations. The table shows Δ%G1 / Δ%S / Δ%G2M per gene (vs control) for each selected cell line plus an average. Click a gene to see per-cell-line plots.",
};

const keyify = (s) => String(s || "").replace(/[^a-zA-Z0-9]+/g, "_");

const formatDeltaPct = (value) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "—";
  const v = Number(value);
  const sign = v > 0 ? "+" : "";
  return `${sign}${v.toFixed(2)}%`;
};

const deltaCellStyle = (value) => {
  const v = Number(value);
  if (!Number.isFinite(v)) return { color: "#444" };
  if (v > 0) return { color: "#1a73e8", fontWeight: 700 };
  if (v < 0) return { color: "#e15759", fontWeight: 700 };
  return { color: "#444", fontWeight: 700 };
};

const buildPhaseCompositionOption = (compareData) => {
  if (!compareData?.target?.phase_pct || !compareData?.control?.phase_pct) return null;
  const pct = (x) => Math.round((x || 0) * 1000) / 10;
  const c = compareData.control.phase_pct;
  const t = compareData.target.phase_pct;

  return {
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" }, valueFormatter: (v) => `${v}%` },
    grid: { top: 8, left: 34, right: 10, bottom: 24, containLabel: true },
    xAxis: { type: "category", data: ["G1", "S", "G2M"], axisLabel: { fontSize: 11 } },
    yAxis: { type: "value", max: 100, axisLabel: { formatter: "{value}%", fontSize: 11 } },
    series: [
      {
        name: "Control",
        type: "bar",
        data: [pct(c.g1), pct(c.s), pct(c.g2m)],
        itemStyle: { color: "#9aa0a6" },
      },
      {
        name: "Perturbation",
        type: "bar",
        data: [pct(t.g1), pct(t.s), pct(t.g2m)],
        itemStyle: { color: "#1a73e8" },
      },
    ],
  };
};

const buildHalfViolinOption = (compareData, scoreKey) => {
  const bins = compareData?.bins?.[scoreKey];
  if (!bins?.x?.length) return null;

  const x = bins.x;
  const yT = bins.density_target || [];
  const yC = bins.density_control || [];

  const maxD = Math.max(1e-12, ...yT.map((v) => Math.abs(v || 0)), ...yC.map((v) => Math.abs(v || 0)));
  const yMax = maxD * 1.12;
  const toPairs = (xs, ys, sign = 1) => xs.map((v, i) => [v, sign * (ys?.[i] ?? 0)]);

  return {
    tooltip: { trigger: "axis", valueFormatter: (v) => Math.abs(v).toExponential(2) },
    grid: { top: 8, left: 40, right: 10, bottom: 24, containLabel: true },
    xAxis: { type: "value", axisLabel: { fontSize: 11 } },
    yAxis: {
      type: "value",
      min: -yMax,
      max: yMax,
      axisLabel: { show: false },
      splitLine: { lineStyle: { color: "#eef1f4" } },
    },
    series: [
      {
        name: "Control",
        type: "line",
        smooth: true,
        showSymbol: false,
        data: toPairs(x, yC, -1),
        lineStyle: { width: 1.2, color: "#9aa0a6" },
        areaStyle: { opacity: 0.25, color: "#9aa0a6" },
      },
      {
        name: "Perturbation",
        type: "line",
        smooth: true,
        showSymbol: false,
        data: toPairs(x, yT, 1),
        lineStyle: { width: 1.2, color: "#1a73e8" },
        areaStyle: { opacity: 0.25, color: "#1a73e8" },
        markLine: {
          symbol: ["none", "none"],
          data: [{ yAxis: 0, lineStyle: { color: "#cfd4da" }, label: { show: false } }],
        },
      },
    ],
  };
};

const CellCyclePage = () => {
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(true);

  const cellCycleSettings = useSelector((state) => state.settings?.cellCycle ?? {});
  const selectedCellLines = cellCycleSettings?.selectedCellLines || [];
  const minCells = cellCycleSettings?.minCells ?? 0;
  const minCellLines = cellCycleSettings?.minCellLines ?? 1;

  const [aggregate, setAggregate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailGene, setDetailGene] = useState(null);
  const [detailRows, setDetailRows] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const loadAggregate = async () => {
      if (!selectedCellLines.length) {
        setAggregate(null);
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const res = await fetchCellCycleAggregateV2({
          cellLines: selectedCellLines,
          control: CONTROL_LABEL,
          minCells: Number(minCells) || 0,
        });
        if (!cancelled) setAggregate(res);
      } catch (e) {
        if (!cancelled) {
          setAggregate(null);
          setError(e?.message || String(e));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadAggregate();
    return () => {
      cancelled = true;
    };
  }, [selectedCellLines, minCells]);

  const cellLineKeyMap = useMemo(() => {
    const m = {};
    (selectedCellLines || []).forEach((cl) => {
      m[cl] = keyify(cl);
    });
    return m;
  }, [selectedCellLines]);

  const tableData = useMemo(() => {
    const genes = aggregate?.genes || [];
    const parsedMin = parseInt(String(minCellLines), 10);
    const minPresence = Math.max(1, Number.isFinite(parsedMin) ? parsedMin : 1);

    return genes
      .filter((g) => Number(g?.present_in || 0) >= minPresence)
      .map((g) => {
      const row = {
        gene_target: g.gene_target,
        present_in: g.present_in,
      };

      const avg = g.avg || {};
      row.g1_avg = avg.delta_phase_g1 != null ? avg.delta_phase_g1 * 100 : null;
      row.s_avg = avg.delta_phase_s != null ? avg.delta_phase_s * 100 : null;
      row.g2m_avg = avg.delta_phase_g2m != null ? avg.delta_phase_g2m * 100 : null;

      (selectedCellLines || []).forEach((cl) => {
        const k = cellLineKeyMap[cl];
        const per = g.per_cell_line?.[cl];
        row[`g1_${k}`] = per?.delta_phase_g1 != null ? per.delta_phase_g1 * 100 : null;
        row[`s_${k}`] = per?.delta_phase_s != null ? per.delta_phase_s * 100 : null;
        row[`g2m_${k}`] = per?.delta_phase_g2m != null ? per.delta_phase_g2m * 100 : null;
      });

      return row;
      });
  }, [aggregate, selectedCellLines, cellLineKeyMap, minCellLines]);

  const tableColumns = useMemo(() => {
    const deltaColumn = (prefix, header, avgKey) => ({
      header,
      columns: [
        ...(selectedCellLines || []).map((cl) => {
          const k = cellLineKeyMap[cl];
          const accessorKey = `${prefix}_${k}`;
          return {
            accessorKey,
            header: cl,
            size: 90,
            Cell: ({ cell }) => {
              const v = cell.getValue();
              return <span style={deltaCellStyle(v)}>{formatDeltaPct(v)}</span>;
            },
          };
        }),
        {
          accessorKey: avgKey,
          header: "Avg",
          size: 90,
          Cell: ({ cell }) => {
            const v = cell.getValue();
            return <span style={deltaCellStyle(v)}>{formatDeltaPct(v)}</span>;
          },
        },
      ],
    });

    return [
      { accessorKey: "gene_target", header: "Gene", size: 140 },
      { accessorKey: "present_in", header: "#Cell lines", size: 90 },
      deltaColumn("g1", "Δ%G1", "g1_avg"),
      deltaColumn("s", "Δ%S", "s_avg"),
      deltaColumn("g2m", "Δ%G2M", "g2m_avg"),
    ];
  }, [selectedCellLines, cellLineKeyMap]);

  const datasetsSummary = useMemo(() => {
    if (!aggregate?.datasets) return null;
    const parts = (selectedCellLines || [])
      .map((cl) => {
        const ds = aggregate.datasets?.[cl];
        if (!ds?.dataset_id) return null;
        return `${cl}: #${ds.dataset_id}`;
      })
      .filter(Boolean);
    if (!parts.length) return null;
    return `Using latest runs: ${parts.join(" • ")}`;
  }, [aggregate, selectedCellLines]);

  const openDetailForGene = (geneTarget) => {
    setDetailGene(geneTarget);
    setDetailOpen(true);
  };

  useEffect(() => {
    let cancelled = false;

    const loadDetails = async () => {
      if (!detailOpen || !detailGene || !selectedCellLines.length) return;

      setDetailLoading(true);
      setDetailError(null);
      setDetailRows([]);

      const results = await Promise.allSettled(
        selectedCellLines.map((cl) =>
          fetchCellCycleComparisonV2({
            cellLine: cl,
            target: detailGene,
            level: "gene",
            control: CONTROL_LABEL,
            smooth: true,
          })
        )
      );

      const anyFulfilled = results.some((r) => r.status === "fulfilled");
      const rows = results.map((res, idx) => {
        const cl = selectedCellLines[idx];
        if (res.status === "fulfilled") return { cell_line: cl, data: res.value, error: null };
        return {
          cell_line: cl,
          data: null,
          error: toCellCycleDetailErrorMessage(res.reason, { anyFulfilled }),
        };
      });

      if (!cancelled) {
        setDetailRows(rows);
        setDetailLoading(false);
      }
    };

    loadDetails().catch((e) => {
      if (!cancelled) {
        setDetailError(e?.message || String(e));
        setDetailLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [detailOpen, detailGene, selectedCellLines]);

  return (
    <div className={styles.mainView}>
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
          "& .MuiAccordionSummary-root.Mui-expanded": { minHeight: "30px", height: "30px" },
        }}
      >
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          sx={{
            backgroundColor: "#f5f5f5",
            borderBottom: "1px solid #e0e0e0",
            minHeight: "30px",
            "&.Mui-expanded": { minHeight: "30px" },
          }}
        >
          <h3 style={{ margin: 0, color: "#495057", fontSize: "16px" }}>{moduleDescription.title}</h3>
        </AccordionSummary>
        <AccordionDetails sx={{ padding: "5px 14px 10px" }}>
          <p style={{ margin: "0 0 8px 0", color: "#424242", fontSize: "14px", lineHeight: "1.4" }}>
            {moduleDescription.description}
          </p>
          <div className={styles.legendLine}>
            <span className={styles.legendItem}>
              <span className={styles.legendSwatchControl} /> Control
            </span>
            <span className={styles.legendItem}>
              <span className={styles.legendSwatchPert} /> Perturbation
            </span>
          </div>
        </AccordionDetails>
      </Accordion>

      <div className={styles.controls}>
        <div className={styles.controlsMeta}>
          <div className={styles.datasetBadge}>
            Selected cell lines: {selectedCellLines.length ? selectedCellLines.join(", ") : "None (use left settings)"}
            {" • "}
            Min cells per gene: {Number(minCells) || 0}
            {" • "}
            Min cell lines with data: {Number(minCellLines) || 1}
          </div>
          {datasetsSummary && <div className={styles.datasetBadge}>{datasetsSummary}</div>}
          {loading && <div className={styles.status}>Loading cell-cycle deltas…</div>}
          {error && <div className={styles.statusError}>Cell-cycle data unavailable: {error}</div>}
          {!loading && !error && aggregate?.gene_count != null && (
            <div className={styles.status}>
              Loaded {aggregate.gene_count.toLocaleString()} genes across {selectedCellLines.length} cell lines • Showing{" "}
              {tableData.length.toLocaleString()}
            </div>
          )}
        </div>
      </div>

      <div className={styles.tableContainer}>
        {!loading && !error && tableData.length > 0 ? (
          <MaterialReactTable
            columns={tableColumns}
            data={tableData}
            enableSorting
            enablePagination 
            positionGlobalFilter="left"           
            enableColumnPinning
            initialState={{
              pagination: { pageSize: 50, pageIndex: 0 },
              columnPinning: { left: ["gene_target"] },
              showGlobalFilter: true,
            }}
            muiTableContainerProps={{ sx: { maxHeight: "calc(100vh - 300px)" } }}
            muiTableBodyRowProps={({ row }) => ({
              onClick: () => openDetailForGene(row.original.gene_target),
              sx: { cursor: "pointer" },
            })}
          />
        ) : (
          !loading &&
          !error && (
            <div className={styles.noData}>
              {!selectedCellLines.length
                ? "Select one or more cell lines to begin."
                : aggregate?.gene_count
                  ? "No genes match the current filters."
                  : "No data available for the selected cell lines."}
            </div>
          )
        )}
      </div>

      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="xl" fullWidth>
        <DialogTitle>{detailGene ? `Cell-cycle impact for ${detailGene}` : "Cell-cycle impact"}</DialogTitle>
        <DialogContent dividers>
          {detailError && <Typography color="error">{detailError}</Typography>}
          {detailLoading && <Typography className={styles.status}>Loading per-cell-line plots…</Typography>}

          {!detailLoading && detailRows.length > 0 && (
            <Box>
              <div className={styles.detailHeaderRow}>
                <div />
                <div className={styles.detailHeader}>Phase composition</div>
                <div className={styles.detailHeader}>S score half-violin</div>
                <div className={styles.detailHeader}>G2M score half-violin</div>
              </div>
              <Divider style={{ margin: "8px 0 10px" }} />

              <div className={styles.detailRows}>
                {detailRows.map((r) => (
                  <div key={r.cell_line} className={styles.detailRow}>
                    <div className={styles.detailCellLine}>
                      <div className={styles.detailCellLineName}>{r.cell_line}</div>
                      {r.data?.dataset?.dataset_id && (
                        <div className={styles.detailCellLineMeta}>dataset_id #{r.data.dataset.dataset_id}</div>
                      )}
                      {r.data?.deltas && (
                        <div className={styles.detailCellLineMeta}>
                          Δ%G1 {formatDeltaPct((r.data.deltas.delta_phase_g1 || 0) * 100)} • Δ%S{" "}
                          {formatDeltaPct((r.data.deltas.delta_phase_s || 0) * 100)} • Δ%G2M{" "}
                          {formatDeltaPct((r.data.deltas.delta_phase_g2m || 0) * 100)}
                        </div>
                      )}
                      {r.error && <div className={styles.statusError}>{r.error}</div>}
                    </div>

                    <div className={styles.detailChart}>
                      {r.data && (
                        <ReactEChartsCore
                          echarts={echarts}
                          option={buildPhaseCompositionOption(r.data)}
                          notMerge={true}
                          lazyUpdate={true}
                          style={{ height: 210, width: "100%" }}
                        />
                      )}
                    </div>

                    <div className={styles.detailChart}>
                      {r.data && (
                        <ReactEChartsCore
                          echarts={echarts}
                          option={buildHalfViolinOption(r.data, "s")}
                          notMerge={true}
                          lazyUpdate={true}
                          style={{ height: 210, width: "100%" }}
                        />
                      )}
                    </div>

                    <div className={styles.detailChart}>
                      {r.data && (
                        <ReactEChartsCore
                          echarts={echarts}
                          option={buildHalfViolinOption(r.data, "g2m")}
                          notMerge={true}
                          lazyUpdate={true}
                          style={{ height: 210, width: "100%" }}
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export { CellCyclePage };
