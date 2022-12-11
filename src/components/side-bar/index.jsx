import React, { useState } from 'react';
import { Drawer } from '@oliasoft-open-source/react-ui-library';
import { SettingsSelector } from './settings/settings-selector';

const SideBar = () => {
  const [sideBarWith, setSideBarWith] = useState(420);
  const handleSideBarResize = (size) => {
    if (size > 420 || size < 300) {
      return;
    }
    setSideBarWith(size);
  }
  return (
    <Drawer
      border
      button
      closedWidth={10}
      open
      width={sideBarWith}
      onResize={handleSideBarResize}
    >
      <SettingsSelector />
    </Drawer>
  );
};

export { SideBar };
