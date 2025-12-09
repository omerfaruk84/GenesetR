import React, { useCallback, useRef, useEffect } from "react";
import { connect } from "react-redux";
import {
  Field,
  Select,
  CheckBox,
  Flex,
  Button,
  Spacer,
  Text,
} from "@oliasoft-open-source/react-ui-library";
import { coreSettingsChanged } from "../../../store/settings/core-settings";
import { CoreSettingsTypes } from "./enums";
import { useLocation } from "react-router-dom";
import { Genelist } from "../../genelist/index";
import { DatasetSelector } from "../../dataset-selector";
import { ROUTES } from "../../../common/routes";

const CoreSettings = ({
  coreSettings,
  tsneResults,
  umapResults,
  mdeResults,
  pcaResults,
  coreSettingsChanged,
  module,
  SettingsSelector,
  showcellLineOptions = true,
  showPerturbationList = true,
  showGeneList = true,
  showdataTypeOptions = true,
  showgraphTypeOptions = true,
  isGeneSignature = false,
  geneListTitle = "Genes",
  perturbationListTitle = "Perturbations",
  source = "",
  wholeGenomeOnly = false,
}) => {
  const childRef = React.useRef();

  const dataTypeOptions = [
    {
      label: "Perturbation",
      value: "pert",
    },
    {
      label: "Gene Expression",
      value: "genes",
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

  let helpText1 =
    "Please enter a minimum of 2 targets (seperated by comma, new line, space, or semicolon) to perform correlation analysis";
  let helpText2 =
    "Please enter a minimum of 20 genes (seperated by comma, new line, space, or semicolon) to perform correlation analysis based on a specific subset of detected genes. If the field is left empty or fewer than 20 genes are entered, the analysis will be performed using all detected genes.";

  if (coreSettings?.dataType === "pert" || source === "HEATMAP") {
    perturbationListTitle = "Perturbations";
    geneListTitle = "Genes";
  } else {
    perturbationListTitle = "Genes";
    geneListTitle = "Perturbations";
  }

  if (source === "DR") {
    helpText1 = helpText1.replace("correlation", "dimensionality reduction");
    helpText1 = helpText1.replace("2 targets", "10 targets");
    helpText2 = helpText2.replace("correlation", "dimensionality reduction");
  } else if (isGeneSignature) {
    helpText2 =
      "Please input your gene signature, designating each gene by a plus (+) or minus (-) symbol.";
    geneListTitle = "Gene Signature";
  } else if (source === "PATHFINDER") {
    helpText1 =
      "Please enter a minimum of 2 downregulated genes (or genes from a CRISPR screen for instance) seperated by comma, new line, space, or semicolon. More than 200 genes may stall your browser.";
    helpText2 =
      "[OPTIONAL] Please enter upregulated genes seperated by comma, new line, space, or semicolon. More than 200 genes may stall your browser.";
    perturbationListTitle = "Downregulated Genes";
    geneListTitle = "Upregulated Genes";
  } else if (source === "") {
    helpText1 =
      "Please enter the target genes seperated by comma, new line, space, or semicolon.";
    helpText2 =
      "Please enter the genes seperated by comma, new line, space, or semicolon.";
  }

  if (coreSettings?.dataType !== "pert") {
    helpText1 = helpText1.replace("targets", "genes");
    helpText1 = helpText1.replace("genes", "targets");
    helpText2 = helpText2.replaceAll("detected genes", "perturbations");
  }

  var location = useLocation().pathname;

  const setPerturbationList = useCallback(
    (value) => {
      coreSettingsChanged({
        settingName: CoreSettingsTypes.PETURBATION_LIST,
        newValue: value,
      });
    },
    [coreSettingsChanged]
  );

  const setGeneList = useCallback(
    (value) => {
      coreSettingsChanged({
        settingName: CoreSettingsTypes.TARGET_LIST,
        newValue: value,
      });
    },
    [coreSettingsChanged]
  );
  var isMixscape = coreSettings?.cellLine.isMixscape;
  useEffect(() => {
    isMixscape = coreSettings?.cellLine.isMixscape;
  }, [coreSettings?.cellLine.isMixscape]);

  var graphData = undefined;
  if (coreSettings?.currentModule === "tsne") graphData = tsneResults;
  else if (coreSettings?.currentModule === "umap") graphData = umapResults;
  else if (coreSettings?.currentModule === "pca") graphData = pcaResults;
  else if (coreSettings?.currentModule === "mde") graphData = mdeResults;

  // Reset datasetAdded flag when a new calculation is made (different taskID)
  useEffect(() => {
    if (graphData?.taskID && graphData.taskID !== coreSettings?.lastTaskID) {
      coreSettingsChanged({
        settingName: CoreSettingsTypes.LAST_TASK_ID,
        newValue: graphData.taskID,
      });
      coreSettingsChanged({
        settingName: CoreSettingsTypes.DATASET_ADDED,
        newValue: false,
      });
    }
  }, [graphData?.taskID, coreSettings?.lastTaskID, coreSettingsChanged]);

  return (
    <>
      <div style={{ display: showcellLineOptions === true ? "block" : "none" }}>
        <DatasetSelector
          ref={childRef}
          onlyMain={
            location === ROUTES.CORRELATION || location === ROUTES.HEATMAP
          }
          wholeGenomeOnly={wholeGenomeOnly}
        />{" "}
        <Spacer height={5} />
      </div>
      {graphData && location === ROUTES.DR && !coreSettings?.datasetAdded ? (
        <>
          <Button
            colored="success"
            width="100%"
            label="ADD DR RESULTS TO DATASETS"
            onClick={() => {
              const drMethod = coreSettings?.currentModule?.toUpperCase() || "DR";
              const newName = `${drMethod} - ${graphData.taskName}`;
              childRef?.current?.saveDataset(
                graphData.taskID,
                newName,
                graphData.dataset,
                graphData.resultShape,
                graphData.dataType
              );
              coreSettingsChanged({
                settingName: CoreSettingsTypes.DATASET_ADDED,
                newValue: true,
              });
            }}
            small
          />
          <Spacer height={10} />
        </>
      ) : (
        ""
      )}
      <div
        style={{
          marginTop: "10px",
          display: showdataTypeOptions === true ? "block" : "none",
        }}
      >
        <Field
          label="Data Type"
          labelLeft
          labelWidth="80px"
          helpText="Datatype that analyzes will be performed on."
        >
          <Select
            onChange={({ target: { value } }) =>
              coreSettingsChanged({
                settingName: CoreSettingsTypes.DATA_TYPE,
                newValue: value,
              })
            }
            disabled={coreSettings?.cellLine.id?.length > 27}
            options={dataTypeOptions}
            value={coreSettings?.dataType}
          />
        </Field>
      </div>
      <div
        style={{
          display: isMixscape === true ? "block" : "none",
        }}
      >
        <Flex gap="35px" marginBottom="10px">
          <Field
            labelLeft
            label="Perturbed Cells"
            helpText="Mean experssion based on cells identified as perturbed in Mixscape analyses (GeneSymbol_P)."
          >
            <CheckBox
              disabled={true}
              small
              onChange={({ target: { checked } }) =>
                coreSettingsChanged({
                  settingName: CoreSettingsTypes.MIXSCAPE_PERTURBED,
                  newValue: checked,
                })
              }
              checked={coreSettings?.mixscapePerturbed}
            />
          </Field>
          <Field
            labelLeft
            label="All Cells"
            helpText="Mean experssion based on all cells (GeneSymbol_All)."
          >
            <CheckBox
              small
              disabled={true}
              onChange={({ target: { checked } }) =>
                coreSettingsChanged({
                  settingName: CoreSettingsTypes.MIXSCAPE_ALL,
                  newValue: checked,
                })
              }
              checked={coreSettings?.mixscapeAll}
            />
          </Field>
        </Flex>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <Text warning center>
            Some of the datasets were anlyzed using Mixscape method. In these
            datasets, cells are grouped as either "_P" (pertubed) or "_All" (all
            cells whether identifed perturbed or not). Check boxes above are
            currently disabled, but will be enabled in the near future.
          </Text>
        </div>
      </div>
      <div
        style={{ display: showPerturbationList === true ? "block" : "none" }}
      >
        <Genelist
          textTooltip={helpText1}
          listTitle={perturbationListTitle}
          setPerturbationList={setPerturbationList}
          isPerturbationList={coreSettings?.dataType === "pert"}
        />
      </div>
      <div style={{ display: showGeneList === true ? "block" : "none" }}>
        <Genelist
          textTooltip={helpText2}
          listTitle={geneListTitle}
          setPerturbationList={setGeneList}
          isPerturbationList={!coreSettings?.dataType === "pert"}
          isGeneSignature={isGeneSignature}
        />
      </div>
      <div
        style={{ display: showgraphTypeOptions === true ? "block" : "none" }}
      >
        <Field
          label="Graph Type"
          labelLeft
          labelWidth="80px"
          helpText="Style of scatter graph."
        >
          <Select
            onChange={({ target: { value } }) =>
              coreSettingsChanged({
                settingName: CoreSettingsTypes.GRAPH_TYPE,
                newValue: value,
              })
            }
            options={graphTypeOptions}
            value={coreSettings?.graphType}
          />
        </Field>
      </div>
    </>
  );
};

const mapStateToProps = ({ settings, calcResults }) => ({
  coreSettings: settings?.core ?? {},
  currentGraph: calcResults?.currentGraph ?? null,
  tsneResults: calcResults?.["tsneGraph"]?.result ?? null,
  mdeResults: calcResults?.["mdeGraph"]?.result ?? null,
  pcaResults: calcResults?.["pcaGraph"]?.result ?? null,
  umapResults: calcResults?.["umapGraph"]?.result ?? null,
});

const mapDispatchToProps = {
  coreSettingsChanged,
};

const MainContainer = connect(
  mapStateToProps,
  mapDispatchToProps
)(CoreSettings);

export { MainContainer as CoreSettings };
