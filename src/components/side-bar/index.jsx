import React, { useState } from 'react';
import { connect } from 'react-redux'; 
import { useLocation } from 'react-router-dom';
import { Drawer, Button, Spacer, Flex } from '@oliasoft-open-source/react-ui-library';
import { SettingsSelector } from './settings/settings-selector';
import { runCalculation } from '../../store/results/index';
import { ModulePathNames } from '../../store/results/enums';

const SideBar = ({ runCalculation, calcResults }) => {
  const [sideBarWith, setSideBarWith] = useState(420);
  const handleSideBarResize = (size) => {
    if (size > 500 || size < 250) {
      return;
    }
    setSideBarWith(size);
  };

  const location = useLocation();
  const { pathname } = location;
  const isCalcRunning = calcResults?.[ModulePathNames?.[pathname]]?.running;

  return (
    <Drawer
      border
      button
      closedWidth={10}
      open
      width={sideBarWith}
      onResize={handleSideBarResize}
    >
      <Spacer />
      <Flex justifyContent="center">
        <Button
          label={`${isCalcRunning ? "Pending" : "Run Calculation"}`}
          colored
          width="90%"
          disabled={isCalcRunning}
          onClick={() => runCalculation(pathname)}
        />
      </Flex>
      <Spacer />
      <SettingsSelector pathname={pathname} />
    </Drawer>
  );
};

const mapStateToProps = ({ calcResults }) => ({ calcResults });

const mapDispatchToProps = {
  runCalculation,
};

const MainContainer = connect(mapStateToProps, mapDispatchToProps)(SideBar);

export { MainContainer as SideBar };
