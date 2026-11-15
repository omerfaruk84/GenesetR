import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { fetchAtlasModules } from "../../store/api/atlas";
import { AXIS_TEXT, atlasPath } from "../../utils/atlas";
import { shortSetName } from "../../utils/integrated";
import { ModulePanel } from "./module-panel";
import { AxisToggle, plural, useDebounced } from "./parts";
import styles from "./atlas-page.module.scss";

/**
 * The modules of one map as a searchable list; a module opens in the same
 * panel as on the map. Map, search text and module are in the address.
 */
const ModulesTab = ({ query }) => {
  const navigate = useNavigate();
  const { axis, q, module: moduleId } = query;
  const words = AXIS_TEXT[axis];
  const [text, setText] = useState(q);
  const [state, setState] = useState({ status: "loading" }); // loading | done | error
  const settled = useDebounced(text.trim());

  // the address follows the search box, and the box an address that was opened
  useEffect(() => setText(q), [q]);
  useEffect(() => {
    if (settled !== q && settled === text.trim()) navigate(atlasPath({ tab: "modules", axis, q: settled, module: moduleId }), { replace: true });
    // only when the typed text has settled
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settled]);

  useEffect(() => {
    const controller = new AbortController();
    setState((previous) => ({ ...previous, status: "loading" }));
    fetchAtlasModules(axis, { q, limit: 200, signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted) setState({ status: "done", data });
      })
      .catch((error) => {
        if (!controller.signal.aborted) setState({ status: "error", message: error?.message || "The modules could not be loaded" });
      });
    return () => controller.abort();
  }, [axis, q]);

  const modules = state.data?.modules || [];
  const to = (changes) => atlasPath({ tab: "modules", axis, q, module: moduleId, ...changes });

  return (
    <>
      <p className={styles.explain}>
        A {words.module} is a group of genes on the {words.map.toLowerCase()} that are linked to each other more than to
        the rest. {words.about} It is named after its most significant enriched gene set, or after its three most
        central members when no set is enriched. The borders depend on the resolution of the clustering: neighbouring
        pathways can share a {words.module} or be split.
      </p>
      <div className={styles.toolbar}>
        <AxisToggle axis={axis} to={(id) => atlasPath({ tab: "modules", axis: id, q })} />
        <input
          className={styles.input}
          type="search"
          aria-label={`Search the ${words.module}s`}
          placeholder="Name, enriched gene set or member gene"
          value={text}
          onChange={(event) => setText(event.target.value)}
        />
        <span className={styles.muted} role="status" data-testid="atlas-modules-count">
          {state.status === "loading" && !state.data ? "Loading…" : `${plural(state.data?.total ?? modules.length, words.module)}${q ? ` for “${q}”` : ""}`}
        </span>
      </div>
      {state.status === "error" && (
        <div className={styles.status} role="alert">
          {state.message}
        </div>
      )}
      <div className={styles.modulesLayout}>
        <ul className={styles.moduleCards} data-testid="atlas-modules">
          {modules.map((entry) => {
            const terms = (entry.terms || []).map((term) => shortSetName(term.set));
            return (
              <li key={entry.id}>
                <Link
                  className={`${styles.moduleCard} ${entry.id === moduleId ? styles.moduleCardActive : ""}`}
                  aria-current={entry.id === moduleId ? "true" : undefined}
                  to={to({ module: entry.id })}
                >
                  <div className={styles.moduleCardHead}>
                    <span>{entry.name}</span>
                    <span className={styles.count}>{plural(entry.size, "gene")}</span>
                  </div>
                  {terms.length > 0 && (
                    <div className={styles.moduleCardLine} title={terms.join("; ")}>
                      {terms.join(" · ")}
                    </div>
                  )}
                  <div className={styles.moduleCardLine} title={(entry.members || []).join(", ")}>
                    {(entry.members || []).join(", ")}
                    {entry.size > (entry.members || []).length ? ", …" : ""}
                  </div>
                </Link>
              </li>
            );
          })}
          {state.status === "done" && modules.length === 0 && (
            <li className={styles.moduleCard}>
              <span className={styles.muted}>No {words.module} matches “{q}”.</span>
            </li>
          )}
        </ul>
        {moduleId > 0 ? (
          <ModulePanel
            axis={axis}
            id={moduleId}
            geneTo={(symbol) => atlasPath({ tab: "map", axis, gene: symbol, module: moduleId })}
            mapTo={atlasPath({ tab: "map", axis, module: moduleId })}
            closeTo={to({ module: 0 })}
          />
        ) : (
          <div className={styles.placeholder}>
            <h2>Choose a {words.module}</h2>
            <p className={styles.muted}>
              You get its enriched gene sets, all members (those without a GO term and those with a placeholder name are
              marked), and {axis === "pert" ? "the genes that change when the members are knocked down" : "the knock-downs that raise or lower the programme"}.
            </p>
          </div>
        )}
      </div>
    </>
  );
};

export { ModulesTab };
