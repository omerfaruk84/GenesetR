import React from "react";
import { connect } from "react-redux";
import {
  Field,
  Select,
  Slider,
  Toggle,
} from "@oliasoft-open-source/react-ui-library";
import { scatterplotSettingsChanged } from "../../../store/settings/scatterplot-settings";
import { ScatterPlotSettingsTypes } from "./enums";
import styles from "./settings.module.scss";

const ScatterPlotSettings = ({
  scatterplotSettings,
  scatterplotSettingsChanged,
  module,
  SettingsSelector,
}) => {
  const layoutOption = [
    {
      label: "Force",
      value: "force",
    },
    {
      label: "Circular",
      value: "circular",
    },
  ];
  const dataTypeOptions = [
    {
      label: "Perturbation",
      value: 1,
    },
    {
      label: "Gene Expression",
      value: 2,
    },
    {
      label: "Perturbation Correlation",
      value: 3,
    },
    {
      label: "Expression Correlation",
      value: 4,
    },
  ];
  const graphTypeOptions = [
    {
      label: "2D",
      value: "2D",
    },
    {
      label: "3D",
      value: "3D",
    },
  ];

  //var currGraph = useLocation().pathname;

  return (<></>);
  // PLEASE FIX ScatterPlotSettingsTypes THOSE PROPERTIES ARE NOT FOUND
    <>
      <Field
        label="Repulsion"
        labelLeft
        labelWidth="130px"
        helpText="Repulsion is what"
      >
        <div className={styles.inputRange}>
          <Slider
            label={scatterplotSettings?.repulsion}
            max={1000}
            min={50}
            value={scatterplotSettings?.repulsion}
            onChange={({ target: { value } }) =>
              scatterplotSettingsChanged({
                settingName: ScatterPlotSettingsTypes.REPULSION,
                newValue: value,
              })
            }
          />
        </div>
      </Field>

      <Field
        label="Layout"
        labelLeft
        labelWidth="130px"
        helpText="Repulsion is what"
      >
        <Select
          onChange={({ target: { value } }) =>
            scatterplotSettingsChanged({
              settingName: ScatterPlotSettingsTypes.LAYOUT,
              newValue: value,
            })
          }
          options={layoutOption}
          value={scatterplotSettings?.layout}
        />
      </Field>

      <Field
        label="Isolated nodes"
        labelLeft
        labelWidth="130px"
        helpText="Repulsion is what"
      >
        <Toggle
          label="Show"
          onChange={({ target: { checked } }) =>
            scatterplotSettingsChanged({
              settingName: ScatterPlotSettingsTypes.ISOLATED_NODES,
              newValue: checked,
            })
          }
          checked={scatterplotSettings?.isolatednodes}
        />
      </Field>

      <Field
        label="Data Type"
        labelLeft
        labelWidth="130px"
        helpText="Repulsion is what"
      >
        <Select
          onChange={({ target: { value } }) =>
            scatterplotSettingsChanged({
              settingName: ScatterPlotSettingsTypes.DATA_TYPE,
              newValue: value,
            })
          }
          options={dataTypeOptions}
          value={scatterplotSettings?.dataType}
        />
      </Field>
    </>
  // );
};

const mapStateToProps = ({ settings, calcResults, coreSettings }) => ({
  scatterplotSettings: settings?.scatterplot ?? {},
  coreSettings: settings?.core ?? {},
});

const mapDispatchToProps = {
  scatterplotSettingsChanged,
};

const MainContainer = connect(
  mapStateToProps,
  mapDispatchToProps
)(ScatterPlotSettings);

export { MainContainer as ScatterPlotSettings };
