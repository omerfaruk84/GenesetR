import {
  Table,
  Field,
  Spacer,
  Select,
  Row,
  Popover,
  Button,
  Card,
} from "@oliasoft-open-source/react-ui-library";
import React, { useEffect, useRef, useState } from "react";
import { connect } from "react-redux";
import { FiDatabase } from "react-icons/fi";
import DropdownTreeSelect from "react-dropdown-tree-select";
//import 'react-dropdown-tree-select/dist/styles.css'
import "./treeview.css";
import data from "./enrichrDatasets.json";
import { runEnrichr } from "../../store/api";
import { genesetEnrichmentSettingsChanged } from "../../store/settings/geneset-enrichment-settings";
import { GeneSetEnrichmentSettingsTypes } from "../../components/side-bar/settings/enums.js";
import ReactEChartsCore from "echarts-for-react/lib/core";
import * as echarts from "echarts/core";
import { ScatterChart, EffectScatterChart, CustomChart } from "echarts/charts";

import {
  GridComponent,
  BrushComponent,
  LegendPlainComponent,
  LegendScrollComponent,
  VisualMapComponent,
  TransformComponent,
  TooltipComponent,
  TitleComponent,
  DataZoomComponent,
  DatasetComponent,
  ToolboxComponent,
} from "echarts/components";
import {
  CanvasRenderer,
  // SVGRenderer,
} from "echarts/renderers";

echarts.use([
  TitleComponent,
  EffectScatterChart,
  LegendPlainComponent,
  LegendScrollComponent,
  CustomChart,
  BrushComponent,
  VisualMapComponent,
  TransformComponent,
  TooltipComponent,
  GridComponent,
  ScatterChart,
  CanvasRenderer,
  DataZoomComponent,
  DatasetComponent,
  ToolboxComponent,
]);

/*
      Mock table data store (real apps should use Redux or similar)
    */
const headings = ["Section", "Width", "Height"];
let keyedData = [...Array(175).keys()].map((_c, i) => ({
  Section: i,
  Width: i * 2,
  Height: i * 2,
}));

const assignObjectPaths = (obj, stack) => {
  Object.keys(obj).forEach((k) => {
    const node = obj[k];
    if (typeof node === "object") {
      node.path = stack ? `${stack}.${k}` : k;
      assignObjectPaths(node, node.path);
    }
  });
};

var checkNode = function (obj, path, value) {
  for (var i = 0, path = path.split("."), len = path.length; i < len; i++) {
    obj = obj[path[i]];
  }
  obj.checked = value;
};
console.log(data);

const onChange = (currentNode, selectedNodes) => {
  console.log("onChange::", currentNode, selectedNodes);
  console.log("Before change: ", data);
  checkNode(data, currentNode.path, currentNode.checked);
  console.log("Before change: ", data);
};
const onAction = (node, action) => {
  console.log("onAction::", action, node);
};

/*
Container component manages state and configuration of table
        */

const TableWithSortAndFilter = ({
  runEnrichr,
  clusters,
  genesetEnrichmentSettingsChanged,
  genesetEnrichmentSettings,
  clusteringSettingsChanged,
}) => {
  assignObjectPaths(data);

  const rowsPerPageOptions = [
    { label: "10 / page", value: 10 },
    { label: "20 / page", value: 20 },
    { label: "50 / page", value: 50 },
    { label: "100 / page", value: 100 },
    { label: "Show all", value: 0 },
  ];

  console.log("We are in tables");
  const clusterNames = Object.keys(clusters);
  console.log(clusterNames);

  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedPage, setSelectedPage] = useState(1);
  const [filters, setFilters] = useState({});
  const [sorts, setSorts] = useState({});

  useEffect(() => {
    setSelectedPage(1);
  }, [filters, sorts]);
  const firstVisibleRow = (selectedPage - 1) * rowsPerPage;
  const lastVisibleRow =
    rowsPerPage === 0 ? keyedData.length - 1 : firstVisibleRow + rowsPerPage;
  const filterAndSortDataRows = (dataRows, filters, sorts) =>
    dataRows
      .filter((row) =>
        Object.keys(filters).every((key) => {
          return filters[key] === ""
            ? true
            : row[key].toString().includes(filters[key]);
        })
      )
      .sort((a, b) =>
        Object.entries(sorts)
          .map(([key, value]) => {
            switch (value) {
              case "up": {
                return a[key] - b[key];
              }
              case "down": {
                return b[key] - a[key];
              }
              default:
                return 0;
            }
          })
          .reduce((a, acc) => a || acc, 0)
      );
  const dataHeaders = (dataRowsKeys, filters, setFilters, sorts, setSorts) => {
    const dataSortCells = dataRowsKeys.map((key) => {
      const sort = Object.keys(sorts).includes(key) ? sorts[key] : "";
      const prettifyHeaderValue = `${key[0].toUpperCase()}${key.slice(1)}`;
      return {
        key,
        value: prettifyHeaderValue,
        hasSort: true,
        sort,
        onSort: () => {
          const newSort = sort === "" ? "up" : sort === "up" ? "down" : "";
          setSorts({ ...sorts, [key]: newSort });
        },
      };
    });
    const dataFilterCells = dataRowsKeys.map((key) => {
      const filterValue = Object.keys(filters).includes(key)
        ? filters[key]
        : "";
      return {
        key,
        value: filterValue,
        type: "Input",
        placeholder: "Filter",
        onChange: (ev) => setFilters({ ...filters, [key]: ev.target.value }),
      };
    });
    return { dataSortCells, dataFilterCells };
  };
  const { dataSortCells, dataFilterCells } = dataHeaders(
    headings,
    filters,
    setFilters,
    sorts,
    setSorts
  );
  const filteredAndSortedData = filterAndSortDataRows(
    keyedData,
    filters,
    sorts
  );
  const dataRows = [
    ...filteredAndSortedData
      .slice(firstVisibleRow, lastVisibleRow)
      .map((dataRow) => {
        const rowsCells = Object.entries(dataRow).map(([key, value]) => ({
          key,
          value,
          type: "Input",
          disabled: true,
        }));
        return {
          cells: rowsCells,
        };
      }),
  ];
  const table = {
    headers: [
      {
        cells: dataSortCells,
      },
      {
        cells: dataFilterCells,
      },
    ],
    rows: dataRows,
    footer: {
      pagination: {
        rowCount: filteredAndSortedData.length,
        selectedPage,
        rowsPerPage: {
          onChange: (evt) => {
            const { value } = evt.target;
            setRowsPerPage(Number(value));
          },
          options: rowsPerPageOptions,
          value: rowsPerPage,
        },
        onSelectPage: (evt) => setSelectedPage(evt),
        small: true,
      },
    },
  };
  return (
    <>
      <div style={{ width: "100%", height: "100%" }}>
        <Row spacing={0} width="100%" height="10%">
          <Field labelLeft labelWidth="130px" label="Select Cluster">
            <Select
              onChange={({ target: { value } }) => {
                runEnrichr(clusters[value], "GO_Molecular_Function_2021");
                console.log(value);
              }}
              /*
          onChange={({ target: { value } }) => genesetEnrichmentSettingsChanged({
            settingName: GeneSetEnrichmentSettingsTypes.DATASETS,
            newValue: value
          })}
          width="auto"
          
           onChange={({ target: { value } }) => clusteringSettingsChanged({
            settingName: ClusteringSettingsTypes.CLUSTERING_METHOD,
            newValue: value
          })}
          options={clusteringMethodOptions}
          value={clusteringSettings?.clusteringMethod}


          onChange={({ target:{ value }}) => {

            console.log("Checking ", value, props.clusters[value]);
            genesetEnrichmentSettingsChanged({
              settingName: GeneSetEnrichmentSettingsTypes.DATASETS,
              newValue: "GO_Molecular_Function_2021"
            });

            genesetEnrichmentSettingsChanged({
              settingName: GeneSetEnrichmentSettingsTypes.GENES,
              newValue: props.clusters[value]
            });
            runEnrichr(props.clusters[value]);
          }}*/

              options={Object.keys(clusters)}
              width={"250px"}
            />
          </Field>
          <Spacer width="16px" />
          <div style={{ marginTop: "5px" }}>
            <Popover
              content={
                <DropdownTreeSelect
                  data={data}
                  onChange={onChange}
                  onAction={onAction}
                  showDropdown="always"
                  className="mdl-demo"
                  //keepChildrenOnSearch={true}
                  //keepOpenOnSelect ={true}
                />
              }
            >
              <Button
                label="Datasets"
                colored
                margin-top={20}
                icon={<FiDatabase />}
              />
            </Popover>
          </div>
        </Row>

        <Row spacing={0} width="100%" height="50%">
          <Table width={"100%"} table={table} />;
        </Row>
      </div>
    </>
  );
};

const mapStateToProps = ({ settings, calcResults }) => ({
  genesetEnrichmentSettings: settings?.genesetEnrichment ?? {},
});

const mapDispatchToProps = {
  genesetEnrichmentSettingsChanged,
  runEnrichr,
};

const MainContainer = connect(
  mapStateToProps,
  mapDispatchToProps
)(TableWithSortAndFilter);

export { MainContainer as TableWithSortAndFilter };
