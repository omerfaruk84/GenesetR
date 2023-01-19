import React from 'react';
import { useNavigate, useLocation, } from 'react-router-dom';
import { TopBar as TopBarCmp } from '@oliasoft-open-source/react-ui-library';
import { FaRegCopy, FaHome } from 'react-icons/fa';
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
      icon: () => <FaRegCopy />,
      name: TabNames.CORRELATION,
      toLink: ROUTES.CORRELATION
    },
    {
      icon: () => '🐙',
      name: TabNames.PCA,
      toLink: ROUTES.PCA
    },
    {
      icon: () => '🐙',
      name: TabNames.MDE,
      toLink: ROUTES.MDE
    },
    {
      icon: () => '🐙',
      name: TabNames.UMAP,
      toLink: ROUTES.UMAP
    },
    {
      icon: () => '🐙',
      name: TabNames.TSNE,
      toLink: ROUTES.TSNE
    },
    {
      icon: () => '🐙',
      name: TabNames.BI_CLUSTERING,
      toLink: ROUTES.BI_CLUSTERING
    },
    {
      icon: () => '🐙',
      name: TabNames.GENE_REGULATION,
      toLink: ROUTES.GENE_REGULATION
    },
    {
      icon: () => '🗺️',
      name: TabNames.HEATMAP,
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
        version: 'V0.1.0'
      }}
    />
  );
};

export { TopBar };