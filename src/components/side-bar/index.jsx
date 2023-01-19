import React, { useState } from 'react';
import { connect } from 'react-redux'; 
import { useLocation } from 'react-router-dom';
import { Drawer, Button, Spacer, Flex } from '@oliasoft-open-source/react-ui-library';
import { SettingsSelector } from './settings/settings-selector';
import { runCalculation } from '../../store/results/index';

const SideBar = ({
  runCalculation,
}) => {
  const [sideBarWith, setSideBarWith] = useState(420);
  const handleSideBarResize = (size) => {
    if (size > 500 || size < 250) {
      return;
    }
    setSideBarWith(size);
  }

  const location = useLocation();
  const { pathname } = location;

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
      <Flex justifyContent='center'>
        <Button
          label="Run calculation"
          colored
          width="90%"
          onClick={() => runCalculation(pathname)}
        />
      </Flex>
      <SettingsSelector pathname={pathname} />
    </Drawer>
  );
};

const mapDispatchToProps = {
  runCalculation,
};

const MainContainer = connect(null, mapDispatchToProps)(SideBar);

export { MainContainer as SideBar };
