import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { TopBar as TopBarCmp } from "@oliasoft-open-source/react-ui-library";
import { FaHome } from "react-icons/fa";
import {
  FcMindMap,
  FcScatterPlot,
  FcGrid,
  FcLineChart,
  FcSerialTasks,
  FcAbout,
  FcSignature,
  FcElectricalSensor,
  FcWorkflow,
  FcTodoList,
} from "react-icons/fc";
import { ROUTES, isActiveTab } from "../../common/routes";
import { TabNames } from "./enums";
//import styles from "./top-bar.module.scss";
import styles from "./top-bar.module.scss";
import loadingicon from "../../common/loading.gif";
import heatmapicon from "../../common/images/heatmap.png";
import clusteringicon from "../../common/images/clustering.png";
//import generegicon from "../../common/images/generegulation.png";
const TopBar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { pathname } = location;
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
          style={{ width: 35, marginLeft: 15, marginRight: 15 }}
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
      icon: () => <FcMindMap size={"2em"} />,
      name: TabNames.GENE_REGULATION,
      toLink: ROUTES.GENE_REGULATION,
    },
    {
      icon: () => (
        <img
          src={heatmapicon}
          style={{ width: 33, marginLeft: 15, marginRight: 15 }}
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
      icon: () => <FcAbout size={"2em"} />,
      name: TabNames.ABOUT,
      toLink: ROUTES.ABOUTUS,
    },
  ];
  return (
    <div className={styles.topBar}>
      <TopBarCmp
        content={navLinks.map(({ icon, name, toLink }) => ({
          icon: icon(),
          label: name,
          onClick: () => navigate(toLink),
          type: "Link",
          active: isActiveTab(pathname, toLink),
        }))}
        title={{
          onClick: () => navigate(ROUTES.HOME),
          version: "V1.0.5",
          logo: <img alt="logo" src="/images/logo.png" />,
        }}
        contentRight={undefined}
      />
    </div>
  );
};

export { TopBar };
