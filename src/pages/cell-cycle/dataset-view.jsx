import React, { useEffect, useMemo, useState } from "react";
import { MaterialReactTable } from "material-react-table";
import { TableExportButtons } from "../../components/export-buttons";
import { SendToMenu } from "../../components/send-to";
import { useChartTheme } from "../../utils/chartTheme";
import { mrtLook, numericColumn } from "../../utils/tableStyle";
import {
  FDR_CUTOFF,
  PHASES,
  TABLE_EXPORT_COLUMNS,
  filterRows,
  formatFdr,
  formatPercent,
  formatZ,
  isNum,
  tableRows,
  topBySignature,
  topHits,
} from "../../utils/cellCycle";
import { fetchCellCycleTable } from "../../store/api/cellcycle";
import { shiftMapOption, signatureMapOption } from "./charts";
import { Chart, Delta, EvidenceBadge, PerturbationDetail, PhaseBar, PhaseLegend } from "./parts";
import styles from "./cell-cycle-page.module.scss";

const HIT_GROUPS = [
  { key: "g1", title: "More cells in G1", hint: "slower S-phase entry, G1 arrest" },
  { key: "s", title: "More cells in S", hint: "slower replication, replication stress" },
  { key: "g2m", title: "More cells in G2/M", hint: "G2 or mitotic arrest" },
];

const plural = (n, noun) => `${(n || 0).toLocaleString("en-US")} ${noun}${n === 1 ? "" : "s"}`;

const SummaryCards = ({ dataset, nRows }) => {
  const cal = dataset.calibration || {};
  const val = dataset.validation || {};
  return (
    <div className={styles.cards}>
      <div className={styles.stat}>
        <span className={styles.statLabel}>{dataset.kind === "drug" ? "Treatments" : "Perturbations"}</span>
        <span className={styles.statValue}>{nRows.toLocaleString("en-US")}</span>
        {dataset.has_phase && <span className={styles.muted}>{plural(dataset.n_cells, "cell")} scored</span>}
      </div>
      {dataset.has_phase && (
        <>
          <div className={styles.stat}>
            <span className={styles.statLabel}>Control cells</span>
            <PhaseBar g1={dataset.control?.g1} s={dataset.control?.s} g2m={dataset.control?.g2m} width={150} />
            <span className={styles.muted}>
              G1 {formatPercent(dataset.control?.g1)} · S {formatPercent(dataset.control?.s)} · G2/M{" "}
              {formatPercent(dataset.control?.g2m)}
            </span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statLabel}>Changed phase shares</span>
            <span className={styles.statValue}>{(dataset.n_sig_phase || 0).toLocaleString("en-US")}</span>
            <span className={styles.muted}>at FDR &lt; {FDR_CUTOFF}</span>
          </div>
          <div className={styles.stat} title="Spearman correlation, over perturbations with ≥ 50 cells, between the G2/M signature of the profile and the change in the G2/M share">
            <span className={styles.statLabel}>Profile agrees with phase calls</span>
            <span className={styles.statValue}>{isNum(val["sig_g2m~delta_g2m"]) ? `ρ ${val["sig_g2m~delta_g2m"].toFixed(2)}` : "–"}</span>
            <span className={styles.muted}>
              {cal.null_groups >= 30 ? `tests calibrated on ${cal.null_groups} control groups` : "few control groups: tests not calibrated"}
            </span>
          </div>
        </>
      )}
    </div>
  );
};

const HitList = ({ group, rows, dataset, onPick, signature }) => (
  <div className={styles.hitList} data-testid={`cc-hits-${group.key}`}>
    <div className={styles.hitHead}>
      <div>
        <h4>{group.title}</h4>
        <span className={styles.muted}>{group.hint}</span>
      </div>
      {rows.length > 0 && (
        <SendToMenu
          genes={rows.map((r) => r.target)}
          label="Send to…"
          defaultName={`Cell cycle, ${dataset.name}: ${group.title.toLowerCase()}`}
          drugs={dataset.kind === "drug"}
        />
      )}
    </div>
    {rows.length === 0 ? (
      <div className={styles.muted}>None at FDR &lt; {FDR_CUTOFF}</div>
    ) : (
      <ol>
        {rows.map((r) => (
          <li key={r.target}>
            <button type="button" className={styles.linkButton} onClick={() => onPick(r.target)}>
              {r.target}
            </button>
            {signature ? (
              <span className={styles.muted}>{formatZ(r[signature])}</span>
            ) : (
              <Delta value={r[`delta_${group.key}`]} />
            )}
          </li>
        ))}
      </ol>
    )}
  </div>
);

const DatasetView = ({ dataset, selected, onSelect }) => {
  const chart = useChartTheme();
  const [state, setState] = useState({ status: "loading" });
  const [minCells, setMinCells] = useState(0);
  const [significantOnly, setSignificantOnly] = useState(false);

  useEffect(() => {
    if (!dataset) return;
    let current = true;
    setState({ status: "loading" });
    fetchCellCycleTable(dataset.dataset_id)
      .then((data) => current && setState({ status: "done", rows: tableRows(data), control: data.control }))
      .catch((err) => current && setState({ status: "error", error: err.message }));
    return () => {
      current = false;
    };
  }, [dataset]);

  const rows = state.rows || [];
  const phase = dataset?.has_phase;
  const drug = dataset?.kind === "drug";
  const shown = useMemo(() => filterRows(rows, { minCells, significantOnly }), [rows, minCells, significantOnly]);

  const hits = useMemo(() => {
    if (phase) return HIT_GROUPS.map((g) => ({ group: g, rows: topHits(rows, g.key, { minCells: Math.max(minCells, 20) }) }));
    return [
      { group: { key: "s_up", title: "Highest S signature", hint: "S-phase genes up in the profile" }, rows: topBySignature(rows, "rz_s"), signature: "rz_s" },
      { group: { key: "g2m_up", title: "Highest G2/M signature", hint: "G2/M genes up in the profile" }, rows: topBySignature(rows, "rz_g2m"), signature: "rz_g2m" },
      {
        group: { key: "low", title: "Lowest proliferation signature", hint: "S and G2/M genes down: fewer cycling cells" },
        rows: topBySignature(rows.map((r) => ({ ...r, both: isNum(r.rz_s) && isNum(r.rz_g2m) ? (r.rz_s + r.rz_g2m) / 2 : null })), "both", { direction: -1 }),
        signature: "both",
      },
    ];
  }, [rows, phase, minCells]);

  const columns = useMemo(() => {
    const cols = [
      {
        accessorKey: "target",
        header: drug ? "Treatment" : "Perturbation",
        size: 130,
        Cell: ({ cell }) => (
          <button type="button" className={styles.linkButton} onClick={() => onSelect(cell.getValue())}>
            {cell.getValue()}
          </button>
        ),
      },
    ];
    if (phase) {
      cols.push(
        { accessorKey: "n_cells", header: "Cells", size: 70, ...numericColumn },
        {
          id: "phases",
          header: "G1 · S · G2/M",
          size: 140,
          enableSorting: false,
          accessorFn: (r) => r.frac_g1,
          Cell: ({ row }) => <PhaseBar g1={row.original.frac_g1} s={row.original.frac_s} g2m={row.original.frac_g2m} />,
        },
        ...PHASES.map(({ key, label }) => ({
          accessorKey: `delta_${key}`,
          header: `Δ ${label}`,
          size: 80,
          ...numericColumn,
          Cell: ({ cell }) => <Delta value={cell.getValue()} />,
        })),
        {
          accessorKey: "fdr_phase",
          header: "FDR",
          size: 70,
          ...numericColumn,
          sortUndefined: "last",
          Cell: ({ cell }) => (
            <span className={isNum(cell.getValue()) && cell.getValue() < FDR_CUTOFF ? styles.strong : styles.muted}>
              {formatFdr(cell.getValue())}
            </span>
          ),
        },
        { accessorKey: "z_s", header: "S score z", size: 75, ...numericColumn, Cell: ({ cell }) => formatZ(cell.getValue()) },
        { accessorKey: "z_g2m", header: "G2/M score z", size: 85, ...numericColumn, Cell: ({ cell }) => formatZ(cell.getValue()) }
      );
    }
    cols.push(
      { accessorKey: "rz_s", header: "S signature", size: 85, ...numericColumn, Cell: ({ cell }) => formatZ(cell.getValue()) },
      { accessorKey: "rz_g2m", header: "G2/M signature", size: 95, ...numericColumn, Cell: ({ cell }) => formatZ(cell.getValue()) }
    );
    return cols;
  }, [phase, drug, onSelect]);

  const look = mrtLook({
    pageSize: 25,
    maxHeight: "70vh",
    initialState: {
      showGlobalFilter: true,
      sorting: phase ? [{ id: "fdr_phase", desc: false }] : [{ id: "rz_g2m", desc: true }],
    },
  });

  if (!dataset) return null;

  return (
    <div className={styles.view} data-testid="cc-dataset-view">
      <div className={styles.datasetHead}>
        <div>
          <h2>{dataset.name}</h2>
          <div className={styles.muted}>
            {[dataset.cell_line, dataset.perturbation_type].filter(Boolean).join(" · ")} <EvidenceBadge dataset={dataset} />
          </div>
        </div>
        <PhaseLegend />
      </div>

      {state.status === "loading" && <div className={styles.status}>Loading the perturbations…</div>}
      {state.status === "error" && <div className={styles.status} role="alert">{state.error}</div>}

      {state.status === "done" && (
        <>
          <SummaryCards dataset={dataset} nRows={rows.length} />
          {!phase && (
            <p className={styles.explain}>
              {drug ? "Tahoe-100M" : "This dataset"} provides no single-cell counts, so cells cannot be assigned to phases.
              Shown instead is the cell-cycle signature of each {drug ? "treatment" : "perturbation"} profile: the mean
              change of the 43 S-phase and 54 G2/M genes, as a robust z within the dataset. Both signatures down means
              fewer cycling cells; G2/M up alone points to a G2/M arrest.
              {dataset.profile?.s_genes ? ` Measured here: ${dataset.profile.s_genes} S and ${dataset.profile.g2m_genes} G2/M genes.` : ""}
            </p>
          )}

          <div className={styles.mapLayout}>
            <section className={styles.card}>
              <div className={styles.cardHead}>
                <div>
                  <h3>{phase ? "Phase-shift map" : "Signature map"}</h3>
                  <span className={styles.muted}>
                    {phase
                      ? "Each dot is a perturbation, placed by how much the share of its cells in S and in G2/M differs from control cells of the same batches. G1 is the remainder: lower left means more cells in G1. Coloured dots: FDR < 0.05, by the phase that gained most. Click a dot for details."
                      : "Each dot is a perturbation profile, placed by its S-phase and G2/M gene signatures. Click a dot for details."}
                  </span>
                </div>
              </div>
              <Chart
                option={
                  phase
                    ? shiftMapOption(rows, chart.p, { selected, minCells })
                    : signatureMapOption(rows, chart.p, { selected, drug })
                }
                height={460}
                onClick={onSelect}
                testId="cc-map"
              />
            </section>
            <div className={styles.side}>
              {selected ? (
                <PerturbationDetail dataset={dataset} target={selected} onClose={() => onSelect(null)} />
              ) : (
                <div className={styles.hits}>
                  {hits.map(({ group, rows: hr, signature }) => (
                    <HitList key={group.key} group={group} rows={hr} dataset={dataset} onPick={onSelect} signature={signature} />
                  ))}
                </div>
              )}
            </div>
          </div>

          <section className={styles.tableSection}>
            <MaterialReactTable
              columns={columns}
              data={shown}
              {...look}
              enableColumnFilters={false}
              positionGlobalFilter="left"
              getRowId={(r) => r.target}
              muiTableBodyRowProps={({ row }) => ({
                onClick: () => onSelect(row.original.target),
                sx: {
                  ...look.muiTableBodyRowProps?.sx,
                  cursor: "pointer",
                  backgroundColor: row.original.target === selected ? "var(--gs-selected)" : undefined,
                },
              })}
              renderTopToolbarCustomActions={({ table }) => (
                <div className={styles.toolbar}>
                  {phase && (
                    <>
                      <label className={styles.inline}>
                        Min cells
                        <input
                          type="number"
                          min={0}
                          step={10}
                          value={minCells}
                          className={styles.number}
                          onChange={(e) => setMinCells(Math.max(0, parseInt(e.target.value || "0", 10)))}
                        />
                      </label>
                      <label className={styles.inline}>
                        <input type="checkbox" checked={significantOnly} onChange={(e) => setSignificantOnly(e.target.checked)} />
                        FDR &lt; {FDR_CUTOFF} only
                      </label>
                    </>
                  )}
                  <TableExportButtons
                    filename={`genesetr-cell-cycle-${dataset.dataset_id}`}
                    columns={TABLE_EXPORT_COLUMNS.filter((c) => phase || !/share|Delta|FDR|score shift|^Cells/.test(c.header))}
                    rows={() => table.getPrePaginationRowModel().rows.map((r) => r.original)}
                  />
                  <SendToMenu
                    genes={() => table.getPrePaginationRowModel().rows.slice(0, 500).map((r) => r.original.target)}
                    label="Send the list to…"
                    defaultName={`Cell cycle, ${dataset.name}`}
                    drugs={drug}
                  />
                </div>
              )}
            />
          </section>
        </>
      )}
    </div>
  );
};

export { DatasetView };
