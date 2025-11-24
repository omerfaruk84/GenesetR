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
  Flex,
  Toggle,
} from "@oliasoft-open-source/react-ui-library";
import React, { useEffect, useRef, useState } from "react";
import GenelistAdd from "../genelist-add";
import { connect } from "react-redux";
import PlaylistAddCircleRoundedIcon from "@mui/icons-material/PlaylistAddCircleRounded";

import { FaCopy, FaDatabase, FaDownload, FaTimesCircle, FaExternalLinkAlt } from "react-icons/fa";
import DropdownTreeSelect from "react-dropdown-tree-select";
//import 'react-dropdown-tree-select/dist/styles.css'
import "./treeview.css";
import data from "./enrichrDatasets.json";
//import { runEnrichr } from "../../store/api";
import { genesetEnrichmentSettingsChanged } from "../../store/settings/geneset-enrichment-settings";
import { useDispatch } from "react-redux";
import { coreSettingsChanged } from "../../store/settings/core-settings";
import { CoreSettingsTypes } from "../side-bar/settings/enums";
import { ROUTES } from "../../common/routes";
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
import { GeneSetEnrichmentSettingsTypes } from "../side-bar/settings/enums";

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
  const dispatch = useDispatch();
  const [keyedData, setkeyedData] = useState([]);
  const [selectedCluster, setselectedCluster] = useState("");
  const [genelistOptions, setGeneListOptions] = useState([]);
  const [showNavigationMenu, setShowNavigationMenu] = useState(false);
  const navigationMenuRef = useRef(null);

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

    // Use tempData if available (for modal preview), otherwise use original data
    const dataToUse = tempData || data;
    
    for (let obj of dataToUse) {
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

        // Sort by adjusted p-value (low to high) as default
        temp.sort((a, b) => {
          const aVal = typeof a["Adjusted p-value"] === 'string' ? parseFloat(a["Adjusted p-value"]) : a["Adjusted p-value"];
          const bVal = typeof b["Adjusted p-value"] === 'string' ? parseFloat(b["Adjusted p-value"]) : b["Adjusted p-value"];
          return aVal - bVal;
        });

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
  const [tempData, setTempData] = useState(null); // Store temporary dataset changes
  const [searchTerm, setSearchTerm] = useState(""); // Search term for filtering

  // Function to handle dataset changes in the modal
  const handleDatasetChange = (currentNode, selectedNodes) => {
    // Create a deep copy of the data for temporary changes
    const dataCopy = JSON.parse(JSON.stringify(tempData || data));
    
    // Update the specific node that was clicked
    checkNode(dataCopy, currentNode.path, currentNode.checked);
    
    // If it's a parent node, also update all children
    if (currentNode.children && currentNode.children.length > 0) {
      const updateChildren = (node, checked) => {
        if (node.children) {
          node.children.forEach(child => {
            child.checked = checked;
            updateChildren(child, checked);
          });
        }
      };
      updateChildren(currentNode, currentNode.checked);
    }
    
    setTempData(dataCopy);
  };

  // Function to filter data based on search term
  const filterData = (data, searchTerm) => {
    if (!searchTerm || !Array.isArray(data)) return data;
    
    const filterNode = (node) => {
      if (!node || !node.label) return null;
      
      const matchesSearch = node.label.toLowerCase().includes(searchTerm.toLowerCase());
      
      if (node.children && Array.isArray(node.children)) {
        const filteredChildren = node.children.map(filterNode).filter(Boolean);
        if (filteredChildren.length > 0 || matchesSearch) {
          return { ...node, children: filteredChildren, expanded: true };
        }
        return null;
      }
      
      return matchesSearch ? node : null;
    };
    
    return data.map(filterNode).filter(Boolean);
  };

  // Function to ensure all nodes are expanded
  const ensureExpanded = (data) => {
    if (!Array.isArray(data)) {
      return data;
    }
    return data.map(node => ({
      ...node,
      expanded: true,
      children: node.children ? ensureExpanded(node.children) : undefined
    }));
  };

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

  const ClusterInfoForm = ({ title, subtitle, value, value2 }) => (
    <>
      <div style={{ width: "400px", height: "100%" }}>
        <Card
          heading={
            <div>
              <Heading marginBottom={0} top>
                {title}
              </Heading>
              <div style={{ color: "green" }}>{subtitle}</div>
            </div>
          }
        >
          <Field label="Enriched Genes">
            <TextArea value={value} cols={100} rows={5} />
          </Field>
          <Field label="Missing Genes (in the cluster but not annotated in this process)">
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
          .replaceAll(" ", "")
          .split(",")
      : [];
  allGenes = [...new Set(allGenes)];
  const dataRows = [
    ...filteredAndSortedData
      .slice(firstVisibleRow, lastVisibleRow)
      .map((dataRow) => {
        const datasetName = dataRow["Dataset"];
        const subdatasetName = dataRow["Term name"];
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
                    subtitle={subdatasetName}
                    value={value.join(", ")}
                    value2={allGenes
                      .filter((x) => !value.includes(x.trim()))
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
    fixedWidth: "100%",
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

  // Update gene list options only when genesets changes
  useEffect(() => {
    if (Object.keys(genesets).length > 0) {
      let tempx = [];
      Object.keys(genesets).forEach((gl) => {
        const geneCount = genesets[gl].trim(",").split(",").length;
        // Filter: Only include gene lists with more than 2 genes and less than or equal to 400 genes
        if (geneCount > 2 && geneCount <= 400) {
          tempx.push({
            label: `${gl} (${geneCount} genes)`,
            value: gl,
            genes: genesets[gl],
          });
        }
      });
      setGeneListOptions(tempx);
      // Always update selectedCluster when genesets change to trigger enrichment analysis
      if (tempx.length > 0) {
        setselectedCluster(tempx[0].value);
      }
    }
  }, [genesets]); // Notice: selectedCluster is no longer in the dependency array here

  // Call performEnrichmentNow only when selectedCluster changes
  useEffect(() => {
    if (selectedCluster) {
      const geneItem = genelistOptions.find(
        (item) => item.value === selectedCluster
      );
      if (geneItem && geneItem.genes) {
        performEnrichmentNow(geneItem.genes);
      }
    }
  }, [selectedCluster]); // Only selectedCluster is tracked here

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

  // Get current genes as a formatted string
  const getCurrentGenes = () => {
    if (!selectedCluster || genelistOptions.length === 0) return "";
    const geneItem = genelistOptions.find((item) => item.value === selectedCluster);
    if (!geneItem) return "";
    
    return geneItem.genes
      .replaceAll("_2", "")
      .split(",")
      .filter((gene) => !gene.trim().startsWith("non-targeting"))
      .map((gene) => gene.trim())
      .join("\n");
  };

  // Handle navigation to different pages with genes
  const handleNavigateWithGenes = (route, dataType = "genes") => {
    const genesString = getCurrentGenes();
    if (!genesString) {
      toast({
        message: {
          type: "Warning",
          icon: true,
          heading: "No Genes Selected",
          content: "Please select a gene list first.",
        },
        autoClose: 2000,
      });
      return;
    }

    // Convert newline-separated genes to the format needed for each component
    // For primary gene list, we use newline-separated format (as components expect)
    const genesForPrimaryList = genesString; // Keep as newline-separated
    const genesForSettings = genesString.split("\n").join(";"); // Semicolon-separated for Redux

    // Determine which setting to update based on route
    let settingToUpdate = null;
    let settingValue = null;
    
    if (route === ROUTES.CORRELATION) {
      // For correlation, primary list is perturbation list when dataType is "pert", otherwise target list
      if (dataType === "pert") {
        settingToUpdate = CoreSettingsTypes.PETURBATION_LIST;
        settingValue = genesForPrimaryList; // Use newline format for primary list
      } else {
        settingToUpdate = CoreSettingsTypes.TARGET_LIST;
        settingValue = genesForPrimaryList; // Use newline format for primary list
      }
      
      // Store in localStorage with route-specific key so new tab can read it
      localStorage.setItem(`pendingGeneList_${route}`, JSON.stringify({
        settingName: settingToUpdate,
        value: settingValue,
        dataType: dataType,
        timestamp: Date.now()
      }));
    } else if (route === ROUTES.DR) {
      // For DR & Clustering, primary list is perturbation list
      settingToUpdate = CoreSettingsTypes.PETURBATION_LIST;
      settingValue = genesForPrimaryList; // Use newline format for primary list
      
      localStorage.setItem(`pendingGeneList_${route}`, JSON.stringify({
        settingName: settingToUpdate,
        value: settingValue,
        timestamp: Date.now()
      }));
    } else if (route === ROUTES.PATHFINDER) {
      // For Path Explorer, primary list is perturbation list
      settingToUpdate = CoreSettingsTypes.PETURBATION_LIST;
      settingValue = genesForPrimaryList; // Use newline format for primary list
      
      localStorage.setItem(`pendingGeneList_${route}`, JSON.stringify({
        settingName: settingToUpdate,
        value: settingValue,
        timestamp: Date.now()
      }));
    }

    // Open in new tab
    const newTab = window.open(route, '_blank');
    
    // Close the dropdown menu
    setShowNavigationMenu(false);
    
    // Show success message
    toast({
      message: {
        type: "Success",
        icon: true,
        heading: "Opening in New Tab",
        content: `Gene list will be copied to the primary gene list in the new tab.`,
      },
      autoClose: 2000,
    });
  };

  // Close navigation menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (navigationMenuRef.current && !navigationMenuRef.current.contains(event.target)) {
        setShowNavigationMenu(false);
      }
    };

    if (showNavigationMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showNavigationMenu]);

  // Handle accepting dataset changes
  const handleAcceptDatasets = () => {
    if (tempData) {
      // Apply the temporary changes to the original data
      Object.assign(data, tempData);
      setTempData(null);
    }
    setdatasetVisible(false);
    
    // Refresh enrichment with new datasets
    if (selectedCluster) {
      const geneItem = genelistOptions.find(
        (item) => item.value === selectedCluster
      );
      if (geneItem && geneItem.genes) {
        performEnrichmentNow(geneItem.genes);
      }
    }
  };

  // Handle canceling dataset changes
  const handleCancelDatasets = () => {
    setTempData(null);
    setdatasetVisible(false);
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
                <div
                  style={{
                    backgroundColor: "white",
                    borderRadius: "12px",
                    padding: "20px",
                    minWidth: "600px",
                    maxWidth: "800px",
                    maxHeight: "80vh",
                    overflow: "auto",
                    boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
                    border: "1px solid #e5e7eb",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "16px",
                      borderBottom: "1px solid #f3f4f6",
                      paddingBottom: "12px",
                    }}
                  >
                    <Heading size="medium" style={{ color: "#1f2937", margin: 0 }}>
                      Select Datasets for Enrichment
                    </Heading>
                    <Button
                      padding
                      colored
                      round
                      small
                      onClick={handleCancelDatasets}
                      icon={<FaTimesCircle />}
                      style={{ backgroundColor: "#f3f4f6", color: "#6b7280" }}
                    />
                  </div>
                  
                  <div style={{ marginBottom: "16px" }}>
                    <div style={{ marginBottom: "8px" }}>
                      <input
                        type="text"
                        placeholder="Search datasets..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "10px 12px",
                          border: "1px solid #e5e7eb",
                          borderRadius: "6px",
                          fontSize: "14px",
                          color: "#374151",
                          backgroundColor: "white",
                          outline: "none",
                          transition: "border-color 0.2s ease, box-shadow 0.2s ease",
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = "#3b82f6";
                          e.target.style.boxShadow = "0 0 0 3px rgba(59, 130, 246, 0.1)";
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = "#e5e7eb";
                          e.target.style.boxShadow = "none";
                        }}
                      />
                    </div>
                    <DropdownTreeSelect
                      data={ensureExpanded(filterData(tempData || data, searchTerm)) || []}
                      onChange={handleDatasetChange}
                      showDropdown="always"
                      className="mdl-demo"
                      keepOpenOnSelect={true}
                      keepChildrenOnSearch={true}
                      mode="multiSelect"
                      showDropdownButton={false}
                      keepTreeOnSearch={true}
                    />
                  </div>
                  
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "flex-end",
                      gap: "12px",
                      marginTop: "16px",
                      borderTop: "1px solid #f3f4f6",
                      paddingTop: "12px",
                    }}
                  >
                    <Button
                      label="Cancel"
                      small
                      onClick={handleCancelDatasets}
                      style={{ 
                        backgroundColor: "#f3f4f6", 
                        color: "#374151",
                        border: "1px solid #d1d5db",
                        padding: "8px 16px",
                        borderRadius: "6px",
                        fontSize: "14px",
                        fontWeight: "500"
                      }}
                    />
                    <Button
                      label="Accept"
                      colored
                      small
                      onClick={handleAcceptDatasets}
                      style={{ 
                        backgroundColor: "#3b82f6", 
                        color: "white",
                        border: "1px solid #2563eb",
                        padding: "8px 16px",
                        borderRadius: "6px",
                        fontSize: "14px",
                        fontWeight: "500"
                      }}
                    />
                  </div>
                </div>
              </Modal>

              <Button
                label="Set Datasets"
                colored
                small
                width={80}
                onClick={() => {
                  // Initialize tempData with current data when opening modal
                  setTempData(JSON.parse(JSON.stringify(data)));
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
                            .replaceAll(" ", "")
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

              {/* Navigation dropdown button */}
              <div ref={navigationMenuRef} style={{ position: "relative", display: "inline-block" }}>
                <Button
                  label="Open in..."
                  colored="info"
                  small
                  width={100}
                  icon={<FaExternalLinkAlt />}
                  onClick={() => setShowNavigationMenu(!showNavigationMenu)}
                />
                {showNavigationMenu && (
                  <div
                    style={{
                      position: "absolute",
                      top: "100%",
                      left: 0,
                      marginTop: "4px",
                      backgroundColor: "white",
                      border: "1px solid #e5e7eb",
                      borderRadius: "6px",
                      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                      zIndex: 1000,
                      minWidth: "200px",
                      overflow: "hidden",
                    }}
                  >
                    <button
                      onClick={() => handleNavigateWithGenes(ROUTES.CORRELATION, "pert")}
                      style={{
                        width: "100%",
                        padding: "10px 16px",
                        textAlign: "left",
                        border: "none",
                        backgroundColor: "transparent",
                        cursor: "pointer",
                        fontSize: "14px",
                        color: "#374151",
                        transition: "background-color 0.2s",
                      }}
                      onMouseEnter={(e) => (e.target.style.backgroundColor = "#f3f4f6")}
                      onMouseLeave={(e) => (e.target.style.backgroundColor = "transparent")}
                    >
                      Correlation
                    </button>
                    <button
                      onClick={() => handleNavigateWithGenes(ROUTES.DR)}
                      style={{
                        width: "100%",
                        padding: "10px 16px",
                        textAlign: "left",
                        border: "none",
                        borderTop: "1px solid #e5e7eb",
                        backgroundColor: "transparent",
                        cursor: "pointer",
                        fontSize: "14px",
                        color: "#374151",
                        transition: "background-color 0.2s",
                      }}
                      onMouseEnter={(e) => (e.target.style.backgroundColor = "#f3f4f6")}
                      onMouseLeave={(e) => (e.target.style.backgroundColor = "transparent")}
                    >
                      DR & Clustering
                    </button>
                    <button
                      onClick={() => handleNavigateWithGenes(ROUTES.PATHFINDER)}
                      style={{
                        width: "100%",
                        padding: "10px 16px",
                        textAlign: "left",
                        border: "none",
                        borderTop: "1px solid #e5e7eb",
                        backgroundColor: "transparent",
                        cursor: "pointer",
                        fontSize: "14px",
                        color: "#374151",
                        transition: "background-color 0.2s",
                      }}
                      onMouseEnter={(e) => (e.target.style.backgroundColor = "#f3f4f6")}
                      onMouseLeave={(e) => (e.target.style.backgroundColor = "transparent")}
                    >
                      Path Explorer
                    </button>
                  </div>
                )}
              </div>
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
};

const MainContainer = connect(
  mapStateToProps,
  mapDispatchToProps
)(GeneSetEnrichmentTable);

export { MainContainer as GeneSetEnrichmentTable };
