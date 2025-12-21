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

  const navLinks = [
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
  ];

  const visibleCount = useMemo(() => {
    const w = viewportWidth;
    if (w <= 600) return 0;
    if (w <= 760) return 4;
    if (w <= 900) return 6;
    if (w <= 1100) return 9;
    if (w <= 1280) return 12;
    return navLinks.length;
  }, [viewportWidth, navLinks.length]);

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
