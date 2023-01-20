import React from 'react';
import { useNavigate, useLocation, } from 'react-router-dom';
import { TopBar as TopBarCmp } from '@oliasoft-open-source/react-ui-library';
import { FaHome } from 'react-icons/fa';
import { FcMindMap, FcScatterPlot, FcGrid, FcGenealogy, FcLineChart, FcSerialTasks } from "react-icons/fc";
import { ROUTES, isActiveTab } from '../../common/routes';
import { TabNames } from './enums';

const TopBar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { pathname } = location;
  const navLinks = [
    {
      icon: () => <FaHome />,
      name: TabNames.HOME,
      toLink: ROUTES.HOME
    },
    { 
      icon: () => <FcLineChart />,     
      name: TabNames.CORRELATION,
      toLink: ROUTES.CORRELATION
    },
    { 
      icon: () => <FcScatterPlot />,   
      name: TabNames.PCA,
      toLink: ROUTES.PCA
    },
    { 
      icon: () => <FcScatterPlot />,  
      name: TabNames.MDE,
      toLink: ROUTES.MDE
    },
    { 
      icon: () => <FcScatterPlot />,  
      name: TabNames.UMAP,
      toLink: ROUTES.UMAP
    },
    { 
      icon: () => <FcScatterPlot /> ,   
      name: TabNames.TSNE,
      toLink: ROUTES.TSNE
    },
    { 
      icon: () => <FcGenealogy />,
      name: TabNames.BI_CLUSTERING,
      toLink: ROUTES.BI_CLUSTERING
    },
    { 
      icon: () =><FcSerialTasks /> ,   
      name: TabNames.GENE_REGULATION,
      toLink: ROUTES.GENE_REGULATION
    },
    {  
      icon: () =><FcGrid />,
      name: TabNames.HEATMAP,
      toLink: ROUTES.HEATMAP
    },
    {
      icon: () => <FcMindMap />,
      name: TabNames.PATHWAY,
      toLink: ROUTES.PATHWAY
    },
  ]
  return (
    <TopBarCmp
      content={
        navLinks.map(({ icon, name, toLink }) => ({
          icon: icon(),
          label: name,
          onClick: () => navigate(toLink),
          type: 'Link',
          active: isActiveTab(pathname, toLink),
        }))
      }
      title={{
        label: 'Perturb-Seq Analyzer',
        onClick: () => navigate(ROUTES.HOME),
        version: 'V0.0.2'
      }}
    />
  );
};

export { TopBar };