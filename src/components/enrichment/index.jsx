import {
  Table,
  Field,
  Spacer,
  Select,
  Row,
  Popover,
  Button,
  Card,
  toast,
  Heading,
  TextArea,
  Modal,
  Dialog,
  InputGroup,
  Flex,
  Label,
  Toggle,
} from "@oliasoft-open-source/react-ui-library";
import React, { useEffect, useRef, useState } from "react";
import GenelistAdd from "../genelist-add";
import { connect } from "react-redux";
import PlaylistAddCircleRoundedIcon from "@mui/icons-material/PlaylistAddCircleRounded";

import { FaCopy, FaDatabase, FaDownload, FaTimesCircle } from "react-icons/fa";
import DropdownTreeSelect from "react-dropdown-tree-select";
//import 'react-dropdown-tree-select/dist/styles.css'
import "./treeview.css";
import data from "./enrichrDatasets.json";
//import { runEnrichr } from "../../store/api";
import { genesetEnrichmentSettingsChanged } from "../../store/settings/geneset-enrichment-settings";
import ReactEChartsCore from "echarts-for-react/lib/core";
import * as echarts from "echarts/core";
import { ScatterChart, EffectScatterChart, CustomChart } from "echarts/charts";
import { performEnrichment } from "./enrichrAPI";
import { saveAs } from "file-saver";
import { CopyToClipboard } from "react-copy-to-clipboard";

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
import { SmsSharp } from "@mui/icons-material";
import {
  GeneSetEnrichmentSettingsTypes,
  GenelistCompareSettingsTypes,
} from "../side-bar/settings/enums";

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

const onChange = (currentNode, selectedNodes) => {
  checkNode(data, currentNode.path, currentNode.checked);
};

/*
Container component manages state and configuration of table
        */

const GeneSetEnrichmentTable = ({
  //runEnrichr,
  genesets,
  genesetEnrichmentSettingsChanged,
  genesetEnrichmentSettings,
  //clusteringSettingsChanged,
}) => {
  console.log(genesets);
  assignObjectPaths(data);
  const [keyedData, setkeyedData] = useState([]);
  const [selectedCluster, setselectedCluster] = useState("");
  const [genelistOptions, setGeneListOptions] = useState([]);

  //Rank, Term name, P-value, Z-score, Combined score, Overlapping genes, Adjusted p-value, Old p-value, Old adjusted p-value
  const headings = [
    "Dataset",
    "Rank",
    "Term name",
    "P-value",
    "Z-score",
    "Combined score",
    "Adjusted p-value",
    "GC",
  ];

  let temp = [{}];

  function findCheckedLeaves(node) {
    // Initialize an array to hold the labels of checked leaf nodes
    let checkedLeaves = [];
    // Check if the node is a leaf and if it is checked
    if (!node.children && node.checked) {
      // If it is, add its label to the array
      checkedLeaves.push(node.label);
    }

    // If the node has children, repeat the process for each child
    if (node.children) {
      for (let child of node.children) {
        // Call the function recursively and merge the result with the current array
        checkedLeaves = checkedLeaves.concat(findCheckedLeaves(child));
      }
    }

    // Return the array of checked leaf labels
    return checkedLeaves;
  }

  const performEnrichmentNow = function (genes) {
    let selectedDatasets = [];

    for (let obj of data) {
      selectedDatasets = selectedDatasets.concat(findCheckedLeaves(obj));
    }

    performEnrichment(genes, selectedDatasets.join().replaceAll(" ", "_"))
      .then((results) => {
        temp.length = 0;
        for (let i in results) {
          for (let j in results[i].data) {
            temp.push({
              Dataset: results[i].name.replaceAll("_", " "),
              Rank: results[i].data[j][0],
              "Term name":
                results[i].data[j][1].charAt(0).toUpperCase() +
                results[i].data[j][1].slice(1).split("(")[0],
              "P-value":
                results[i].data[j][2] > 0.001
                  ? results[i].data[j][2].toFixed(5)
                  : results[i].data[j][2].toExponential(2),
              "Z-score": results[i].data[j][3].toFixed(1),
              "Combined score": results[i].data[j][4].toFixed(1),
              "Adjusted p-value":
                results[i].data[j][6] > 0.001
                  ? results[i].data[j][6].toFixed(5)
                  : results[i].data[j][6].toExponential(2),
              GC: results[i].data[j][5],
            });
          }
        }

        temp.sort((a, b) => b["Combined score"] - a["Combined score"]);

        setkeyedData(temp);
      })
      .catch((error) => {
        toast({
          message: {
            type: "Error",
            icon: true,
            heading: "Enrichr",
            content: "Sorry. Enrichr servers are not responding." + error,
          },
          autoClose: 2000,
        });
      });
  };

  const rowsPerPageOptions = [
    { label: "10 / page", value: 10 },
    { label: "20 / page", value: 20 },
    { label: "50 / page", value: 50 },
    { label: "100 / page", value: 100 },
    { label: "Show all", value: 0 },
  ];

  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedPage, setSelectedPage] = useState(1);
  const [filters, setFilters] = useState({});
  const [sorts, setSorts] = useState({});
  const [newListVisible, setNewListVisible] = useState(false);
  const [genesToSave, setgenesToSave] = useState("");
  const [datasetVisible, setdatasetVisible] = useState(false);

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
            : row[key]?.toString().includes(filters[key]);
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

  const ClusterInfoForm = ({ title, value, value2 }) => (
    <>
      <div style={{ width: "400px", height: "100%" }}>
        <Card heading={<Heading top> {title} </Heading>}>
          <Field label="Enriched Genes">
            <TextArea value={value} cols={100} rows={5} />
          </Field>
          <Field label="Missing Genes">
            <TextArea value={value2} cols={100} rows={5} />
          </Field>
        </Card>
      </div>
    </>
  );
  //let allGenes = selectedCluster?clusters[selectedCluster?.split(" (")[0]]?.split(","):[]

  let allGenes =
    selectedCluster && genelistOptions.length > 0
      ? genelistOptions
          .find((item) => item?.value === selectedCluster)
          .genes?.replaceAll("_2", "")
          .split(",")
      : [];
  const dataRows = [
    ...filteredAndSortedData
      .slice(firstVisibleRow, lastVisibleRow)
      .map((dataRow) => {
        const datasetName = dataRow["Dataset"];
        const rowsCells = Object.entries(dataRow).map(([key, value]) =>
          key === "GC"
            ? {
                key: "GC",
                value: value.length,
                tooltip: value.join(", "),
                type: "Popover",
                content: (
                  <ClusterInfoForm
                    title={datasetName}
                    value={value.join(", ")}
                    value2={allGenes
                      .filter(
                        (x) => !value.includes(x) && !value.includes(x + "_2")
                      )
                      .join(", ")}
                  />
                ),
                //type: "Input",
                //disabled: false,
              }
            : {
                key,
                value,
                //type: "Input",
                //disabled: true,
              }
        );

        return {
          cells: rowsCells,

          //onRowMouseEnter: () => setDisplayText('Genes ' + identified + "\nMissing: " + distinctValues),
          //onRowMouseLeave: () => setDisplayText(''),
        };
      }),
  ];
  const table = {
    fixedWidth: "850px",
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
      actions: [
        {
          icon: <FaDownload />,
          label: "Download",
          disabled: keyedData === undefined,
          onClick: () => {
            const csvData =
              headings.join("\t") +
              "\n" +
              keyedData
                .map((item) => Object.values(item).join("\t"))
                .join("\n");
            // Create a blob with the data
            const blob = new Blob([csvData], {
              type: "text/plain;charset=utf-8",
            });

            // Save the blob as a file using FileSaver.js
            saveAs(blob, "data.tsv");
          },
        },
      ],
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

  const [options, setOptions] = useState({});

  function copyGenes(text) {
    return new Promise((resolve, reject) => {
      if (
        typeof navigator !== "undefined" &&
        typeof navigator.clipboard !== "undefined" &&
        navigator.permissions !== "undefined"
      ) {
        const type = "text/plain";
        const blob = new Blob([text], { type });
        const data = [new ClipboardItem({ [type]: blob })];
        navigator.permissions
          .query({ name: "clipboard-write" })
          .then((permission) => {
            if (
              permission.state === "granted" ||
              permission.state === "prompt"
            ) {
              navigator.clipboard
                .write(data)
                .then(resolve, reject)
                .catch(reject);
            } else {
              reject(new Error("Permission not granted!"));
            }
          });
      } else if (
        document.queryCommandSupported &&
        document.queryCommandSupported("copy")
      ) {
        var textarea = document.createElement("textarea");
        textarea.textContent = text;
        textarea.style.position = "fixed";
        textarea.style.width = "2em";
        textarea.style.height = "2em";
        textarea.style.padding = 0;
        textarea.style.border = "none";
        textarea.style.outline = "none";
        textarea.style.boxShadow = "none";
        textarea.style.background = "transparent";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        try {
          document.execCommand("copy");
          document.body.removeChild(textarea);
          resolve();
        } catch (e) {
          document.body.removeChild(textarea);
          reject(e);
        }
      } else {
        reject(
          new Error("None of copying methods are supported by this browser!")
        );
      }
    });
  }

  useEffect(() => {
    const bubbleGraphData = [];

    for (let data in keyedData) {
      if (keyedData[data]["Adjusted p-value"] < 0.05) {
        const objClone = {
          "Adjusted log p-value": (-Math.log10(
            keyedData[data]["Adjusted p-value"]
          )).toFixed(2),
          "p-value": -Math.log10(keyedData[data]["P-value"]),
          "Combined score": keyedData[data]["Combined score"],
          "Z-score": keyedData[data]["Z-score"], // Math.log(keyedData[data]['Z-score'],10),
          "Term name": keyedData[data]["Term name"],
          Genes: keyedData[data]["GC"],
          Dataset: keyedData[data]["Dataset"],
        };

        bubbleGraphData.push(objClone);
      }
    }

    if (bubbleGraphData.length < 3) {
    }

    setOptions({
      dataset: {
        dimensions: [
          "Z-score",
          "Adjusted log p-value",
          "Combined score",
          "Term name",
        ],
        source: bubbleGraphData,
      },
      grid: {
        right: "15%",
      },
      /* legend: {
              right: 10,
              data: ['1990', '2015']
          },*/
      toolbox: {
        show: true,
        feature: {
          dataZoom: {},
          mark: { show: true },
          saveAsImage: { show: true, pixelRatio: 3 },
        },
      },
      visualMap: [
        {
          left: "right",
          top: "10%",
          dimension: 1,
          min: 0,
          max: 20,
          itemWidth: 30,
          itemHeight: 120,
          calculable: true,
          precision: 0.1,
          text: ["P Value"],
          textGap: 10,
          inRange: {
            symbolSize: [10, 70],
          },
          outOfRange: {
            symbolSize: [10, 0],
            color: ["rgba(255,255,255,0.4)"],
          },
          controller: {
            inRange: {
              color: ["#c23531"],
            },
            outOfRange: {
              color: ["#999"],
            },
          },
        },
        {
          left: "right",
          bottom: "10%",
          dimension: 0,
          min: 100,
          max: 1000,
          itemWidth: 30,
          itemHeight: 120,
          calculable: true,
          precision: 0.1,
          text: ["Combined\nScore"],
          textGap: 10,
          inRange: {
            colorLightness: [0.9, 0.3],
          },
          outOfRange: {
            color: ["rgba(255,255,255,0.4)"],
          },
          controller: {
            inRange: {
              color: ["#c23531"],
            },
            outOfRange: {
              color: ["#999"],
            },
          },
        },
      ],

      xAxis: {
        splitLine: {
          lineStyle: {
            type: "dashed",
          },
        },
        nameLocation: "center",
        nameTextStyle: {
          fontWeight: "bold",
          fontSize: "14",
        },
        name: "Z Score",
        nameGap: 25,
      },
      yAxis: {
        splitLine: {
          lineStyle: {
            type: "dashed",
          },
        },
        nameRotate: 90,
        scale: true,
        name: "-log 10 (Adjusted p Value)",
        nameLocation: "center",
        nameGap: 35,
        nameTextStyle: {
          fontWeight: "bold",
          fontSize: "14",
          verticalAlign: "center",
        },
      },
      series: [
        {
          //name: '1990',
          type: "scatter",
          symbolSize: function (data) {
            return Math.sqrt(data["Combined Score"]);
          },
          emphasis: {
            label: {
              show: true,
              backgroundColor: "black",
              color: "white",
              formatter: function (param) {
                return param.data["Term name"];
              },
              position: "top",
              fontSize: "12",
              //borderColor:'black',
              //borderWidth:2,
            },
          },
          labelLayout: {
            align: "center",
            hideOverlap: true,
            moveOverlap: "shiftY",
            draggable: true,
          },

          label: {
            textBorderColor: "black",
            show: true,
            overflow: "truncate",
            distance: 15,
            width: 300,
            fontSize: "12",
            formatter: function (param) {
              let maxVis = Math.min(10, bubbleGraphData.length);
              if (
                param.data &&
                param.data["Adjusted log p-value"] > 2 &&
                param.data["Adjusted log  p-value"] >
                  bubbleGraphData[maxVis]["Adjusted log  p-value"]
              ) {
                return param.data["Term name"];
              } else return "";
            },
            minMargin: 10,
            position: "top",
          },
          itemStyle: {
            //shadowBlur: 10,
            //shadowColor: 'rgba(120, 36, 50, 0.5)',
            //shadowOffsetY: 5,
            color: "red",
            borderWidth: 1,
            borderColor: "gray",
            /*color: new echarts.graphic.RadialGradient(0.4, 0.3, 1, [{
                      offset: 0,
                      color: 'rgb(170, 120, 60)'
                  }, {
                      offset: 1,
                      color: 'rgb(0, 0, 0)'
                  }])*/
          },
        },
      ],
    });

    setOptions2({
      dataset: {
        dimensions: [
          "Term name",
          "Z-score",
          "Adjusted log p-value",
          "Combined score",
        ],
        source: bubbleGraphData,
      },

      tooltip: {
        trigger: "axis",
        axisPointer: {
          type: "shadow",
        },
      },

      toolbox: {
        show: true,
        feature: {
          dataZoom: {},
          mark: { show: true },
          saveAsImage: { show: true, pixelRatio: 3 },
        },
      },

      xAxis: [
        {
          type: "value",
          position: "bottom",
          inverse: true,
          name: "Z-score",
          nameLocation: "center",
          nameTextStyle: {
            fontWeight: "bold",
            fontSize: "14",
          },
          nameGap: 25,
        },
        {
          type: "value",
          position: "top",
          inverse: true,
          name: "Adjusted log p-value",
          nameLocation: "center",
          nameTextStyle: {
            fontWeight: "bold",
            fontSize: 14,
          },
          nameGap: 30,

          axisLine: { show: true }, // Hide axis line for Adjusted p-value
          axisTick: { show: true }, // Hide axis ticks for Adjusted p-value
          axisLabel: { show: true }, // Optionally hide labels for clarity
        },
      ],

      grid: {
        right: "50%",
      },

      yAxis: {
        inverse: true,
        splitLine: {
          lineStyle: {
            type: "dashed",
          },
        },
        axisLabel: {
          margin: 10, // Adjusts the space between the labels and the axis line
          // Other properties like rotate, formatter, etc., can also be adjusted here
        },
        type: "category",
        nameRotate: 90,
        position: "right",
        data: bubbleGraphData.map((item) => item["Term name"]), // Assuming bubbleGraphData is an array of objects
        //scale: true,
      },
      dataZoom: [
        {
          show: true,
          xAxisIndex: [0, 1], // Apply to both X-axes
          start: 0,
          end: 100,
          filterMode: "none",
          bottom: 5,
        },

        {
          startValue: 0,
          endValue: 16,
          minValueSpan: 6,
          maxValueSpan: 30,
          show: true,
          yAxisIndex: 0,
          //filterMode: "empty",
          width: 30,
          height: "80%",
          showDataShadow: true,
          left: "93%",
          filterMode: "filter",
        },
      ],
      series: [
        {
          name: "Z-score",
          type: "bar",
          xAxisIndex: 0, // Use first xAxis for Z-score
          data: bubbleGraphData.map((item) => item["Z-score"]),
          label: {
            show: true,
          },
        },
        {
          name: "Adjusted log p-value",
          type: "scatter",
          xAxisIndex: 1, // Use second xAxis for Adjusted p-value
          symbolSize: 7, // Adjust as needed
          data: bubbleGraphData.map((item) => item["Adjusted log p-value"]),
        },
      ],
    });
  }, [keyedData]);

  const [options2, setOptions2] = useState({});
  //In the first run set the selected cluter to cluster 0
  useEffect(() => {
    if (Object.keys(genesets).length > 0) {
      let tempx = [];
      Object.keys(genesets).forEach((gl) => {
        if (genesets[gl].trim(",").split(",").length > 2)
          tempx.push({
            label:
              gl + " (" + genesets[gl].trim(",").split(",").length + " genes)",
            value: gl,
            genes: genesets[gl],
          });
      });

      setGeneListOptions(tempx);
      if (tempx.length > 0 && selectedCluster === tempx[0].value) {
        performEnrichmentNow(tempx[0].genes);
      }
      if (tempx.length > 0) setselectedCluster(tempx[0].value);
      //performEnrichmentNow(genesets[Object.keys(genesets)[0]]);
    }

    // setselectedCluster(Object.keys(clusters)[0] +  " ("+ clusters[Object.keys(clusters)[0]].trim(',').split(',').length + " genes)");
    // performEnrichmentNow(clusters[Object.keys(clusters)[0]]);
  }, [genesets]);

  useEffect(() => {
    let genesToEnrich = genelistOptions.find(
      (item) => item.value === selectedCluster
    )?.genes;
    genesToEnrich && performEnrichmentNow(genesToEnrich);
  }, [selectedCluster]);

  const handleSaveGeneList = () => {
    let genesString = selectedCluster
      ? genelistOptions
          .find((item) => item.value === selectedCluster)
          .genes.replaceAll("_2", "")
          .split(",")
          .filter((gene) => !gene.trim().startsWith("non-targeting"))
          .join(",")
      : "";

    if (genesString.length > 2) {
      setgenesToSave(genesString);
      setNewListVisible(true);
    }
  };

  return (
    <>
      <div
        style={{
          display: "block",
          marginLeft: "auto",
          marginRight: "auto",
          width: "95%",
        }}
      >
        <Card heading={<Heading>Enrichment</Heading>}>
          <Row spacing={0} width="100%" height="10%">
            {genelistOptions.length > 1 ? (
              <>
                <Field labelLeft labelWidth="100px" label="Select Gene List">
                  <Select
                    searchable
                    small
                    onChange={({ target: { value } }) => {
                      setselectedCluster(value);
                    }}
                    options={genelistOptions}
                    width={"250px"}
                    value={selectedCluster}
                  />
                </Field>
                <Spacer width="12px" />
              </>
            ) : null}
            <div
              style={{
                borderColor: "orange",
                alignItems: "flex-start",
                display: "flex",
                flexDirection: "row",
              }}
            >
              <Modal centered={true} visible={datasetVisible}>
                <Flex flex direction={"column"}>
                  <div
                    style={{
                      backgroundColor: "white",
                      border: "solid",
                      borderColor: "orange",
                      alignItems: "flex-end",
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    <div
                      style={{
                        backgroundColor: "white",
                        alignItems: "flex-end",
                        display: "flex",
                        padding: "2px",
                      }}
                    >
                      <Button
                        padding
                        colored
                        round
                        small
                        margin-top={20}
                        onClick={() => {
                          setdatasetVisible(false);
                        }}
                        icon={<FaTimesCircle />}
                      />
                    </div>
                    <DropdownTreeSelect
                      data={data}
                      onChange={onChange}
                      //onAction={onAction}
                      showDropdown="always"
                      className="mdl-demo"
                      //keepChildrenOnSearch={true}
                      //keepOpenOnSelect ={true}
                    />
                  </div>
                </Flex>
              </Modal>

              <Button
                label="Set Datasets"
                colored
                small
                width={80}
                onClick={() => {
                  setdatasetVisible(true);
                }}
                icon={<FaDatabase />}
              />
              <Spacer width="6px" />
              <CopyToClipboard
                text={
                  selectedCluster && genelistOptions.length > 0
                    ? genelistOptions
                        .find((item) => item.value === selectedCluster)
                        .genes.replaceAll("_2", "")
                        .split(",")
                        .filter(
                          (gene) => !gene.trim().startsWith("non-targeting")
                        )
                        .join("\n")
                    : ""
                }
              >
                <Button
                  small
                  label="Copy Genes"
                  colored="success"
                  icon={<FaCopy />}
                  width={80}
                />
              </CopyToClipboard>

              <Spacer width="6px" />

              <Button
                label="Create Genelist"
                colored="danger"
                width={80}
                small
                onClick={handleSaveGeneList}
                icon={<PlaylistAddCircleRoundedIcon />}
              />
              {newListVisible && (
                <GenelistAdd
                  genes={genesToSave}
                  setNewListVisible={setNewListVisible}
                />
              )}

              <Spacer width="6px" />

              <Popover
                closeOnOutsideClick
                content={
                  <TextArea
                    rows={10}
                    value={
                      selectedCluster && genelistOptions.length > 0
                        ? genelistOptions
                            .find((item) => item.value === selectedCluster)
                            .genes.replaceAll("_2", "")
                            .split(",")
                            .filter(
                              (gene) => !gene.trim().startsWith("non-targeting")
                            )
                            .join("\n")
                        : ""
                    }
                  />
                }
                overflowContainer
                showCloseButton
              >
                <Button
                  label="List of Genes"
                  colored="danger"
                  small
                  width={80}
                  icon={<PlaylistAddCircleRoundedIcon />}
                />
              </Popover>
              <Spacer width="6px" />
              <Toggle
                label="Bar Graph"
                checked={genesetEnrichmentSettings.isBargraph}
                onChange={({ target: { checked } }) =>
                  genesetEnrichmentSettingsChanged({
                    settingName: GeneSetEnrichmentSettingsTypes.ISBARGRAPH,
                    newValue: checked,
                  })
                }
              />
            </div>
          </Row>

          <Row spacing={0} width="100%" height="70%">
            <div style={{ width: "100%", height: "100%" }}>
              <ReactEChartsCore
                echarts={echarts}
                option={
                  genesetEnrichmentSettings.isBargraph ? options2 : options
                }
                style={{ height: "60VH", width: "100%" }}
                notMerge={true}
                lazyUpdate={true}
              />
            </div>
          </Row>
          <div
            style={{
              overflowX: "auto",
              display: "block",
              marginLeft: "auto",
              marginRight: "auto",
              marginTop: "20px",
              width: "100%",
            }}
          >
            <Table table={table} />;
          </div>
        </Card>
      </div>
    </>
  );
};

const mapStateToProps = ({ settings, calcResults }) => ({
  genesetEnrichmentSettings: settings?.genesetEnrichment ?? {},
});

const mapDispatchToProps = {
  genesetEnrichmentSettingsChanged,
  performEnrichment,
};

const MainContainer = connect(
  mapStateToProps,
  mapDispatchToProps
)(GeneSetEnrichmentTable);

export { MainContainer as GeneSetEnrichmentTable };
