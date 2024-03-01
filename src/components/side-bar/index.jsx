import React, { useState } from "react";
import { connect } from "react-redux";
import { useLocation } from "react-router-dom";
import {
  Drawer,
  Button,
  Spacer,
  Flex,
} from "@oliasoft-open-source/react-ui-library";
import { SettingsSelector } from "./settings/settings-selector";
import { runCalculation } from "../../store/results/index";
import { ModulePathNames } from "../../store/results/enums";
import { ROUTES } from "../../common/routes";
import { coreSettingsChanged } from "../../store/settings/core-settings";
import { CoreSettingsTypes } from "./settings/enums";
const SideBar = ({
  runCalculation,
  calcResults,
  coreSettings,
  coreSettingsChanged,
}) => {
  const [sideBarWith, setSideBarWith] = useState(350);
  const handleSideBarResize = (size) => {
    if (size > 500 || size < 250) {
      return;
    }
    setSideBarWith(size);
  };

  const location = useLocation();
  const { pathname } = location;
  var isCalcRunning = false;

  //We need this as we have multiple DR algorithms under DR tab
  if (pathname === ROUTES.DR) {
    isCalcRunning =
      calcResults?.[ModulePathNames?.["/" + coreSettings.currentModule]]
        ?.running;
  } else {
    isCalcRunning = calcResults?.[ModulePathNames?.[pathname]]?.running;
  }

  //To set runcalc button disabled or not
  let isDisabled = true;
  if (
    (pathname === ROUTES.CORRELATION &&
      coreSettings.peturbationList?.trim().split("\n").length > 1) ||
    (pathname === ROUTES.DR &&
      coreSettings.peturbationList?.trim().split("\n").length > 9) ||
    pathname === ROUTES.GENE_REGULATION ||
    (pathname === ROUTES.HEATMAP &&
      (coreSettings.peturbationList?.trim().split("\n").length > 2 ||
        coreSettings.targetGeneList?.trim().split("\n").length > 2)) ||
    (pathname === ROUTES.PATHFINDER &&
      coreSettings.peturbationList?.trim().split("\n").length > 1) ||
    (pathname === ROUTES.GENESIGNATURE &&
      coreSettings.targetGeneList?.length > 1) ||
    pathname === ROUTES.EXPRESSIONANALYZER ||
    pathname === ROUTES.GENELISTCOMPARE
  )
    isDisabled = false;

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
          disabled={isCalcRunning || isDisabled}
          onClick={() => {
            runCalculation(pathname);
            coreSettingsChanged({
              settingName: CoreSettingsTypes.SHOW_HELP,
              newValue: false,
            });
          }}
        />
      </Flex>
      <Spacer />
      {pathname === ROUTES.DR ? (
        <SettingsSelector pathname={"/" + coreSettings.currentModule} />
      ) : (
        <SettingsSelector pathname={pathname} />
      )}
    </Drawer>
  );
};

const mapStateToProps = ({ calcResults, settings }) => ({
  calcResults,
  coreSettings: settings?.core ?? {},
});

const mapDispatchToProps = {
  runCalculation,
  coreSettingsChanged,
};

const MainContainer = connect(mapStateToProps, mapDispatchToProps)(SideBar);

export { MainContainer as SideBar };
