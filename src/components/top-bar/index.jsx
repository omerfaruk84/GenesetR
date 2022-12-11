import React from 'react';
import { useNavigate, useLocation, } from 'react-router-dom';
import { TopBar as TopBarCmp } from '@oliasoft-open-source/react-ui-library';
import { FaRegCopy, FaHome } from 'react-icons/fa';
import { ROUTES, isActiveTab } from '../../common/routes';

const TopBar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { pathname } = location;
  const navLinks = [
    {
      icon: () => <FaHome />,
      name: 'Home',
      toLink: ROUTES.HOME
    },
    {
      icon: () => <FaRegCopy />,
      name: 'Correlation',
      toLink: ROUTES.CORRELATION
    },
    {
      icon: () => '🐙',
      name: 'PCA',
      toLink: ROUTES.PCA
    },
    {
      icon: () => '🐙',
      name: 'MDE',
      toLink: ROUTES.MDE
    },
    {
      icon: () => '🐙',
      name: 'UMAP',
      toLink: ROUTES.UMAP
    },
    {
      icon: () => '🐙',
      name: 'tSNE',
      toLink: ROUTES.TSNE
    },
    {
      icon: () => '🐙',
      name: 'Bi-Clustering',
      toLink: ROUTES.BI_CLUSTERING
    },
    {
      icon: () => '🐙',
      name: 'Gene-Regulation',
      toLink: ROUTES.GENE_REGULATION
    },
    {
      icon: () => '🗺️',
      name: 'HeatMap',
      toLink: ROUTES.HEATMAP
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
        version: 'V0.0.1'
      }}
    />
  );
};

export { TopBar };