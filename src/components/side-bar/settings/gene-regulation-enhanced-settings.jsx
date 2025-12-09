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
  Button,
  Input,
} from "@oliasoft-open-source/react-ui-library";
import { 
  geneRegulationEnhancedSettingsChanged,
  addExperiment,
  removeExperiment,
  updateExperimentWeight,
} from "../../../store/settings/gene-regulation-enhanced-settings";
import { GeneRegulationEnhancedSettingsTypes } from "./enums";
import styles from "./settings.module.scss";
import { set, get } from "idb-keyval";
import { updateGeneLists, fetchWholeGenomeDatasets } from "../../../store/api";
import { runCalculation } from "../../../store/results";
import { CoreSettingsTypes } from "./enums";
import { coreSettingsChanged } from "../../../store/settings/core-settings";

const GeneRegulationEnhancedSettings = ({
  runCalculation,
  geneRegulationEnhancedSettings,
  geneRegulationEnhancedSettingsChanged,
  addExperiment,
  removeExperiment,
  updateExperimentWeight,
  coreSettingsChanged,
}) => {
  const [geneOptions, setGeneOptions] = useState([]);
  const [availableExperiments, setAvailableExperiments] = useState([]);

  const layoutOptions = [
    { label: "Force", value: "force" },
    { label: "Circular", value: "circular" },
    { label: "Dagre", value: "none" },
  ];

  const combineMethodOptions = [
    { label: "Weighted Mean", value: "weighted_mean" },
    { label: "Median", value: "median" },
    { label: "Rank Mean", value: "rank_mean" },
  ];

  // Enhanced visualization options
  const networkRendererOptions = [
    { label: "Cytoscape (Interactive)", value: "Cytoscape" },
    { label: "Sigma.js (WebGL Fast)", value: "Sigma" },
    { label: "React Flow (DAG Layout)", value: "ReactFlow" },
    { label: "Force Graph 2D (Canvas)", value: "ForceGraph2D" },
  ];

  const nodeStyleOptions = [
    { label: "Category Colors", value: "category" },
    { label: "Degree Size", value: "degree" },
    { label: "Knockdown Efficiency", value: "knockdown" },
    { label: "Mixed (Category + Degree)", value: "mixed" },
  ];

  const edgeStyleOptions = [
    { label: "Type Colors", value: "type" },
    { label: "Correlation Strength", value: "correlation" },
    { label: "Z-Score Intensity", value: "zscore" },
    { label: "Uniform", value: "uniform" },
  ];

  useEffect(() => {
    async function fetchDataAndPopulate() {
      try {
        // Fetch available experiments (whole genome datasets)
        const experiments = await fetchWholeGenomeDatasets();
        setAvailableExperiments(experiments || []);

        // Fetch gene options from all selected experiments
        let allGenes = new Set();

        for (const expId of geneRegulationEnhancedSettings?.selectedExperiments || ["K562gwps"]) {
          try {
            await updateGeneLists(expId);
            const perturbVal = await get(`geneList_${expId}_perturb`);
            const genesVal = await get(`geneList_${expId}_genes`);
            
            if (perturbVal && perturbVal.size > 0) {
              for (let item of perturbVal) {
                allGenes.add(item.split("_")[0]);
              }
            }
            if (genesVal && genesVal.size > 0) {
              for (let item of genesVal) {
                allGenes.add(item.split("_")[0]);
              }
            }
          } catch (error) {
            console.warn(`Failed to load genes for experiment ${expId}:`, error);
          }
        }

        allGenes.delete(""); // Remove empty values
        
        const geneOptionsArray = Array.from(allGenes)
          .filter((val) => !val.startsWith("non-"))
          .map((val) => ({ label: val, value: val }))
          .sort((a, b) => a.label.localeCompare(b.label));

        setGeneOptions(geneOptionsArray);
      } catch (error) {
        console.error("Error populating options:", error);
      }
    }

    fetchDataAndPopulate();
  }, [geneRegulationEnhancedSettings?.selectedExperiments]);

  const handleExperimentAdd = (experimentId) => {
    if (!geneRegulationEnhancedSettings.selectedExperiments.includes(experimentId)) {
      addExperiment({ experimentId, weight: 1.0 });
    }
  };

  const handleExperimentRemove = (experimentId) => {
    if (geneRegulationEnhancedSettings.selectedExperiments.length > 1) {
      removeExperiment({ experimentId });
    }
  };

  const handleWeightChange = (experimentId, weight) => {
    updateExperimentWeight({ experimentId, weight: parseFloat(weight) });
  };

  return (
    <>
      <Field 
        label="Select a gene" 
        helpText="Choose a gene to analyze its regulatory network across multiple experiments."
      >
        <Select
          onChange={({ target: { value } }) => {
            geneRegulationEnhancedSettingsChanged({
              settingName: GeneRegulationEnhancedSettingsTypes.SELECTED_GENE,
              newValue: value,
            });
            coreSettingsChanged({
              settingName: CoreSettingsTypes.SHOW_HELP,
              newValue: false,
            });
            runCalculation("/gene-regulation-enhanced");
          }}
          options={geneOptions}
          value={geneRegulationEnhancedSettings?.selectedGene}
        />
      </Field>

      <Divider align="left">Multi-Experiment Configuration</Divider>

      <Field 
        label="Combine Method"
        helpText="Method for combining data from multiple experiments."
      >
        <Select
          onChange={({ target: { value } }) =>
            geneRegulationEnhancedSettingsChanged({
              settingName: GeneRegulationEnhancedSettingsTypes.COMBINE_METHOD,
              newValue: value,
            })
          }
          options={combineMethodOptions}
          value={geneRegulationEnhancedSettings?.combineMethod}
        />
      </Field>

      <Field 
        label="Selected Experiments"
        helpText="Configure which experiments to include and their weights."
      >
        {geneRegulationEnhancedSettings?.selectedExperiments?.map((expId, index) => (
          <div key={expId} style={{ marginBottom: "10px", padding: "10px", border: "1px solid #e0e0e0", borderRadius: "4px" }}>
            <Flex justifyContent="space-between" alignItems="center">
              <div style={{ flex: 1 }}>
                <strong>{expId}</strong>
              </div>
              <div style={{ flex: 1, marginLeft: "10px" }}>
                <Input
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="5.0"
                  value={geneRegulationEnhancedSettings?.experimentWeights?.[index] || 1.0}
                  onChange={({ target: { value } }) => handleWeightChange(expId, value)}
                  style={{ width: "80px" }}
                />
                <Label style={{ marginLeft: "5px", fontSize: "12px" }}>Weight</Label>
              </div>
              <div>
                <Button
                  variant="danger"
                  size="small"
                  onClick={() => handleExperimentRemove(expId)}
                  disabled={geneRegulationEnhancedSettings?.selectedExperiments?.length <= 1}
                >
                  Remove
                </Button>
              </div>
            </Flex>
          </div>
        ))}
        
        <Field label="Add Experiment">
          <Select
            onChange={({ target: { value } }) => {
              if (value) {
                handleExperimentAdd(value);
              }
            }}
            options={[
              { label: "Select experiment to add...", value: "" },
              ...availableExperiments
                .filter(exp => !geneRegulationEnhancedSettings?.selectedExperiments?.includes(exp.id))
                .map(exp => ({ label: exp.name, value: exp.id }))
            ]}
            value=""
          />
        </Field>
      </Field>

      <Divider align="left">Filtering & Thresholds</Divider>

      <Field
        label="Z-Score Filter"
        helpText="Minimum absolute Z-score threshold for expression effects."
      >
        <div className={styles.inputRange}>
          <Slider
            label={geneRegulationEnhancedSettings?.zFilter}
            max={2.0}
            min={0.1}
            step={0.05}
            value={geneRegulationEnhancedSettings?.zFilter}
            onChange={({ target: { value } }) =>
              geneRegulationEnhancedSettingsChanged({
                settingName: GeneRegulationEnhancedSettingsTypes.Z_FILTER,
                newValue: value,
              })
            }
          />
        </div>
      </Field>

      <Field
        label="Correlation Filter"
        helpText="Minimum correlation threshold for perturbation relationships."
      >
        <div className={styles.inputRange}>
          <Slider
            label={geneRegulationEnhancedSettings?.corrFilter}
            max={0.8}
            min={0.1}
            step={0.05}
            value={geneRegulationEnhancedSettings?.corrFilter}
            onChange={({ target: { value } }) =>
              geneRegulationEnhancedSettingsChanged({
                settingName: GeneRegulationEnhancedSettingsTypes.CORR_FILTER,
                newValue: value,
              })
            }
          />
        </div>
      </Field>

      <Divider align="left">Adaptive Caps</Divider>

      <Field
        label="Top-K Upstream"
        helpText="Maximum number of upstream regulators to include."
      >
        <div className={styles.inputRange}>
          <Slider
            label={geneRegulationEnhancedSettings?.topkUpstream}
            max={200}
            min={10}
            step={10}
            value={geneRegulationEnhancedSettings?.topkUpstream}
            onChange={({ target: { value } }) =>
              geneRegulationEnhancedSettingsChanged({
                settingName: GeneRegulationEnhancedSettingsTypes.TOPK_UPSTREAM,
                newValue: value,
              })
            }
          />
        </div>
      </Field>

      <Field
        label="Top-K Downstream"
        helpText="Maximum number of downstream targets to include."
      >
        <div className={styles.inputRange}>
          <Slider
            label={geneRegulationEnhancedSettings?.topkDownstream}
            max={300}
            min={10}
            step={10}
            value={geneRegulationEnhancedSettings?.topkDownstream}
            onChange={({ target: { value } }) =>
              geneRegulationEnhancedSettingsChanged({
                settingName: GeneRegulationEnhancedSettingsTypes.TOPK_DOWNSTREAM,
                newValue: value,
              })
            }
          />
        </div>
      </Field>

      <Field
        label="Top-K Correlations"
        helpText="Maximum number of correlations to include per gene."
      >
        <div className={styles.inputRange}>
          <Slider
            label={geneRegulationEnhancedSettings?.corrTopk}
            max={300}
            min={10}
            step={10}
            value={geneRegulationEnhancedSettings?.corrTopk}
            onChange={({ target: { value } }) =>
              geneRegulationEnhancedSettingsChanged({
                settingName: GeneRegulationEnhancedSettingsTypes.CORR_TOPK,
                newValue: value,
              })
            }
          />
        </div>
      </Field>

      <Divider align="left">Graph Size Limits</Divider>

      <Field
        label="Maximum Nodes"
        helpText="Global limit on the number of nodes in the final graph."
      >
        <div className={styles.inputRange}>
          <Slider
            label={geneRegulationEnhancedSettings?.maxNodes}
            max={1000}
            min={100}
            step={50}
            value={geneRegulationEnhancedSettings?.maxNodes}
            onChange={({ target: { value } }) =>
              geneRegulationEnhancedSettingsChanged({
                settingName: GeneRegulationEnhancedSettingsTypes.MAX_NODES,
                newValue: value,
              })
            }
          />
        </div>
      </Field>

      <Field
        label="Maximum Edges"
        helpText="Global limit on the number of edges in the final graph."
      >
        <div className={styles.inputRange}>
          <Slider
            label={geneRegulationEnhancedSettings?.maxEdges}
            max={5000}
            min={500}
            step={250}
            value={geneRegulationEnhancedSettings?.maxEdges}
            onChange={({ target: { value } }) =>
              geneRegulationEnhancedSettingsChanged({
                settingName: GeneRegulationEnhancedSettingsTypes.MAX_EDGES,
                newValue: value,
              })
            }
          />
        </div>
      </Field>

      <Divider align="left">Visualization Settings</Divider>

      <Field
        label="Network Renderer"
        helpText="Choose the visualization engine for the network graph."
      >
        <Select
          onChange={({ target: { value } }) =>
            geneRegulationEnhancedSettingsChanged({
              settingName: GeneRegulationEnhancedSettingsTypes.NETWORK_RENDERER,
              newValue: value,
            })
          }
          options={networkRendererOptions}
          value={geneRegulationEnhancedSettings?.networkRenderer || "Cytoscape"}
        />
      </Field>

      <Field
        label="Node Styling"
        helpText="How nodes should be colored and sized."
      >
        <Select
          onChange={({ target: { value } }) =>
            geneRegulationEnhancedSettingsChanged({
              settingName: GeneRegulationEnhancedSettingsTypes.NODE_STYLE,
              newValue: value,
            })
          }
          options={nodeStyleOptions}
          value={geneRegulationEnhancedSettings?.nodeStyle || "category"}
        />
      </Field>

      <Field
        label="Edge Styling"
        helpText="How edges should be colored and styled."
      >
        <Select
          onChange={({ target: { value } }) =>
            geneRegulationEnhancedSettingsChanged({
              settingName: GeneRegulationEnhancedSettingsTypes.EDGE_STYLE,
              newValue: value,
            })
          }
          options={edgeStyleOptions}
          value={geneRegulationEnhancedSettings?.edgeStyle || "type"}
        />
      </Field>

      <Field
        label="Graph Height"
        helpText="Height of the network visualization in pixels."
      >
        <div className={styles.inputRange}>
          <Slider
            label={geneRegulationEnhancedSettings?.graphHeight}
            max={1200}
            min={400}
            step={50}
            value={geneRegulationEnhancedSettings?.graphHeight || 640}
            onChange={({ target: { value } }) =>
              geneRegulationEnhancedSettingsChanged({
                settingName: GeneRegulationEnhancedSettingsTypes.GRAPH_HEIGHT,
                newValue: value,
              })
            }
          />
        </div>
      </Field>

      <Field
        label="Show Graph Legend"
        labelLeft
        labelWidth="200px"
        helpText="Display color legend and node size guide."
      >
        <Toggle
          onChange={({ target: { checked } }) =>
            geneRegulationEnhancedSettingsChanged({
              settingName: GeneRegulationEnhancedSettingsTypes.SHOW_LEGEND,
              newValue: checked,
            })
          }
          checked={geneRegulationEnhancedSettings?.showLegend ?? true}
        />
      </Field>

      <Field
        label="Animate Correlations"
        labelLeft
        labelWidth="200px"
        helpText="Animate correlation edges (for supported renderers)."
      >
        <Toggle
          onChange={({ target: { checked } }) =>
            geneRegulationEnhancedSettingsChanged({
              settingName: GeneRegulationEnhancedSettingsTypes.ANIMATE_CORRELATIONS,
              newValue: checked,
            })
          }
          checked={geneRegulationEnhancedSettings?.animateCorrelations ?? true}
        />
      </Field>

      <Divider align="left">Include/Exclude</Divider>

      <Field
        label="Include Expression"
        labelLeft
        labelWidth="200px"
        helpText="Include links based on gene expression regulation."
      >
        <Toggle
          onChange={({ target: { checked } }) =>
            geneRegulationEnhancedSettingsChanged({
              settingName: GeneRegulationEnhancedSettingsTypes.INCLUDE_EXP,
              newValue: checked,
            })
          }
          checked={geneRegulationEnhancedSettings?.includeExp}
        />
      </Field>

      <Field
        label="Include Correlation"
        labelLeft
        labelWidth="200px"
        helpText="Include links based on perturbation correlation."
      >
        <Toggle
          onChange={({ target: { checked } }) =>
            geneRegulationEnhancedSettingsChanged({
              settingName: GeneRegulationEnhancedSettingsTypes.INCLUDE_CORR,
              newValue: checked,
            })
          }
          checked={geneRegulationEnhancedSettings?.includeCorr}
        />
      </Field>

      <Divider align="left">Edge Types to Display</Divider>

      <div className={styles.edgeArea}>
        <Flex justifyContent="space-between">
          <Field label="UPR" labelLeft labelWidth="100px" helpText="Upstream Positive Regulators">
            <Toggle
              onChange={({ target: { checked } }) =>
                geneRegulationEnhancedSettingsChanged({
                  settingName: GeneRegulationEnhancedSettingsTypes.UPR,
                  newValue: checked,
                })
              }
              checked={geneRegulationEnhancedSettings?.upr}
            />
          </Field>
          <Field label="UNR" labelLeft labelWidth="100px" helpText="Upstream Negative Regulators">
            <Toggle
              onChange={({ target: { checked } }) =>
                geneRegulationEnhancedSettingsChanged({
                  settingName: GeneRegulationEnhancedSettingsTypes.UNR,
                  newValue: checked,
                })
              }
              checked={geneRegulationEnhancedSettings?.unr}
            />
          </Field>
          <Field label="DPR" labelLeft labelWidth="100px" helpText="Downstream Positively Regulated">
            <Toggle
              onChange={({ target: { checked } }) =>
                geneRegulationEnhancedSettingsChanged({
                  settingName: GeneRegulationEnhancedSettingsTypes.DPR,
                  newValue: checked,
                })
              }
              checked={geneRegulationEnhancedSettings?.dpr}
            />
          </Field>
          <Field label="DNR" labelLeft labelWidth="100px" helpText="Downstream Negatively Regulated">
            <Toggle
              onChange={({ target: { checked } }) =>
                geneRegulationEnhancedSettingsChanged({
                  settingName: GeneRegulationEnhancedSettingsTypes.DNR,
                  newValue: checked,
                })
              }
              checked={geneRegulationEnhancedSettings?.dnr}
            />
          </Field>
        </Flex>
      </div>

      <Divider align="left">Graph Layout</Divider>

      <Field
        label="Layout"
        labelLeft
        labelWidth="130px"
        helpText="Set the layout style for the gene regulation network."
      >
        <Select
          onChange={({ target: { value } }) =>
            geneRegulationEnhancedSettingsChanged({
              settingName: GeneRegulationEnhancedSettingsTypes.LAYOUT,
              newValue: value,
            })
          }
          options={layoutOptions}
          value={geneRegulationEnhancedSettings?.layout}
        />
      </Field>

      {geneRegulationEnhancedSettings?.layout === "force" && (
        <Field
          label="Repulsion"
          labelLeft
          labelWidth="130px"
          helpText="The repulsion factor between nodes."
        >
          <div className={styles.inputRange}>
            <Slider
              label={geneRegulationEnhancedSettings?.repulsion}
              max={1000}
              min={50}
              value={geneRegulationEnhancedSettings?.repulsion}
              onChange={({ target: { value } }) =>
                geneRegulationEnhancedSettingsChanged({
                  settingName: GeneRegulationEnhancedSettingsTypes.REPULSION,
                  newValue: value,
                })
              }
            />
          </div>
        </Field>
      )}

      {geneRegulationEnhancedSettings?.layout === "none" && (
        <Field
          label="Dagre Layout Node Separation"
          labelLeft
          labelWidth="130px"
          helpText="Sets the separation between nodes in Dagre layout."
        >
          <div className={styles.inputRange}>
            <Slider
              label={geneRegulationEnhancedSettings?.dagreSeperation}
              max={1000}
              min={-1000}
              value={geneRegulationEnhancedSettings?.dagreSeperation}
              onChange={({ target: { value } }) =>
                geneRegulationEnhancedSettingsChanged({
                  settingName: GeneRegulationEnhancedSettingsTypes.DAGRE_SEPERATION,
                  newValue: value,
                })
              }
            />
          </div>
        </Field>
      )}

      <Field
        label="Isolated nodes"
        labelLeft
        labelWidth="130px"
        helpText="Show/hide genes that are not connected to any other gene."
      >
        <Toggle
          label="Show"
          onChange={({ target: { checked } }) =>
            geneRegulationEnhancedSettingsChanged({
              settingName: GeneRegulationEnhancedSettingsTypes.ISOLATED_NODES,
              newValue: checked,
            })
          }
          checked={geneRegulationEnhancedSettings?.isolatedNodes}
        />
      </Field>

      <Divider align="left">Simplified View</Divider>
      
      <Field
        label="Simplified View"
        helpText="If enabled, only links between the Gene of Interest and its immediate neighbors will be shown. The slider sets the minimum number of neighbors required for a gene to be included in the simplified view."
      >
        <Toggle
          onChange={({ target: { checked } }) =>
            geneRegulationEnhancedSettingsChanged({
              settingName: GeneRegulationEnhancedSettingsTypes.SIMPLIFIED_VIEW_ENABLED,
              newValue: checked,
            })
          }
          checked={geneRegulationEnhancedSettings?.simplifiedViewEnabled}
          label="Enabled"
        />
        <div className={styles.inputRange}>
          <Slider
            label={geneRegulationEnhancedSettings?.simplifiedViewMinNeighbors}
            disabled={!geneRegulationEnhancedSettings?.simplifiedViewEnabled}
            max={100}
            min={1}
            value={geneRegulationEnhancedSettings?.simplifiedViewMinNeighbors}
            onChange={({ target: { value } }) =>
              geneRegulationEnhancedSettingsChanged({
                settingName: GeneRegulationEnhancedSettingsTypes.SIMPLIFIED_VIEW_MIN_NEIGHBORS,
                newValue: value,
              })
            }
          />
        </div>
      </Field>
    </>
  );
};

const mapStateToProps = ({ settings }) => ({
  geneRegulationEnhancedSettings: settings?.geneRegulationEnhanced ?? {},
  coreSettings: settings?.core ?? {},
});

const mapDispatchToProps = {
  geneRegulationEnhancedSettingsChanged,
  addExperiment,
  removeExperiment,
  updateExperimentWeight,
  runCalculation,
  coreSettingsChanged,
};

const MainContainer = connect(
  mapStateToProps,
  mapDispatchToProps
)(GeneRegulationEnhancedSettings);

export { MainContainer as GeneRegulationEnhancedSettings }; 