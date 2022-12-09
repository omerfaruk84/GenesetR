import React from 'react';
import { HeatMap } from '../heat-map';
import { TopBar } from '../top-bar';
import ExampleJson from '../heat-map/example.json';
import styles from './main-view.module.scss';

const MainView = () => {
  return (
    <div className={styles.mainView}>
      <TopBar />
      <HeatMap data={ExampleJson} />
    </div>
  );
};

export { MainView };