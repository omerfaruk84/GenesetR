import React from 'react';
import { TopBar } from '../top-bar';
import styles from './main-view.module.scss';

const MainView = () => {
  return (
    <div className={styles.mainView}>
      <TopBar />
    </div>
  );
};

export { MainView };