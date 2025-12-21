import React, { useState } from "react";
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
      icon: () => <FcClock size={"2em"} />,
      name: TabNames.CELL_CYCLE,
      toLink: ROUTES.CELL_CYCLE,
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
      icon: () => <FcTodoList size={"2em"} />,
      name: TabNames.GENELISTCOMPARE,
      toLink: ROUTES.GENELISTCOMPARE,
    },
    {
      icon: () => <FcElectricalSensor size={"2em"} />,
      name: TabNames.GENESIGNATURE,
      toLink: ROUTES.GENESIGNATURE,
    },
    {
      icon: () => <FcElectricalSensor size={"2em"} style={{ filter: "hue-rotate(180deg)" }} />,
      name: TabNames.DEREGULATED_GENES,
      toLink: ROUTES.DEREGULATED_GENES,
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

  // Drawer nav for mobile
  const handleNavClick = (toLink) => {
    setMenuOpen(false);
    navigate(toLink);
  };

  return (
    <div className={styles.topBar}>
      {/* Hamburger icon for mobile */}
      <button
        className={styles.hamburger}
        aria-label="Open menu"
        onClick={() => setMenuOpen(true)}
      >
        <FaBars size={28} />
      </button>
      {/* Regular nav for desktop/tablet */}
      <TopBarCmp
        height={60}
        content={navLinks.map(({ icon, name, toLink }) => ({
          icon: icon(),
          label: name,
          onClick: () => navigate(toLink),
          type: "Link",
          active: isActiveTab(pathname, toLink),
        }))}
        title={{
          onClick: () => navigate(ROUTES.HOME),
          version: "V1.6.5",
          logo: <img alt="logo" src="/images/logo.png" />,
        }}
        contentRight={undefined}
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
            {navLinks.map(({ icon, name, toLink }) => (
              <button
                key={name}
                className={styles.drawerNavLink}
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
