import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { TopBar as TopBarCmp } from "@oliasoft-open-source/react-ui-library";
import { FaHome, FaBars, FaTimes, FaCloudUploadAlt } from "react-icons/fa";
import {
  FcMindMap,
  FcScatterPlot,
  FcSerialTasks,
  FcAbout,
  FcElectricalSensor,
  FcWorkflow,
  FcTodoList,
  FcClock,
} from "react-icons/fc";
import { ROUTES, isActiveTab } from "../../common/routes";
import { TabNames } from "./enums";
//import styles from "./top-bar.module.scss";
import styles from "./top-bar.module.scss";
import heatmapicon from "../../common/images/heatmap.png";
import clusteringicon from "../../common/images/clustering.png";
//import generegicon from "../../common/images/generegulation.png";
// Keep in sync with .topBar max-width in top-bar.module.scss
const MAX_BAR_WIDTH = 1760;

// Approximate rendered width of a nav link whose label may wrap onto two lines.
const estimateLinkWidth = (label) => {
  const text = String(label || "");
  const longestWord = text.split(/\s+/).reduce((m, word) => Math.max(m, word.length), 0);
  const chars = Math.max(longestWord, Math.ceil(text.length / 2));
  return Math.max(58, Math.round(chars * 6.6 + 24));
};

const TopBar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { pathname } = location;
  const [menuOpen, setMenuOpen] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1200
  );

  useEffect(() => {
    const onResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const navLinks = useMemo(() => [
    {
      icon: () => <FaHome size={"2em"} />,
      name: TabNames.HOME,
      toLink: ROUTES.HOME,
    },
    {
      icon: () => <FcScatterPlot size={"2em"} />,
      name: TabNames.CORRELATION,
      toLink: ROUTES.CORRELATION,
    },      
    {
      icon: () => <FcScatterPlot size={"2em"} />,
      name: TabNames.CORRELATION_WEBGL,
      toLink: ROUTES.CORRELATION_WEBGL,
    },
    {
      icon: () => <FcElectricalSensor size={"2em"} />,
      name: TabNames.GENESIGNATURE,
      toLink: ROUTES.GENESIGNATURE,
    },
    {
      icon: () => (
        <img
          src={clusteringicon}
          style={{ width: 28 }}
          alt="Dimensionality Reduction and Clustering"
        />
      ),
      name: TabNames.DR,
      toLink: ROUTES.DR,
    },
    {
      icon: () => <FcWorkflow size={"2em"} />,
      name: TabNames.EXPRESSIONANALYZER,
      toLink: ROUTES.EXPRESSIONANALYZER,
    },
    
    {
      icon: () => <FcSerialTasks size={"2em"} />,
      name: TabNames.MULTIDATASET_COMPARISON,
      toLink: ROUTES.MULTIDATASET_COMPARISON,
    },
    {
      icon: () => <FcMindMap size={"2em"} />,
      name: TabNames.GENE_REGULATION,
      toLink: ROUTES.GENE_REGULATION,
    },
    {
      icon: () => <FcMindMap size={"2em"} style={{ filter: "hue-rotate(120deg)" }} />,
      name: TabNames.GENE_REGULATION_ENHANCED,
      toLink: ROUTES.GENE_REGULATION_ENHANCED,
    },
    {
      icon: () => (
        <img
          src={heatmapicon}
          style={{ width: 28 }}
          alt="Heatmap"
        />
      ),
      name: TabNames.HEATMAP,
      toLink: ROUTES.HEATMAP,
    },
    {
      icon: () => <FcSerialTasks size={"2em"} />,
      name: TabNames.PATHFINDER,
      toLink: ROUTES.PATHFINDER,
    },
  
    {
      icon: () => <FcClock size={"2em"} />,
      name: TabNames.CELL_CYCLE,
      toLink: ROUTES.CELL_CYCLE,
    },
    {
      icon: () => <FcElectricalSensor size={"2em"} style={{ filter: "hue-rotate(180deg)" }} />,
      name: TabNames.DEREGULATED_GENES,
      toLink: ROUTES.DEREGULATED_GENES,
    },
    {
      icon: () => <FcTodoList size={"2em"} />,
      name: TabNames.GENELISTCOMPARE,
      toLink: ROUTES.GENELISTCOMPARE,
    },
    {
      icon: () => <FaCloudUploadAlt size={"2em"} color="#1976d2" />,
      name: TabNames.UPLOAD_DATASET,
      toLink: ROUTES.UPLOAD_DATASET,
    },
    {
      icon: () => <FcAbout size={"2em"} />,
      name: TabNames.ABOUT,
      toLink: ROUTES.ABOUTUS,
    },
  ], []);

  // How many links fit: estimate each link's width from its label (labels wrap
  // onto two lines at spaces, see top-bar.module.scss) and show as many as fit
  // next to the logo; the rest go into the "More" menu. Fixed breakpoints used
  // to clip labels ("Ho", "Corre", ...) on ordinary desktop widths.
  const visibleCount = useMemo(() => {
    const w = viewportWidth;
    if (w <= 600) return 0;
    const LOGO_AND_MARGINS = 230;
    const MORE_BUTTON = 70;
    const available = Math.min(w, MAX_BAR_WIDTH) - LOGO_AND_MARGINS;
    const widths = navLinks.map((l) => estimateLinkWidth(l.name));
    const total = widths.reduce((a, b) => a + b, 0);
    if (total <= available) return navLinks.length;
    let used = MORE_BUTTON;
    let count = 0;
    for (const width of widths) {
      if (used + width > available) break;
      used += width;
      count += 1;
    }
    return count;
  }, [viewportWidth, navLinks]);

  const visibleNavLinks = useMemo(
    () => navLinks.slice(0, Math.min(navLinks.length, visibleCount)),
    [navLinks, visibleCount]
  );

  const overflowNavLinks = useMemo(
    () => navLinks.slice(Math.min(navLinks.length, visibleCount)),
    [navLinks, visibleCount]
  );

  const drawerLinks = useMemo(() => {
    if (viewportWidth <= 600) return navLinks;
    return overflowNavLinks;
  }, [navLinks, overflowNavLinks, viewportWidth]);

  const overflowActive = useMemo(
    () => overflowNavLinks.some((l) => isActiveTab(pathname, l.toLink)),
    [overflowNavLinks, pathname]
  );

  // Drawer nav for mobile
  const handleNavClick = (toLink) => {
    setMenuOpen(false);
    navigate(toLink);
  };

  return (
    <div className={styles.topBar}>
      <div className={styles.barInner}>
        <TopBarCmp
          height={60}
          content={visibleNavLinks.map(({ icon, name, toLink }) => ({
            icon: icon(),
            label: name,
            onClick: () => navigate(toLink),
            type: "Link",
            active: isActiveTab(pathname, toLink),
          }))}
          title={{
            onClick: () => navigate(ROUTES.HOME),
            version: "V2.0.0",
            logo: <img alt="logo" src="/images/logo.png" />,
          }}
          contentRight={
            drawerLinks.length > 0
              ? [
                  {
                    icon: <FaBars size={22} />,
                    label: viewportWidth <= 600 ? "Menu" : "More",
                    onClick: () => setMenuOpen(true),
                    type: "Link",
                    active: overflowActive || menuOpen,
                  },
                ]
              : undefined
          }
        />
      </div>
      {/* Drawer overlay and menu */}
      {menuOpen && (
        <div className={styles.drawerOverlay} onClick={() => setMenuOpen(false)}>
          <nav
            className={styles.drawer}
            onClick={(e) => e.stopPropagation()}
            aria-label="Mobile navigation"
          >
            <button
              className={styles.drawerClose}
              aria-label="Close menu"
              onClick={() => setMenuOpen(false)}
            >
              <FaTimes />
            </button>
            {drawerLinks.map(({ icon, name, toLink }) => (
              <button
                key={name}
                className={`${styles.drawerNavLink} ${
                  isActiveTab(pathname, toLink) ? styles.drawerNavLinkActive : ""
                }`}
                onClick={() => handleNavClick(toLink)}
              >
                {icon()} <span style={{ marginLeft: 12 }}>{name}</span>
              </button>
            ))}
          </nav>
        </div>
      )}
    </div>
  );
};

export { TopBar };
