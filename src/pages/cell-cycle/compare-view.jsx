import React, { useEffect, useMemo, useState } from "react";
import { MaterialReactTable } from "material-react-table";
import { TableExportButtons } from "../../components/export-buttons";
import { SendToMenu } from "../../components/send-to";
import { useChartTheme } from "../../utils/chartTheme";
import { mrtLook, numericColumn } from "../../utils/tableStyle";
import { FDR_CUTOFF, METRICS, consensusRows, divergingColor, formatDelta, formatFdr, formatZ, isNum, metricMeta } from "../../utils/cellCycle";
import { fetchCellCycleCompare } from "../../store/api/cellcycle";
import styles from "./cell-cycle-page.module.scss";

/** Column label: the cell line when it is short and unique among the columns, else the dataset id. */
const shortLabels = (ids, byId) => {
  const lines = ids.map((id) => byId[id]?.cell_line || "");
  return Object.fromEntries(
    ids.map((id, i) => {
      const line = lines[i];
      const unique = line && line.length <= 14 && lines.filter((l) => l === line).length === 1;
      return [id, unique ? line : id];
    })
  );
};

const CompareView = ({ datasets, metric, onMetric, onPickGene }) => {
  const chart = useChartTheme();
  const meta = metricMeta(metric);
  const genetic = useMemo(() => datasets.filter((d) => d.kind !== "drug"), [datasets]);
  const eligible = useMemo(() => (meta.phase ? genetic.filter((d) => d.has_phase) : genetic), [genetic, meta.phase]);
  const [chosen, setChosen] = useState(null);
  const [minDatasets, setMinDatasets] = useState(2);
  const [minCells, setMinCells] = useState(30);
  const [state, setState] = useState({ status: "idle" });

  // default: every eligible dataset; drop choices that the metric does not allow
  const selectedIds = useMemo(() => {
    const ok = new Set(eligible.map((d) => d.dataset_id));
    const base = chosen || eligible.map((d) => d.dataset_id);
    return base.filter((id) => ok.has(id));
  }, [chosen, eligible]);

  useEffect(() => {
    if (selectedIds.length === 0) {
      setState({ status: "idle" });
      return undefined;
    }
    const controller = new AbortController();
    setState({ status: "loading" });
    const timer = setTimeout(() => {
      fetchCellCycleCompare({
        datasets: selectedIds,
        metric,
        minCells: meta.phase ? minCells : 0,
        minDatasets: Math.min(minDatasets, selectedIds.length),
        signal: controller.signal,
      })
        .then((data) => !controller.signal.aborted && setState({ status: "done", data }))
        .catch((err) => !controller.signal.aborted && setState({ status: "error", error: err.message }));
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [selectedIds, metric, minCells, minDatasets, meta.phase]);

  const rows = useMemo(
    () => consensusRows(state.data, { minDatasets: Math.min(minDatasets, selectedIds.length) }),
    [state.data, minDatasets, selectedIds.length]
  );
  const byId = useMemo(() => Object.fromEntries(datasets.map((d) => [d.dataset_id, d])), [datasets]);
  const limit = meta.percent ? 0.25 : 6;
  const fmt = (v) => (meta.percent ? formatDelta(v) : formatZ(v));

  const toggle = (id) => {
    const set = new Set(selectedIds);
    if (set.has(id)) set.delete(id);
    else set.add(id);
    setChosen([...set]);
  };

  const columns = useMemo(() => {
    const ids = state.data?.datasets || [];
    const labels = shortLabels(ids, byId);
    return [
      {
        accessorKey: "target",
        header: "Gene",
        size: 110,
        Cell: ({ cell }) => (
          <button type="button" className={styles.linkButton} onClick={() => onPickGene(cell.getValue())}>
            {cell.getValue()}
          </button>
        ),
      },
      { accessorKey: "n", header: "Datasets", size: 70, ...numericColumn },
      ...(meta.phase ? [{ accessorKey: "n_sig", header: "Significant", size: 80, ...numericColumn }] : []),
      {
        accessorKey: "mean",
        header: "Mean",
        size: 80,
        ...numericColumn,
        Cell: ({ cell }) => <strong>{fmt(cell.getValue())}</strong>,
      },
      ...ids.map((id) => ({
        id: `ds_${id}`,
        header: labels[id],
        size: 72,
        accessorFn: (r) => r.values[id]?.[0] ?? null,
        sortUndefined: "last",
        muiTableHeadCellProps: { title: byId[id]?.name || id },
        ...numericColumn,
        Cell: ({ row }) => {
          const cell = row.original.values[id];
          if (!cell) return <span className={styles.muted}>·</span>;
          const [v, fdr] = cell;
          const sig = isNum(fdr) && fdr < FDR_CUTOFF;
          return (
            <span
              className={styles.heatCell}
              style={{ background: divergingColor(v, limit, chart.p), fontWeight: sig ? 700 : 400 }}
              title={`${byId[id]?.name || id}: ${fmt(v)}${isNum(fdr) ? `, FDR ${formatFdr(fdr)}` : ""}`}
            >
              {meta.percent ? (v * 100).toFixed(1) : v.toFixed(1)}
            </span>
          );
        },
      })),
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.data, meta, byId, chart.p, onPickGene]);

  const exportColumns = useMemo(
    () => [
      { accessorKey: "target", header: "Gene" },
      { accessorKey: "n", header: "Datasets" },
      { accessorKey: "n_sig", header: "Significant (FDR < 0.05)" },
      { accessorKey: "mean", header: `Mean ${meta.label}` },
      ...(state.data?.datasets || []).map((id) => ({ accessorKey: `ds_${id}`, header: byId[id]?.name || id })),
    ],
    [state.data, meta, byId]
  );

  const look = mrtLook({
    pageSize: 25,
    maxHeight: "68vh",
    initialState: { showGlobalFilter: true, columnPinning: { left: ["target"] } },
  });

  return (
    <div className={styles.view} data-testid="cc-compare-view">
      <p className={styles.explain}>
        Which perturbations shift the cell cycle in several cell types? Pick the datasets and the measure; genes are
        ranked by how many datasets call the change significant, then by the mean. Bold cells are significant (FDR &lt;{" "}
        {FDR_CUTOFF}); orange means more cells in the phase (or a higher signature), purple fewer.
      </p>
      <div className={styles.compareControls}>
        <label className={styles.pickerLabel}>
          <span>Measure</span>
          <select className={styles.select} value={metric} onChange={(e) => onMetric(e.target.value)}>
            {METRICS.map((m) => (
              <option key={m.key} value={m.key}>
                {m.label}
                {m.phase ? "" : " (all datasets)"}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.pickerLabel}>
          <span>Measured in at least</span>
          <input
            type="number"
            min={1}
            max={Math.max(1, selectedIds.length)}
            className={styles.number}
            value={minDatasets}
            onChange={(e) => setMinDatasets(Math.max(1, parseInt(e.target.value || "1", 10)))}
          />
          <span className={styles.muted}>datasets</span>
        </label>
        {meta.phase && (
          <label className={styles.pickerLabel}>
            <span>Min cells</span>
            <input
              type="number"
              min={0}
              step={10}
              className={styles.number}
              value={minCells}
              onChange={(e) => setMinCells(Math.max(0, parseInt(e.target.value || "0", 10)))}
            />
          </label>
        )}
      </div>
      <div className={styles.chipRow} role="group" aria-label="Datasets to compare">
        {eligible.map((d) => (
          <button
            key={d.dataset_id}
            type="button"
            className={`${styles.chip} ${selectedIds.includes(d.dataset_id) ? styles.chipActive : ""}`}
            onClick={() => toggle(d.dataset_id)}
            title={d.name}
            aria-pressed={selectedIds.includes(d.dataset_id)}
          >
            {d.name}
          </button>
        ))}
        <button type="button" className={styles.chip} onClick={() => setChosen(eligible.map((d) => d.dataset_id))}>
          All
        </button>
        <button type="button" className={styles.chip} onClick={() => setChosen([])}>
          None
        </button>
      </div>

      {state.status === "idle" && <div className={styles.status}>Choose at least one dataset.</div>}
      {state.status === "loading" && <div className={styles.status}>Comparing {selectedIds.length} datasets…</div>}
      {state.status === "error" && <div className={styles.status} role="alert">{state.error}</div>}
      {state.status === "done" && (
        <MaterialReactTable
          columns={columns}
          data={rows}
          {...look}
          enableColumnFilters={false}
          positionGlobalFilter="left"
          renderTopToolbarCustomActions={({ table }) => (
            <div className={styles.toolbar}>
              <span className={styles.muted}>{rows.length.toLocaleString("en-US")} genes</span>
              <TableExportButtons
                filename={`genesetr-cell-cycle-compare-${metric}`}
                columns={exportColumns}
                rows={() =>
                  table.getPrePaginationRowModel().rows.map(({ original: r }) => ({
                    ...r,
                    ...Object.fromEntries(Object.entries(r.values).map(([id, c]) => [`ds_${id}`, c[0]])),
                  }))
                }
              />
              <SendToMenu
                genes={() => table.getPrePaginationRowModel().rows.slice(0, 300).map((r) => r.original.target)}
                label="Send the top genes to…"
                defaultName={`Cell cycle consensus: ${meta.label}`}
              />
            </div>
          )}
        />
      )}
    </div>
  );
};

export { CompareView };
