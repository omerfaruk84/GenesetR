import React from 'react';
import { FaHome } from 'react-icons/fa';
import { Link, useLocation } from 'react-router-dom';
import { ROUTES, isActiveTab } from '../../common/routes';
import styles from './top-bar.module.scss';

const TopBar = () => {
  const location = useLocation();
  const { pathname } = location;
  const navLinks = [
    {
      icon: () => <FaHome />,
      name: 'Home',
      toLink: ROUTES.HOME
    },
    {
      icon: () => '🐙',
      name: 'GeneRegulation',
      toLink: ROUTES.GENEREGULATION
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
      icon: () => '🐙',
      name: 'HeatMap',
      toLink: ROUTES.HEATMAP
    },
  ]
  return (
    <div className={styles.topBar}>
      <ul>
        {navLinks.map(({ icon, name, toLink }, key) => (
          <li key={key}>
            <Link
              className={isActiveTab(pathname, toLink) ? styles.active : ''}
              to={toLink}
            >
              <span>{icon()}</span>
              {name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
};

export { TopBar };