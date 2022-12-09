import React from 'react';
import { FaHome } from 'react-icons/fa';
import styles from './top-bar.module.scss';

const TopBar = () => {
  const navLinks = [
    {
      icon: () => <FaHome />,
      name: 'Home',
      active: true,
    },
    {
      icon: () => '🐙',
      name: 'GeneRegulation',
      active: false,
    },
    {
      icon: () => '🐙',
      name: 'PCA',
      active: false,
    },
    {
      icon: () => '🐙',
      name: 'MDE',
      active: false,
    },
    {
      icon: () => '🐙',
      name: 'UMAP',
      active: false,
    },
    {
      icon: () => '🐙',
      name: 'tSNE',
      active: false,
    },
    {
      icon: () => '🐙',
      name: 'Bi-Clustering',
      active: false,
    },
    {
      icon: () => '🐙',
      name: 'Gene-Regulation',
      active: false,
    },
    {
      icon: () => '🐙',
      name: 'HeatMap',
      active: false,
    },
  ]
  return (
    <div className={styles.topBar}>
      <ul>
        {navLinks.map(({icon, name, active}) => (
          <li className={active && styles.active}>
            <span>{icon()}</span>
            {name}
          </li>
        ))}
      </ul>
    </div>
  );
};

export { TopBar };