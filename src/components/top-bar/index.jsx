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
  FcWorkflow,
} from "react-icons/fc";
import { ROUTES, isActiveTab } from "../../common/routes";
import { TabNames } from "./enums";
//import styles from "./top-bar.module.scss";
import styles from "./top-bar.module.scss";

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
      icon: () => <FcLineChart size={"2em"} />,
      name: TabNames.CORRELATION,
      toLink: ROUTES.CORRELATION,
    },
    {
      icon: () => <FcScatterPlot size={"2em"} />,
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
      name: TabNames.GENE_REGULATION,
      toLink: ROUTES.GENE_REGULATION,
    },
    {
      icon: () => <FcGrid size={"2em"} />,
      name: TabNames.HEATMAP,
      toLink: ROUTES.HEATMAP,
    },
    {
      icon: () => <FcMindMap size={"2em"} />,
      name: TabNames.PATHFINDER,
      toLink: ROUTES.PATHFINDER,
    },
    {
      icon: () => <FcMindMap size={"2em"} />,
      name: TabNames.GENELISTCOMPARE,
      toLink: ROUTES.GENELISTCOMPARE,
    },
    {
      icon: () => <FcSignature size={"2em"} />,
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
