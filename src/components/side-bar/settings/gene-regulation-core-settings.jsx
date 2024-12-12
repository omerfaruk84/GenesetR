import React, { useState, useEffect } from "react";
import { connect } from "react-redux";
import {
  Field,
  Select,
  Slider,
  Divider,
  Toggle,
  Spacer,
  Label,
  Flex,
} from "@oliasoft-open-source/react-ui-library";
import { geneRegulationCoreSettingsChanged } from "../../../store/settings/gene-regulation-core-settings";
import { GeneRegulationCoreSettingsTypes } from "./enums";
import styles from "./settings.module.scss";
import { set, get } from "idb-keyval";
import Axios from "axios";
import { updateGeneLists } from "../../../store/api";
import { runCalculation } from "../../../store/results";
import { CoreSettingsTypes } from "./enums";
import { coreSettingsChanged } from "../../../store/settings/core-settings";

const GeneRegulationSettings = ({
  runCalculation,
  geneRegulationCoreSettings,
  geneRegulationCoreSettingsChanged,
  coreSettingsChanged,
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
    {
      label: "Dagre",
      value: "none",
    },
  ];
  const [geneOptions, setGeneOptions] = useState([]);

  useEffect(() => {
    async function fetchDataAndPopulate() {
      let check = new Set();

      try {
        await updateGeneLists("K562gwps");

        const perturbVal = await get("geneList_K562gwps_perturb");
        console.log("perturbVal", perturbVal);
        addToCheckSet(perturbVal, check);

        const genesVal = await get("geneList_K562gwps_genes");
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
  }, []);

  return (
    <>
      <Field label="Select a gene">
        <Select
          onChange={({ target: { value } }) => {
            geneRegulationCoreSettingsChanged({
              settingName: GeneRegulationCoreSettingsTypes.SELECTED_GENE,
              newValue: value,
            });
            coreSettingsChanged({
              settingName: CoreSettingsTypes.SHOW_HELP,
              newValue: false,
            });
            runCalculation("/gene-regulation");
          }}
          options={geneOptions}
          value={geneRegulationCoreSettings?.selectedGene}
        />
      </Field>

      <Field
        label="Show Regulation of Expression"
        labelLeft
        labelWidth="200px"
        helpText="Include links based on gene expression regulation. Default is true. You can deactivate this if you want to generate a network based on correlations only."
      >
        <Toggle
          onChange={({ target: { checked } }) =>
            geneRegulationCoreSettingsChanged({
              settingName: GeneRegulationCoreSettingsTypes.INCLUDE_EXP,
              newValue: checked,
            })
          }
          checked={geneRegulationCoreSettings?.include_exp}
        />
      </Field>
      <Field
        label="Absolute Z Score Threshold"
        helpText="Adjusts the minimum threshold for the absolute Z Score. Higher thresholds result in more stringent filtering of genes based on their effect size."
      >
        <div className={styles.inputRange}>
          <Slider
            label={geneRegulationCoreSettings?.absoluteZScore}
            max={40}
            min={4}
            value={geneRegulationCoreSettings?.absoluteZScore * 20}
            onChange={({ target: { value } }) =>
              geneRegulationCoreSettingsChanged({
                settingName: GeneRegulationCoreSettingsTypes.ABSOLUTE_Z_SCORE,
                newValue: value / 20,
              })
            }
          />
        </div>
      </Field>
      <Field
        label="Minimum Neighbour Count"
        helpText="Sets the minimum number of neighboring genes that a gene should have to be kept in the network. A higher count will result in fewer but potentially more influential genes."
      >
        <div className={styles.inputRange}>
          <Slider
            label={geneRegulationCoreSettings?.neighbourCount}
            max={5}
            min={1}
            value={geneRegulationCoreSettings?.neighbourCount}
            onChange={({ target: { value } }) =>
              geneRegulationCoreSettingsChanged({
                settingName: GeneRegulationCoreSettingsTypes.NEIGHBOUR_COUNT,
                newValue: value,
              })
            }
          />
        </div>
      </Field>
      <Divider align="left"> Noise filters </Divider>
      <Field
        label="Filter Black Listed sgRNAs"
        helpText="Enables or disables the filtering of blacklisted sgRNAs (sgRNAs that increase or decrease total mRNA levels). When 'Directional Only' is enabled, genes that downregulate or upregulate total mRNA levels will be removed from UPR and UNR genes, respectively."
      >
        <Spacer width="10px" />
        <Toggle
          onChange={({ target: { checked } }) =>
            geneRegulationCoreSettingsChanged({
              settingName: GeneRegulationCoreSettingsTypes.FILTER1_ENABLED,
              newValue: checked,
            })
          }
          checked={geneRegulationCoreSettings?.filter1Enabled}
          label="Enabled"
        />
        <Spacer width="16px" />
        <Toggle
          onChange={({ target: { checked } }) =>
            geneRegulationCoreSettingsChanged({
              settingName: GeneRegulationCoreSettingsTypes.FILTER1_DIRECTIONAL,
              newValue: checked,
            })
          }
          checked={geneRegulationCoreSettings?.filter1Directional}
          disabled={!geneRegulationCoreSettings?.filter1Enabled}
          label="Directional Only"
        />
        <div className={styles.inputRange}>
          <Slider
            label={geneRegulationCoreSettings?.filterBlackListed}
            max={60}
            min={24}
            disabled={!geneRegulationCoreSettings?.filter1Enabled}
            value={geneRegulationCoreSettings?.filterBlackListed * 20}
            onChange={({ target: { value } }) =>
              geneRegulationCoreSettingsChanged({
                settingName: GeneRegulationCoreSettingsTypes.FILTER_BLACKLISTED,
                newValue: value / 20,
              })
            }
          />
        </div>
      </Field>
      <Field
        label="Filter Black Listed Genes"
        helpText="Enables or disables the filtering of blacklisted genes (Genes that tend to be up or down regulated by abormally high number of sgRNAs). When 'Directional Only' is enabled, genes that tend to be nonspecifically up or downregulated will be removed from the genes that are up or downregulated by GOI, respectively"
      >
        <Spacer width="10px" />
        <Toggle
          onChange={({ target: { checked } }) =>
            geneRegulationCoreSettingsChanged({
              settingName: GeneRegulationCoreSettingsTypes.FILTER2_ENABLED,
              newValue: checked,
            })
          }
          checked={geneRegulationCoreSettings?.filter2Enabled}
          label="Enabled"
        />
        <Spacer width="16px" />
        <Toggle
          onChange={({ target: { checked } }) =>
            geneRegulationCoreSettingsChanged({
              settingName: GeneRegulationCoreSettingsTypes.FILTER2_DIRECTIONAL,
              newValue: checked,
            })
          }
          checked={geneRegulationCoreSettings?.filter2Directional}
          disabled={!geneRegulationCoreSettings?.filter2Enabled}
          label="Directional Only"
        />
        <div className={styles.inputRange}>
          <Slider
            label={geneRegulationCoreSettings?.filterBlackListedExp}
            disabled={!geneRegulationCoreSettings?.filter2Enabled}
            max={60}
            min={24}
            value={geneRegulationCoreSettings?.filterBlackListedExp * 20}
            onChange={({ target: { value } }) =>
              geneRegulationCoreSettingsChanged({
                settingName:
                  GeneRegulationCoreSettingsTypes.FILTER_BLACKLISTEDEXP,
                newValue: value / 20,
              })
            }
          />
        </div>
      </Field>

      <Field
        label="Perturbation Count Filter"
        helpText="Filters out genes that deregulate more than selected number of genes upon their knockdown. Default value is 750."
      >
        <Toggle
          onChange={({ target: { checked } }) =>
            geneRegulationCoreSettingsChanged({
              settingName: GeneRegulationCoreSettingsTypes.FILTER3_ENABLED,
              newValue: checked,
            })
          }
          checked={geneRegulationCoreSettings?.filter3Enabled}
          label="Enabled"
        />
        <div className={styles.inputRange}>
          <Slider
            label={geneRegulationCoreSettings?.filterCount1}
            disabled={!geneRegulationCoreSettings?.filter3Enabled}
            max={2500}
            step={250}
            min={250}
            value={geneRegulationCoreSettings?.filterCount1}
            onChange={({ target: { value } }) =>
              geneRegulationCoreSettingsChanged({
                settingName: GeneRegulationCoreSettingsTypes.FILTER_COUNT1,
                newValue: value,
              })
            }
          />
        </div>
      </Field>

      <Field
        label="Gene Expression Count Filter"
        helpText="Filters out genes that are deregulated by more than selected number of perturbations. Default value is 750."
      >
        <Toggle
          onChange={({ target: { checked } }) =>
            geneRegulationCoreSettingsChanged({
              settingName: GeneRegulationCoreSettingsTypes.FILTER4_ENABLED,
              newValue: checked,
            })
          }
          checked={geneRegulationCoreSettings?.filter4Enabled}
          label="Enabled"
        />
        <div className={styles.inputRange}>
          <Slider
            label={geneRegulationCoreSettings?.filterCount2}
            disabled={!geneRegulationCoreSettings?.filter4Enabled}
            max={1000}
            step={250}
            min={250}
            value={geneRegulationCoreSettings?.filterCount2}
            onChange={({ target: { value } }) =>
              geneRegulationCoreSettingsChanged({
                settingName: GeneRegulationCoreSettingsTypes.FILTER_COUNT2,
                newValue: value,
              })
            }
          />
        </div>
      </Field>
      <Divider align="left"> Others </Divider>
      <Field
        label="Simplified View"
        helpText="If enabled only links between Gene of Interest and its immediate neighbours will be shown. Slider sets the minimum number of neighbours required for a gene to be included in the simplified view"
      >
        <Toggle
          onChange={({ target: { checked } }) =>
            geneRegulationCoreSettingsChanged({
              settingName: GeneRegulationCoreSettingsTypes.FILTER5_ENABLED,
              newValue: checked,
            })
          }
          checked={geneRegulationCoreSettings?.filter5Enabled}
          label="Enabled"
        />
        <div className={styles.inputRange}>
          <Slider
            label={geneRegulationCoreSettings?.filterCount5}
            disabled={!geneRegulationCoreSettings?.filter5Enabled}
            max={100}
            min={1}
            value={geneRegulationCoreSettings?.filterCount5}
            onChange={({ target: { value } }) =>
              geneRegulationCoreSettingsChanged({
                settingName: GeneRegulationCoreSettingsTypes.FILTER_COUNT5,
                newValue: value,
              })
            }
          />
        </div>
      </Field>

      <Field
        label="Only Linked to Gene Of Interest"
        labelLeft
        labelWidth="250px"
        helpText="Keep genes only directly or indirectly linked to the GOI. Activating this "
      >
        <Toggle
          onChange={({ target: { checked } }) =>
            geneRegulationCoreSettingsChanged({
              settingName: GeneRegulationCoreSettingsTypes.ONLY_LINKED,
              newValue: checked,
            })
          }
          checked={geneRegulationCoreSettings?.onlyLinked}
        />
      </Field>

      <Field
        label="Node Size Based on Final Map"
        labelLeft
        labelWidth="250px"
        helpText="Adjust node sizes based on number of neighbouring genes, after filtering. Default True"
      >
        <Toggle
          onChange={({ target: { checked } }) =>
            geneRegulationCoreSettingsChanged({
              settingName: GeneRegulationCoreSettingsTypes.BASED_ON_FINAL,
              newValue: checked,
            })
          }
          checked={geneRegulationCoreSettings?.basedOnFinal}
        />
      </Field>
      <Divider align="left"> Correlation </Divider>
      <Field
        label="Include Correlation"
        labelLeft
        labelWidth="250px"
        helpText="Include links based on perturbation correlation. Default is true. You can deactivate this if you want to generate a network based on expressional regulation only."
      >
        <Toggle
          onChange={({ target: { checked } }) =>
            geneRegulationCoreSettingsChanged({
              settingName: GeneRegulationCoreSettingsTypes.INCLUDE_CORR,
              newValue: checked,
            })
          }
          checked={geneRegulationCoreSettings?.include_corr}
        />
      </Field>
      <Field
        labelLeft
        label="Correlation R Threshold"
        helpText="The threshold of correlation significance. By adjusting this filter, users can control the minimum strength of correlation needed for a relationship between two genes to be considered in the analysis."
      >
        <div className={styles.inputRange}>
          <Slider
            label={geneRegulationCoreSettings?.corr_cutoff}
            max={16}
            min={1}
            value={geneRegulationCoreSettings?.corr_cutoff * 20}
            onChange={({ target: { value } }) =>
              geneRegulationCoreSettingsChanged({
                settingName: GeneRegulationCoreSettingsTypes.CORR_CUTOFF,
                newValue: value / 20,
              })
            }
          />
        </div>
      </Field>

      <Divider align="left"> Edges to display </Divider>

      <div className={styles.edgeArea}>
        <Flex justifyContent="space-between">
          <Field
            label="UPR"
            labelLeft
            labelWidth="100px"
            helpText="Show Upstream Positive Regulators (Genes that lead to downregulation of GOI upon their knockdown)"
          >
            <Toggle
              onChange={({ target: { checked } }) =>
                geneRegulationCoreSettingsChanged({
                  settingName: GeneRegulationCoreSettingsTypes.UPR,
                  newValue: checked,
                })
              }
              checked={geneRegulationCoreSettings?.upr}
            />
          </Field>
          <Field
            label="UNR"
            labelLeft
            labelWidth="100px"
            helpText="Show Upstream Negative Regulators (Genes that lead to upregulation of GOI upon their knockdown)"
          >
            <Toggle
              onChange={({ target: { checked } }) =>
                geneRegulationCoreSettingsChanged({
                  settingName: GeneRegulationCoreSettingsTypes.UNR,
                  newValue: checked,
                })
              }
              checked={geneRegulationCoreSettings?.unr}
            />
          </Field>

          <Field
            label="DPR"
            labelLeft
            labelWidth="100px"
            helpText="Show Downstream Positively Regulated genes (Genes that are downregulated upon knockdown of GOI)"
          >
            <Toggle
              onChange={({ target: { checked } }) =>
                geneRegulationCoreSettingsChanged({
                  settingName: GeneRegulationCoreSettingsTypes.DPR,
                  newValue: checked,
                })
              }
              checked={geneRegulationCoreSettings?.dpr}
            />
          </Field>
          <Field
            label="DNR"
            labelLeft
            labelWidth="100px"
            helpText="Show Downstream Negatively Regulated genes (Genes that are upregulated upon knockdown of GOI)"
          >
            <Toggle
              onChange={({ target: { checked } }) =>
                geneRegulationCoreSettingsChanged({
                  settingName: GeneRegulationCoreSettingsTypes.DNR,
                  newValue: checked,
                })
              }
              checked={geneRegulationCoreSettings?.dnr}
            />
          </Field>
          <Field
            label="UPR to DPR"
            labelLeft
            labelWidth="100px"
            helpText="Show links between Upstream Positive Regulators and Downstream Positively Regulated genes"
          >
            <Toggle
              onChange={({ target: { checked } }) =>
                geneRegulationCoreSettingsChanged({
                  settingName: GeneRegulationCoreSettingsTypes.UPR_DPR,
                  newValue: checked,
                })
              }
              checked={geneRegulationCoreSettings?.upr_dpr}
            />
          </Field>
          <Field
            label="UPR to DNR"
            labelLeft
            labelWidth="100px"
            helpText="Show links between Upstream Positive Regulators and Downstream Negatively Regulated genes"
          >
            <Toggle
              onChange={({ target: { checked } }) =>
                geneRegulationCoreSettingsChanged({
                  settingName: GeneRegulationCoreSettingsTypes.UPR_DNR,
                  newValue: checked,
                })
              }
              checked={geneRegulationCoreSettings?.upr_dnr}
            />
          </Field>
          <Field
            label="UNR to DPR"
            labelLeft
            labelWidth="100px"
            helpText="Show links between Upstream Negative Regulators and Downstream Positively Regulated genes"
          >
            <Toggle
              onChange={({ target: { checked } }) =>
                geneRegulationCoreSettingsChanged({
                  settingName: GeneRegulationCoreSettingsTypes.UNR_DPR,
                  newValue: checked,
                })
              }
              checked={geneRegulationCoreSettings?.unr_dpr}
            />
          </Field>
          <Field
            label="UNR to DNR"
            labelLeft
            labelWidth="100px"
            helpText="Show links between Upstream Negative Regulators and Downstream Negatively Regulated genes"
          >
            <Toggle
              onChange={({ target: { checked } }) =>
                geneRegulationCoreSettingsChanged({
                  settingName: GeneRegulationCoreSettingsTypes.UNR_DNR,
                  newValue: checked,
                })
              }
              checked={geneRegulationCoreSettings?.unr_dnr}
            />
          </Field>

          <Field
            label="UPR to UNR"
            labelLeft
            labelWidth="100px"
            helpText="Show links between Upstream Positive Regulators and Upstream Negative Regulators"
          >
            <Toggle
              onChange={({ target: { checked } }) =>
                geneRegulationCoreSettingsChanged({
                  settingName: GeneRegulationCoreSettingsTypes.UPR_UNR,
                  newValue: checked,
                })
              }
              checked={geneRegulationCoreSettings?.upr_unr}
            />
          </Field>
          <Field
            label="UNR to UPR"
            labelLeft
            labelWidth="100px"
            helpText="Show links between Upstream Negative Regulators and Upstream Positive Regulators"
          >
            <Toggle
              onChange={({ target: { checked } }) =>
                geneRegulationCoreSettingsChanged({
                  settingName: GeneRegulationCoreSettingsTypes.UNR_UPR,
                  newValue: checked,
                })
              }
              checked={geneRegulationCoreSettings?.unr_upr}
            />
          </Field>
          <Field
            label="DPR to DNR"
            labelLeft
            labelWidth="100px"
            helpText="Show links between Downstream Positively and Negatively Regulated genes"
          >
            <Toggle
              onChange={({ target: { checked } }) =>
                geneRegulationCoreSettingsChanged({
                  settingName: GeneRegulationCoreSettingsTypes.DPR_DNR,
                  newValue: checked,
                })
              }
              checked={geneRegulationCoreSettings?.dpr_dnr}
            />
          </Field>
          <Field
            label="DNR to DPR"
            labelLeft
            labelWidth="100px"
            helpText="Show links between Downstream Negatively and Positively Regulated genes"
          >
            <Toggle
              onChange={({ target: { checked } }) =>
                geneRegulationCoreSettingsChanged({
                  settingName: GeneRegulationCoreSettingsTypes.DNR_DPR,
                  newValue: checked,
                })
              }
              checked={geneRegulationCoreSettings?.dnr_dpr}
            />
          </Field>

          <Field
            label="Among UPR"
            labelLeft
            labelWidth="100px"
            helpText="Show links among the Upstream Positively Regulated genes"
          >
            <Toggle
              onChange={({ target: { checked } }) =>
                geneRegulationCoreSettingsChanged({
                  settingName: GeneRegulationCoreSettingsTypes.AMONG_UPR,
                  newValue: checked,
                })
              }
              checked={geneRegulationCoreSettings?.among_upr}
            />
          </Field>
          <Field
            label="Among UNR"
            labelLeft
            labelWidth="100px"
            helpText="Show links among the Upstream Negatively Regulated genes"
          >
            <Toggle
              onChange={({ target: { checked } }) =>
                geneRegulationCoreSettingsChanged({
                  settingName: GeneRegulationCoreSettingsTypes.AMONG_UNR,
                  newValue: checked,
                })
              }
              checked={geneRegulationCoreSettings?.among_unr}
            />
          </Field>
          <Field
            label="Among DPR"
            labelLeft
            labelWidth="100px"
            helpText="Show links among the Downstream Positively Regulated genes"
          >
            <Toggle
              onChange={({ target: { checked } }) =>
                geneRegulationCoreSettingsChanged({
                  settingName: GeneRegulationCoreSettingsTypes.AMONG_DPR,
                  newValue: checked,
                })
              }
              checked={geneRegulationCoreSettings?.among_dpr}
            />
          </Field>
          <Field
            label="Among DNR"
            labelLeft
            labelWidth="100px"
            helpText="Show links among the Downstream Negatively Regulated genes"
          >
            <Toggle
              onChange={({ target: { checked } }) =>
                geneRegulationCoreSettingsChanged({
                  settingName: GeneRegulationCoreSettingsTypes.AMONG_DNR,
                  newValue: checked,
                })
              }
              checked={geneRegulationCoreSettings?.among_dnr}
            />
          </Field>
        </Flex>
      </div>

      <Divider align="left"> Graph Settings </Divider>
      <Field
        label="Layout"
        labelLeft
        labelWidth="130px"
        helpText="Set the layout style for genes."
      >
        <Select
          onChange={({ target: { value } }) =>
            geneRegulationCoreSettingsChanged({
              settingName: GeneRegulationCoreSettingsTypes.LAYOUT,
              newValue: value,
            })
          }
          options={layoutOption}
          value={geneRegulationCoreSettings?.layout}
        />
      </Field>

      {geneRegulationCoreSettings?.layout === "force" ? (
        <Field
          label="Repulsion"
          labelLeft
          labelWidth="130px"
          helpText="The repulsion factor between nodes. The repulsion will be stronger and the distance between two nodes becomes further as this value becomes larger."
        >
          <div className={styles.inputRange}>
            <Slider
              label={geneRegulationCoreSettings?.repulsion}
              max={1000}
              min={50}
              value={geneRegulationCoreSettings?.repulsion}
              onChange={({ target: { value } }) =>
                geneRegulationCoreSettingsChanged({
                  settingName: GeneRegulationCoreSettingsTypes.REPULSION,
                  newValue: value,
                })
              }
            />
          </div>
        </Field>
      ) : (
        ""
      )}

      {geneRegulationCoreSettings?.layout === "none" ? (
        <Field
          label="Dagre Layout Node Seperation"
          labelLeft
          labelWidth="130px"
          helpText="Sets the seperation"
        >
          <div className={styles.inputRange}>
            <Slider
              label={geneRegulationCoreSettings?.dagreSeperation}
              max={1000}
              min={-1000}
              value={geneRegulationCoreSettings?.dagreSeperation}
              onChange={({ target: { value } }) =>
                geneRegulationCoreSettingsChanged({
                  settingName: GeneRegulationCoreSettingsTypes.DAGRE_SEPERATION,
                  newValue: value,
                })
              }
            />
          </div>
        </Field>
      ) : (
        ""
      )}

      <Field
        label="Isolated nodes"
        labelLeft
        labelWidth="130px"
        helpText="Hide/Show genes that are not connected to any other gene."
      >
        <Toggle
          label="Show"
          onChange={({ target: { checked } }) =>
            geneRegulationCoreSettingsChanged({
              settingName: GeneRegulationCoreSettingsTypes.ISOLATED_NODES,
              newValue: checked,
            })
          }
          checked={geneRegulationCoreSettings?.isolatednodes}
        />
      </Field>
    </>
  );
};

const mapStateToProps = ({ settings }) => ({
  geneRegulationCoreSettings: settings?.geneRegulationCore ?? {},
  coreSettings: settings?.core ?? {},
});

const mapDispatchToProps = {
  geneRegulationCoreSettingsChanged,
  runCalculation,
  coreSettingsChanged,
};

const MainContainer = connect(
  mapStateToProps,
  mapDispatchToProps
)(GeneRegulationSettings);

export { MainContainer as GeneRegulationSettings };
