import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { fetchAtlasSummary } from "../../store/api/atlas";
import { atlasPath, readAtlasQuery } from "../../utils/atlas";
import { MapTab } from "./map-tab";
import { ModulesTab } from "./modules-tab";
import { PathwaysTab } from "./pathways-tab";
import { PredictionsTab } from "./predictions-tab";
import styles from "./atlas-page.module.scss";

const TABS = [
  { id: "map", label: "Map", about: "Genes placed by what their knock-down does, or by how they are regulated" },
  { id: "modules", label: "Modules", about: "Groups of genes on a map, with their enriched gene sets and consequences" },
  { id: "predictions", label: "Predicted functions", about: "What a gene probably does, from its partners, with a measured confidence" },
  { id: "pathways", label: "Pathways", about: "Knock-downs that raise or lower a gene set, and the gene sets a knock-down moves" },
];

/**
 * "Function atlas": what a gene does, for all genes at once, from the
 * integrated knock-down datasets. The tab and everything chosen in it are in
 * the address, so every view can be linked.
 */
const AtlasPage = () => {
  const location = useLocation();
  const query = useMemo(() => readAtlasQuery(location.search), [location.search]);
  const [summary, setSummary] = useState(null);
  // The last address of each tab, so that switching back returns to its state
  const lastAddress = useRef({});
  lastAddress.current[query.tab] = `${location.pathname}${location.search}`;

  useEffect(() => {
    document.title = "Function atlas – GeneSetR";
    let current = true;
    fetchAtlasSummary().then((data) => {
      if (current) setSummary(data);
    });
    return () => {
      current = false;
      document.title = "GeneSetR";
    };
  }, []);

  const shared = { query, summary };

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <h1>Function atlas</h1>
        <p className={styles.lead}>
          What a gene does, read from all knock-down datasets at once. Genes are placed on two maps, by what their
          knock-down does and by how they are regulated; the modules of the maps, the predicted functions and the
          pathway activity are derived from them.
        </p>
        <div className={styles.tabs} role="tablist" aria-label="Part of the atlas">
          {TABS.map((tab) => (
            <Link
              key={tab.id}
              role="tab"
              aria-selected={query.tab === tab.id}
              className={query.tab === tab.id ? styles.chipActive : styles.chip}
              title={tab.about}
              to={lastAddress.current[tab.id] || atlasPath({ tab: tab.id })}
            >
              {tab.label}
            </Link>
          ))}
        </div>
        {query.tab === "map" && <MapTab {...shared} />}
        {query.tab === "modules" && <ModulesTab {...shared} />}
        {query.tab === "predictions" && <PredictionsTab {...shared} />}
        {query.tab === "pathways" && <PathwaysTab {...shared} />}
      </div>
    </div>
  );
};

export { AtlasPage };
