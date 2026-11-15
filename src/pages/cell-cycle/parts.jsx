import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import * as echarts from "echarts/core";
import { BarChart, LineChart, ScatterChart } from "echarts/charts";
import { CanvasRenderer } from "echarts/renderers";
import {
  GridComponent,
  LegendComponent,
  MarkAreaComponent,
  MarkLineComponent,
  TitleComponent,
  ToolboxComponent,
  TooltipComponent,
} from "echarts/components";
import ReactEChartsCore from "echarts-for-react/lib/core";
import { useChartTheme } from "../../utils/chartTheme";
import {
  FDR_CUTOFF,
  PHASES,
  formatDelta,
  formatFdr,
  formatPercent,
  formatZ,
  groupDatasets,
  isNum,
  phaseColors,
  verdict,
} from "../../utils/cellCycle";
import { fetchCellCyclePerturbation } from "../../store/api/cellcycle";
import { genePagePath } from "../../utils/geneLinks";
import { drugPagePath } from "../../utils/perturbationKind";
import { compositionOption, densityOption } from "./charts";
import styles from "./cell-cycle-page.module.scss";

echarts.use([
  BarChart,
  LineChart,
  ScatterChart,
  CanvasRenderer,
  GridComponent,
  LegendComponent,
  MarkAreaComponent,
  MarkLineComponent,
  TitleComponent,
  ToolboxComponent,
  TooltipComponent,
]);

export const Chart = ({ option, height = 300, onClick, testId }) => {
  const chart = useChartTheme();
  if (!option) return null;
  return (
    <div data-testid={testId}>
      <ReactEChartsCore
        echarts={echarts}
        theme={chart.theme}
        option={option}
        notMerge
        lazyUpdate
        style={{ height, width: "100%" }}
        onEvents={onClick ? { click: (params) => params?.name && onClick(params.name) } : undefined}
      />
    </div>
  );
};

/** 100 % bar of the G1 / S / G2M shares. */
export const PhaseBar = ({ g1, s, g2m, width = 120, title }) => {
  const { p } = useChartTheme();
  const c = phaseColors(p);
  if (!isNum(g1)) return <span className={styles.muted}>–</span>;
  const parts = [
    ["g1", g1],
    ["s", s],
    ["g2m", g2m],
  ];
  return (
    <span
      className={styles.phaseBar}
      style={{ width }}
      title={title || `G1 ${formatPercent(g1)} · S ${formatPercent(s)} · G2/M ${formatPercent(g2m)}`}
    >
      {parts.map(([k, v]) => (
        <span key={k} style={{ width: `${Math.max(0, v) * 100}%`, background: c[k] }} />
      ))}
    </span>
  );
};

export const PhaseLegend = () => {
  const { p } = useChartTheme();
  const c = phaseColors(p);
  return (
    <span className={styles.phaseLegend}>
      {PHASES.map(({ key, label }) => (
        <span key={key}>
          <i style={{ background: c[key] }} /> {label}
        </span>
      ))}
    </span>
  );
};

export const Delta = ({ value }) => {
  if (!isNum(value)) return <span className={styles.muted}>–</span>;
  const cls = value > 0.005 ? styles.up : value < -0.005 ? styles.down : styles.muted;
  return <span className={cls}>{formatDelta(value)}</span>;
};

/** Dataset select, grouped by the kind of evidence. */
export const DatasetPicker = ({ datasets, value, onChange, id = "cc-dataset", label = "Dataset" }) => (
  <label className={styles.pickerLabel} htmlFor={id}>
    <span>{label}</span>
    <select id={id} className={styles.select} value={value || ""} onChange={(e) => onChange(e.target.value)}>
      {groupDatasets(datasets).map((group) => (
        <optgroup key={group.key} label={group.title}>
          {group.items.map((d) => (
            <option key={d.dataset_id} value={d.dataset_id}>
              {d.name || d.dataset_id}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  </label>
);

export const EvidenceBadge = ({ dataset }) =>
  dataset?.has_phase ? (
    <span className={`${styles.badge} ${styles.badgePhase}`} title="Phase of every cell called from its expression">
      Single-cell phase calls
    </span>
  ) : (
    <span
      className={`${styles.badge} ${styles.badgeProfile}`}
      title="No single-cell data: only the cell-cycle genes in the perturbation profile"
    >
      Profile signature only
    </span>
  );

/** Detail of one perturbation: composition, score densities and the numbers. */
export const PerturbationDetail = ({ dataset, target, onClose }) => {
  const chart = useChartTheme();
  const [state, setState] = useState({ status: "idle" });

  useEffect(() => {
    if (!dataset?.dataset_id || !target) return undefined;
    const controller = new AbortController();
    setState({ status: "loading" });
    fetchCellCyclePerturbation(dataset.dataset_id, target, { signal: controller.signal })
      .then((data) => !controller.signal.aborted && setState({ status: data ? "done" : "missing", data }))
      .catch((err) => !controller.signal.aborted && setState({ status: "error", error: err.message }));
    return () => controller.abort();
  }, [dataset?.dataset_id, target]);

  if (!target) return null;
  const drug = dataset?.kind === "drug";
  const row = state.data?.target;
  const v = verdict(row);
  const link = drug ? drugPagePath(target) : genePagePath(target);

  return (
    <section className={styles.card} data-testid="cc-detail" aria-label={`Cell-cycle detail of ${target}`}>
      <div className={styles.cardHead}>
        <div>
          <h3>
            {target}
            {row?.n_cells ? <span className={styles.muted}> · {row.n_cells.toLocaleString("en-US")} cells</span> : null}
          </h3>
          {v && <div className={`${styles.verdict} ${styles[`verdict_${v.tone}`] || ""}`}>{v.text}</div>}
        </div>
        <div className={styles.headActions}>
          <Link className={styles.action} to={link}>
            {drug ? "Drug page" : "Gene page"}
          </Link>
          {!drug && (
            <Link className={styles.action} to={`/cell-cycle?view=gene&gene=${encodeURIComponent(target)}`}>
              In all datasets
            </Link>
          )}
          {onClose && (
            <button type="button" className={styles.action} onClick={onClose} aria-label="Close the detail">
              ✕
            </button>
          )}
        </div>
      </div>
      {state.status === "loading" && <div className={styles.muted}>Loading…</div>}
      {state.status === "error" && <div className={styles.muted}>{state.error}</div>}
      {state.status === "missing" && <div className={styles.muted}>{target} is not in this dataset.</div>}
      {state.status === "done" && row && (
        <>
          {isNum(row.frac_g1) ? (
            <>
              <Chart option={compositionOption(row, chart.p)} height={130} testId="cc-composition" />
              <div className={styles.densityPair}>
                <Chart option={densityOption(state.data.density, "s", chart.p, "S-phase score")} height={170} />
                <Chart option={densityOption(state.data.density, "g2m", chart.p, "G2/M score")} height={170} />
              </div>
              <div className={styles.muted} style={{ marginTop: -4 }}>
                Coloured above the line: cells of {target}; grey below: control cells.
              </div>
            </>
          ) : (
            <p className={styles.muted}>No single-cell phase calls for this dataset.</p>
          )}
          <dl className={styles.stats}>
            {isNum(row.frac_g1) && (
              <>
                {PHASES.map(({ key, label }) => (
                  <div key={key}>
                    <dt>{label}</dt>
                    <dd>
                      {formatPercent(row[`frac_${key}`])} <span className={styles.muted}>vs {formatPercent(row[`exp_${key}`])}</span>{" "}
                      <Delta value={row[`delta_${key}`]} />
                    </dd>
                  </div>
                ))}
                <div>
                  <dt>Phase shares, FDR</dt>
                  <dd className={isNum(row.fdr_phase) && row.fdr_phase < FDR_CUTOFF ? styles.strong : ""}>
                    {formatFdr(row.fdr_phase)}
                  </dd>
                </div>
                <div>
                  <dt>Score shift (z)</dt>
                  <dd>
                    S {formatZ(row.z_s)} · G2/M {formatZ(row.z_g2m)}
                  </dd>
                </div>
              </>
            )}
            <div>
              <dt title="Mean z of the S / G2/M genes in the perturbation profile, as a robust z within the dataset">
                Profile signature
              </dt>
              <dd>
                S {formatZ(row.rz_s)} · G2/M {formatZ(row.rz_g2m)}
              </dd>
            </div>
          </dl>
        </>
      )}
    </section>
  );
};
