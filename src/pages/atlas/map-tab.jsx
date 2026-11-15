import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { fetchAtlasMap } from "../../store/api/atlas";
import { AXIS_TEXT, atlasPath, focusWindow, mapExtent, moduleColor, moduleSeries, pointIndex, symbolSuggestions } from "../../utils/atlas";
import { rgba } from "../../utils/chartStyle";
import { useChartTheme } from "../../utils/chartTheme";
import { AtlasMap } from "./atlas-map";
import { GenePanel } from "./gene-panel";
import { ModulePanel } from "./module-panel";
import { AxisToggle, Typeahead, plural } from "./parts";
import styles from "./atlas-page.module.scss";

const EXAMPLES = { pert: ["INTS15", "TMEM242", "FAM32A", "SCAP"], genes: ["HMGCS1", "IFIT1", "DDIT3", "HBG2"] };

/**
 * The map tab: one of the two maps, a search box that centres a gene, the
 * list of modules beside the map, and the panels of the chosen gene and
 * module below it. Map, gene and module are in the address.
 */
const MapTab = ({ query, summary }) => {
  const navigate = useNavigate();
  const { p } = useChartTheme();
  const { axis, gene, module: moduleId, neighbours } = query;
  const words = AXIS_TEXT[axis];

  const [loaded, setLoaded] = useState(null); // { axis, map } | { axis, error }
  const [typed, setTyped] = useState("");
  const [filter, setFilter] = useState("");
  const [view, setView] = useState(null); // { axis, window }
  // a gene chosen by clicking its point stays where it is; any other choice is centred
  const clicked = useRef("");

  useEffect(() => {
    let current = true;
    fetchAtlasMap(axis)
      .then((map) => {
        if (current) setLoaded({ axis, map });
      })
      .catch((error) => {
        if (current) setLoaded({ axis, error: error.message });
      });
    return () => {
      current = false;
    };
  }, [axis]);

  const map = loaded?.axis === axis ? loaded.map : null;
  const failed = loaded?.axis === axis ? loaded.error : "";
  const geneIndex = useMemo(() => (map ? pointIndex(map, gene) : -1), [map, gene]);

  useEffect(() => {
    if (!map || geneIndex < 0) return;
    if (clicked.current === gene) {
      clicked.current = "";
      return;
    }
    setView({ axis, window: focusWindow(map, [[map.x[geneIndex], map.y[geneIndex]]]) });
  }, [map, axis, gene, geneIndex]);

  const to = (changes) => atlasPath({ tab: "map", axis, gene, module: moduleId, neighbours, ...changes });

  const pick = (index) => {
    const symbol = String(map.symbols[index]).toUpperCase();
    clicked.current = symbol;
    navigate(to({ gene: symbol }));
  };

  const options = useMemo(
    () => symbolSuggestions(map?.symbols, typed).map((symbol) => ({ key: symbol, label: symbol, hint: "on this map" })),
    [map, typed]
  );

  const modules = useMemo(() => {
    const wanted = filter.trim().toLowerCase();
    return (map?.modules || []).filter((entry) => !wanted || entry.name.toLowerCase().includes(wanted));
  }, [map, filter]);

  const counts = summary?.maps?.[axis];
  const colors = moduleSeries(p.series);

  return (
    <>
      <p className={styles.explain} data-testid="atlas-explain">
        <strong>{words.map}.</strong> {words.about} Only genes with enough reproducible partners are on a map
        {counts ? `: ${counts.objects.toLocaleString("en-US")} genes in ${counts.modules} ${words.module}s, ${counts.named} of them named after an enriched gene set` : ""}
        . The position is a layout of the links between partners: neighbours on the map are similar, distances across
        the map mean little. Colours repeat over the {words.module}s.
      </p>
      <div className={styles.toolbar}>
        <AxisToggle axis={axis} to={(id) => atlasPath({ tab: "map", axis: id, gene, neighbours })} />
        <Typeahead
          label="Find a gene on the map"
          placeholder={`Find a gene, e.g. ${EXAMPLES[axis][0]}`}
          initialValue={gene}
          options={options}
          onText={setTyped}
          onChoose={(option) => navigate(to({ gene: option.label }))}
          onSubmit={(text) => navigate(to({ gene: text }))}
        />
        <button
          type="button"
          className={styles.action}
          disabled={!map}
          onClick={() => setView({ axis, window: mapExtent(map) })}
          title="Show the whole map again"
        >
          Whole map
        </button>
        {(gene || moduleId > 0) && (
          <Link className={styles.action} to={atlasPath({ tab: "map", axis })}>
            Clear selection
          </Link>
        )}
        {!gene && (
          <span className={styles.control}>
            Try:
            {EXAMPLES[axis].map((example) => (
              <Link key={example} className={styles.chip} to={to({ gene: example })}>
                {example}
              </Link>
            ))}
          </span>
        )}
      </div>

      {failed && (
        <div className={styles.status} role="alert">
          The map could not be loaded: {failed}
        </div>
      )}
      {!map && !failed && (
        <div className={styles.status} role="status">
          Loading the {words.map.toLowerCase()}…
        </div>
      )}

      {map && (
        <div className={styles.mapLayout}>
          <div className={styles.mapCard} data-testid="atlas-map">
            <AtlasMap
              key={axis}
              map={map}
              geneIndex={geneIndex}
              moduleId={moduleId}
              view={view?.axis === axis ? view.window : null}
              onPick={pick}
            />
            <div className={`${styles.muted} ${styles.mapNote}`}>
              {plural(map.symbols.length, "gene")}. Scroll to zoom, drag to move, click a point for the gene.
              {gene && geneIndex < 0 && (
                <span data-testid="atlas-not-on-map">
                  {" "}
                  <strong>{gene}</strong> is not on this map.
                </span>
              )}
            </div>
          </div>
          <aside className={styles.moduleList} aria-label={`${words.module}s of the map`}>
            <h3>
              {words.module === "module" ? "Modules" : "Programmes"} <span className={styles.count}>{map.modules.length}</span>
            </h3>
            <input
              className={styles.input}
              type="search"
              aria-label={`Filter the ${words.module}s by name`}
              placeholder="Filter by name"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
            />
            <ul className={styles.moduleScroll} data-testid="atlas-module-list">
              {modules.map((entry) => (
                <li key={entry.id}>
                  <Link
                    className={`${styles.moduleItem} ${entry.id === moduleId ? styles.moduleItemActive : ""}`}
                    aria-current={entry.id === moduleId ? "true" : undefined}
                    title={`${entry.name} (${plural(entry.size, "gene")})`}
                    to={to({ module: entry.id === moduleId ? 0 : entry.id })}
                  >
                    <span className={styles.dot} style={{ background: moduleColor(entry.id, colors, rgba(p.otherRgb, 1)) }} />
                    <span className={styles.moduleName}>{entry.name}</span>
                    <span className={styles.count}>{entry.size}</span>
                  </Link>
                </li>
              ))}
              {modules.length === 0 && <li className={styles.muted}>No {words.module} with that name.</li>}
            </ul>
          </aside>
        </div>
      )}

      {(gene || moduleId > 0) && (
        <div className={styles.pair}>
          {gene && <GenePanel symbol={gene} axis={axis} neighbours={neighbours} to={to} />}
          {moduleId > 0 && (
            <ModulePanel axis={axis} id={moduleId} geneTo={(symbol) => to({ gene: symbol })} closeTo={to({ module: 0 })} />
          )}
        </div>
      )}
    </>
  );
};

export { MapTab };
