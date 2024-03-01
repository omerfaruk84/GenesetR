import React, { useState, useEffect } from "react";
import { updateGeneLists } from "../../../store/api";
import { connect } from "react-redux";
import {
  Field,
  Slider,
  CheckBox,
  Select,
  TextArea,
} from "@oliasoft-open-source/react-ui-library";
import { expressionanalyzerSettingsChanged } from "../../../store/settings/expression-analyzer-settings";
import { get } from "idb-keyval";
import { ExpressionAnalyzerSettingsTypes } from "./enums";
import styles from "./settings.module.scss";
import { runCalculation } from "../../../store/results";
import { useLocation } from "react-router-dom";
import { coreSettingsChanged } from "../../../store/settings/core-settings";
import { CoreSettingsTypes } from "./enums";

const ExpressionAnalyzerSettings = ({
  runCalculation,
  expressionanalyzerSettings,
  expressionanalyzerSettingsChanged,
  coreSettings,
  coreSettingsChanged,
}) => {
  const [geneOptions, setGeneOptions] = useState([]);
  const corrtypeOptions = [
    {
      label: "Pearson",
      value: "pearson",
    },
    {
      label: "Spearman",
      value: "spearman",
    },
    {
      label: "Kendall",
      value: "kendall",
    },
  ];
  const location = useLocation();
  const { pathname } = location;
  useEffect(() => {
    async function fetchDataAndPopulate() {
      let check = new Set();
      let cellline = coreSettings.cellLine[0];

      try {
        await updateGeneLists(cellline);

        const perturbVal = await get("geneList_" + cellline + "_perturb");
        console.log("perturbVal", perturbVal);
        addToCheckSet(perturbVal, check);

        const genesVal = await get("geneList_" + cellline + "_genes");
        addToCheckSet(genesVal, check);

        check.delete(""); // Remove any empty values

        // Convert the set to array, filter, and map.
        let temp = Array.from(check)
          .filter((val) => !val.startsWith("non-"))
          .map((val) => ({ label: val, value: val }));

        // Now that all asynchronous operations are done, sort and set gene options.
        setGeneOptions(temp.sort((a, b) => a.label.localeCompare(b.label)));
      } catch (error) {
        console.error("Error populating gene options:", error);
      }
    }

    const addToCheckSet = (val, checkSet) => {
      if (val && val.size > 0) {
        for (let item of val) {
          checkSet.add(item.split("_")[0]);
        }
      }
    };

    fetchDataAndPopulate();
  }, [coreSettings.cellLine]);
  return (
    <>
      <Field label="Select a gene">
        <Select
          onChange={({ target: { value } }) => {
            expressionanalyzerSettingsChanged({
              settingName: ExpressionAnalyzerSettingsTypes.SELECTED_GENE,
              newValue: value,
            });
            coreSettingsChanged({
              settingName: CoreSettingsTypes.SHOW_HELP,
              newValue: false,
            });
            runCalculation(pathname);
          }}
          options={geneOptions}
          value={expressionanalyzerSettings?.selectedGene}
        />
      </Field>
      <Field
        label="Correlation Algorithm"
        labelLeft
        labelWidth={150}
        helpText="Set the correlation algorithm. Note that Pearson measures a linear relationship between two variables, while Kendall and Spearman measure how likely it is for two variables to move in the same direction, but not necessarily at a constant rate. Pearson provides information about the strength and direction of the linear relationship between two variables but is sensitive to outliers."
      >
        <Select
          small
          onChange={({ target: { value } }) => {
            expressionanalyzerSettingsChanged({
              settingName: ExpressionAnalyzerSettingsTypes.CORRTYPE,
              newValue: value,
            });
            coreSettingsChanged({
              settingName: CoreSettingsTypes.SHOW_HELP,
              newValue: false,
            });
            runCalculation(pathname);
          }}
          options={corrtypeOptions}
          value={expressionanalyzerSettings?.corrType}
        />
      </Field>
      <Field
        label="Correlation Filter"
        labelLeft
        labelWidth="130px"
        helpText="Enter the genes that would limit the correlation analyses. Instead of whole data, only these genes will be considered during correlations. If you enter less than 10 valid genes still whole data will be considered during the analysis."
      >
        <TextArea
          placeholder="Please enter at least 10 genes,  seperated by comma, new line, space, or semicolon."
          rows={6}
          resize="vertical"
          value={expressionanalyzerSettings?.targetList}
          onChange={({ target: { value } }) =>
            expressionanalyzerSettingsChanged({
              settingName: ExpressionAnalyzerSettingsTypes.TARGET_LIST,
              newValue: value,
            })
          }
        />
      </Field>

      <Field>
        <CheckBox
          label="Filter Black Listed sgRNAs"
          onChange={({ target: { checked } }) =>
            expressionanalyzerSettingsChanged({
              settingName: ExpressionAnalyzerSettingsTypes.FILTER,
              newValue: checked,
            })
          }
          checked={expressionanalyzerSettings?.filter}
        />
      </Field>

      <Field
        labelLeft
        label="Filter Threshold"
        helpText="Adjusts the minimum threshold for the absolute Z Score."
      >
        <div className={styles.inputRange}>
          <Slider
            disabled={!expressionanalyzerSettings?.filter}
            label={expressionanalyzerSettings?.filterBlackListed}
            max={100}
            min={24}
            value={expressionanalyzerSettings?.filterBlackListed * 20}
            onChange={({ target: { value } }) =>
              expressionanalyzerSettingsChanged({
                settingName: ExpressionAnalyzerSettingsTypes.FILTER_BLACKLISTED,
                newValue: value / 20,
              })
            }
          />
        </div>
      </Field>

      <Field
        label="Highlight Perturbations"
        labelLeft
        labelWidth="130px"
        helpText="Select the perturbations that you would like to highlight"
      >
        <TextArea
          placeholder="Please enter the perturbation list seperated by comma, new line, space, or semicolon."
          tooltip="Please enter the perturbation gene symbols seperated by comma, new line, space, or semicolon."
          rows={6}
          resize="vertical"
          value={expressionanalyzerSettings?.genesTolabel}
          onChange={({ target: { value } }) =>
            expressionanalyzerSettingsChanged({
              settingName: ExpressionAnalyzerSettingsTypes.GENES_TO_LABEL,
              newValue: value,
            })
          }
        />
      </Field>
    </>
  );
};

const mapStateToProps = ({ settings }) => ({
  expressionanalyzerSettings: settings?.expressionanalyzer ?? {},
  coreSettings: settings?.core ?? {},
});
const mapDispatchToProps = {
  expressionanalyzerSettingsChanged,
  runCalculation,
  coreSettingsChanged,
};

const MainContainer = connect(
  mapStateToProps,
  mapDispatchToProps
)(ExpressionAnalyzerSettings);
export { MainContainer as ExpressionAnalyzerSettings };
