import React, { useState, useEffect } from "react";
import { updateGeneLists } from "../../../store/api";
import { connect } from "react-redux";
import {
  Field,
  Select,
  TextArea,
  Slider,
  CheckBox,
} from "@oliasoft-open-source/react-ui-library";
import { multidatasetComparisonSettingsChanged } from "../../../store/settings/multidataset-comparison-settings";
import { get } from "idb-keyval";
import { MultiDatasetComparisonSettingsTypes } from "./enums";
import { useLocation } from "react-router-dom";
import { ROUTES } from "../../../common/routes";
import styles from "./settings.module.scss";

const MultiDatasetComparisonSettings = ({
  multidatasetComparisonSettings,
  multidatasetComparisonSettingsChanged,
  coreSettings,
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

      try {
        // Check if coreSettings and datasetList are available
        if (!coreSettings?.datasetList || coreSettings.datasetList.length === 0) {
          return;
        }

        // Get genes from all whole genome datasets
        const wholeGenomeDatasets = coreSettings.datasetList
          .filter(dataset => dataset.isWholeGenome)
          .map(dataset => dataset.id);
        
        if (wholeGenomeDatasets.length === 0) {
          return;
        }
        
        for (let cellline of wholeGenomeDatasets) {
          await updateGeneLists(cellline);
          
          const perturbVal = await get("geneList_" + cellline + "_perturb");
          if (perturbVal && perturbVal.size > 0) {
            for (let item of perturbVal) {
              check.add(item.split("_")[0]);
            }
          }

          const genesVal = await get("geneList_" + cellline + "_genes");
          if (genesVal && genesVal.size > 0) {
            for (let item of genesVal) {
              check.add(item.split("_")[0]);
            }
          }
        }

        check.delete(""); // Remove any empty values

        // Convert the set to array, filter, and map
        let temp = Array.from(check)
          .filter((val) => !val.startsWith("non-"))
          .map((val) => ({ label: val, value: val }));

        // Sort gene options
        let geneOptionsArray = temp.sort((a, b) => a.label.localeCompare(b.label));

        setGeneOptions(geneOptionsArray);
        
        // Set default gene if none selected
        if (!multidatasetComparisonSettings.selectedGene && geneOptionsArray.length > 0) {
          multidatasetComparisonSettingsChanged({
            settingName: MultiDatasetComparisonSettingsTypes.SELECTED_GENE,
            newValue: geneOptionsArray[0].value,
          });
        }
      } catch (error) {
        console.error("Error fetching gene lists:", error);
      }
    }

    // Only fetch data when on the multidataset comparison page and if gene options are empty
    if (pathname === ROUTES.MULTIDATASET_COMPARISON && geneOptions.length === 0) {
      fetchDataAndPopulate();
    }
  }, [pathname, geneOptions.length, coreSettings?.datasetList]);

  return (
    <>
      <Field label="Gene Selection" labelLeft labelWidth="130px" helpText="Select a gene to compare across all whole genome datasets">
        <Select
          value={multidatasetComparisonSettings?.selectedGene}
          isSearchable
          placeholder="Select gene..."
          options={geneOptions}
          onChange={({ target: { value } }) => {
            multidatasetComparisonSettingsChanged({
              settingName: MultiDatasetComparisonSettingsTypes.SELECTED_GENE,
              newValue: value,
            });
          }}
        />
      </Field>

      <Field label="Correlation Type" labelLeft labelWidth="130px" helpText="Select the correlation algorithm for analysis">
        <Select
          value={multidatasetComparisonSettings?.corrType}
          placeholder="Select correlation type..."
          options={corrtypeOptions}
          onChange={({ target: { value } }) => {
            multidatasetComparisonSettingsChanged({
              settingName: MultiDatasetComparisonSettingsTypes.CORR_TYPE,
              newValue: value,
            });
          }}
        />
      </Field>

      <Field label="Target Gene List" labelLeft labelWidth="130px" helpText="Optional: Enter specific genes to compare (leave empty for all genes)">
        <TextArea
          value={multidatasetComparisonSettings?.targetList}
          placeholder="Enter genes separated by new lines..."
          rows={6}
          onChange={(e) => {
            multidatasetComparisonSettingsChanged({
              settingName: MultiDatasetComparisonSettingsTypes.TARGET_LIST,
              newValue: e.target.value,
            });
          }}
        />
      </Field>

      <Field helpText="Filter out sgRNAs that are blacklisted in any selected dataset (union of blacklists).">
        <CheckBox
          label="Filter Black Listed sgRNAs"
          onChange={({ target: { checked } }) =>
            multidatasetComparisonSettingsChanged({
              settingName: MultiDatasetComparisonSettingsTypes.FILTER,
              newValue: checked,
            })
          }
          checked={!!multidatasetComparisonSettings?.filter}
        />
      </Field>

      <Field
        labelLeft
        label="Filter Threshold"
        helpText="Minimum blacklist Z score required to drop a gene (applied across the union of datasets)."
      >
        <div className={styles.inputRange}>
          <Slider
            disabled={!multidatasetComparisonSettings?.filter}
            label={multidatasetComparisonSettings?.filterBlackListed ?? 2}
            max={100}
            min={24}
            value={(multidatasetComparisonSettings?.filterBlackListed ?? 2) * 20}
            onChange={({ target: { value } }) =>
              multidatasetComparisonSettingsChanged({
                settingName: MultiDatasetComparisonSettingsTypes.FILTER_BLACKLISTED,
                newValue: value / 20,
              })
            }
          />
        </div>
      </Field>
    </>
  );
};

const mapStateToProps = ({ settings }) => ({
  multidatasetComparisonSettings: settings?.multidatasetComparison ?? {},
  coreSettings: settings?.core ?? {},
});

const mapDispatchToProps = {
  multidatasetComparisonSettingsChanged,
};

const MainContainer = connect(
  mapStateToProps,
  mapDispatchToProps
)(MultiDatasetComparisonSettings);

export { MainContainer as MultiDatasetComparisonSettings }; 
