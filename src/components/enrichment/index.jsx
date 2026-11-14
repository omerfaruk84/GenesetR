import { pdfToolboxFeature, svgToolboxFeature } from "../../utils/exporters";
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
import { SendToMenu } from "../send-to";
import { withErrorBoundary } from "../error-boundary";

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

// Gene-count limits accepted for an enrichment run (inclusive).
const MIN_ENRICHMENT_GENES = 3;
const MAX_ENRICHMENT_GENES = 400;

const countGenes = (genes) =>
  String(genes || "")
    .split(",")
    .map((g) => g.trim())
    .filter(Boolean).length;

// Numeric when both values are numbers (or numeric strings such as "1.2e-5"),
// text otherwise; arrays (overlapping genes) compare by length.
const compareCells = (a, b) => {
  const av = Array.isArray(a) ? a.length : a;
  const bv = Array.isArray(b) ? b.length : b;
  const an = typeof av === "number" ? av : parseFloat(av);
  const bn = typeof bv === "number" ? bv : parseFloat(bv);
  const aIsNum = Number.isFinite(an) && String(av).trim() !== "" && !Number.isNaN(Number(av));
  const bIsNum = Number.isFinite(bn) && String(bv).trim() !== "" && !Number.isNaN(Number(bv));
  if (aIsNum && bIsNum) return an - bn;
  return String(av ?? "").localeCompare(String(bv ?? ""), undefined, {
    numeric: true,
    sensitivity: "base",
  });
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
  assignObjectPaths(data);
  const dispatch = useDispatch();
  const [keyedData, setkeyedData] = useState([]);
  const [selectedCluster, setselectedCluster] = useState("");
  const [genelistOptions, setGeneListOptions] = useState([]);
  const [limitNotice, setLimitNotice] = useState("");
  const [showNavigationMenu, setShowNavigationMenu] = useState(false);
  const navigationMenuRef = useRef(null);
  // Monotonic id of the latest enrichment request; older responses are ignored.
  const enrichmentRequestRef = useRef(0);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Currently selected gene list (undefined when the selection is stale).
  const selectedGeneItem = genelistOptions.find(
    (item) => item?.value === selectedCluster
  );
  const selectedGenesRaw = selectedGeneItem?.genes || "";

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
    // A library listed under two categories must only be queried once.
    selectedDatasets = Array.from(new Set(selectedDatasets));

    // Only the most recent request may update the view; a slower, older
    // request must never overwrite the results of the list selected now.
    const requestId = ++enrichmentRequestRef.current;
    const isCurrent = () =>
      isMountedRef.current && enrichmentRequestRef.current === requestId;

    if (selectedDatasets.length === 0) {
      setkeyedData([]);
      return;
    }

    const formatP = (value) => {
      const num = Number(value);
      if (!Number.isFinite(num)) return "";
      return num > 0.001 ? num.toFixed(5) : num.toExponential(2);
    };
    const formatFixed = (value, digits) => {
      const num = Number(value);
      return Number.isFinite(num) ? num.toFixed(digits) : "";
    };

    performEnrichment(genes, selectedDatasets.join().replaceAll(" ", "_"))
      .then((results) => {
        if (!isCurrent()) return;
        const rows = [];
        for (const library of results || []) {
          for (const term of library?.data || []) {
            if (!Array.isArray(term)) continue;
            const termName = String(term[1] ?? "");
            rows.push({
              Dataset: String(library.name || "").replaceAll("_", " "),
              Rank: term[0],
              "Term name":
                termName.charAt(0).toUpperCase() +
                termName.slice(1).split("(")[0],
              "P-value": formatP(term[2]),
              "Z-score": formatFixed(term[3], 1),
              "Combined score": formatFixed(term[4], 1),
              "Adjusted p-value": formatP(term[6]),
              GC: Array.isArray(term[5]) ? term[5] : [],
            });
          }
        }

        // Sort by adjusted p-value (low to high) as default
        rows.sort(
          (a, b) =>
            parseFloat(a["Adjusted p-value"]) - parseFloat(b["Adjusted p-value"])
        );

        setkeyedData(rows);
      })
      .catch((error) => {
        if (!isCurrent()) return;
        setkeyedData([]);
        toast({
          message: {
            type: "Error",
            icon: true,
            heading: "Enrichr",
            content:
              "Sorry, Enrichr could not be reached. " +
              (error?.message ? error.message : ""),
          },
          autoClose: 3000,
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

    // If it's a parent node, also update all of its children in the copy
    // (the libraries actually queried are the checked leaves).
    let clicked = dataCopy;
    for (const part of String(currentNode.path).split(".")) {
      clicked = clicked?.[part];
    }
    const updateChildren = (node, checked) => {
      if (node && Array.isArray(node.children)) {
        node.children.forEach((child) => {
          child.checked = checked;
          updateChildren(child, checked);
        });
      }
    };
    updateChildren(clicked, currentNode.checked);

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
  const filterAndSortDataRows = (dataRows, filters, sorts) =>
    dataRows
      .filter((row) =>
        Object.keys(filters).every((key) => {
          return filters[key] === ""
            ? true
            : row[key]
                ?.toString()
                .toLowerCase()
                .includes(String(filters[key]).toLowerCase());
        })
      )
      .sort((a, b) =>
        Object.entries(sorts)
          .map(([key, value]) => {
            switch (value) {
              case "up": {
                return compareCells(a[key], b[key]);
              }
              case "down": {
                return compareCells(b[key], a[key]);
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
      // "GC" holds the overlapping genes; show it as an explicit overlap count
      // so a term supported by a single gene is obvious.
      const prettifyHeaderValue =
        key === "GC" ? "Overlap (genes)" : `${key[0].toUpperCase()}${key.slice(1)}`;
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
  // "Show all" (0 rows per page) must include the last row as well.
  const lastVisibleRow =
    rowsPerPage === 0
      ? filteredAndSortedData.length
      : firstVisibleRow + rowsPerPage;

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

  // Selected genes without the "_2" guide suffix / non-targeting controls.
  const cleanSelectedGenes = (keepControls = false) =>
    selectedGenesRaw
      .replaceAll("_2", "")
      .split(",")
      .map((gene) => gene.trim())
      .filter(Boolean)
      .filter((gene) => keepControls || !gene.startsWith("non-targeting"));

  let allGenes = [...new Set(cleanSelectedGenes(true))];
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
                // overlap count / size of the submitted list
                value:
                  allGenes.length > 0
                    ? `${value.length} / ${allGenes.length}`
                    : value.length,
                tooltip: `${value.length} overlapping gene${value.length === 1 ? "" : "s"}: ${value.join(", ")}`,
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
            // Same columns as the table; the overlap is exported as a count
            // plus the overlapping genes.
            const exportHeadings = headings
              .filter((h) => h !== "GC")
              .concat(["Overlap count", "Overlapping genes"]);
            const csvData =
              exportHeadings.join("\t") +
              "\n" +
              keyedData
                .map((item) =>
                  headings
                    .filter((h) => h !== "GC")
                    .map((h) => item[h] ?? "")
                    .concat([
                      Array.isArray(item.GC) ? item.GC.length : "",
                      Array.isArray(item.GC) ? item.GC.join(",") : "",
                    ])
                    .join("\t")
                )
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

    // -log10 that stays finite when Enrichr reports p = 0 (underflow).
    const negLog10 = (value) => {
      const p = parseFloat(value);
      if (!Number.isFinite(p)) return NaN;
      return p > 0 ? -Math.log10(p) : 300;
    };

    for (const row of keyedData) {
      if (parseFloat(row["Adjusted p-value"]) < 0.05) {
        const objClone = {
          "Adjusted log p-value": Number(negLog10(row["Adjusted p-value"]).toFixed(2)),
          "p-value": negLog10(row["P-value"]),
          "Combined score": Number(row["Combined score"]),
          "Z-score": Number(row["Z-score"]),
          "Term name": row["Term name"],
          Genes: row["GC"],
          Dataset: row["Dataset"],
        };

        bubbleGraphData.push(objClone);
      }
    }

    // -log10(adj. p) of the 10th most significant term (or the weakest one
    // when there are fewer than 10); terms at or above it get a label.
    const sortedLogP = bubbleGraphData
      .map((row) => Number(row["Adjusted log p-value"]))
      .filter((v) => Number.isFinite(v))
      .sort((a, b) => b - a);
    const labelCutoff =
      sortedLogP.length > 0
        ? sortedLogP[Math.min(10, sortedLogP.length) - 1]
        : Number.POSITIVE_INFINITY;

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
      // Hovering a bubble shows what it is (the chart used to have no tooltip)
      tooltip: {
        trigger: "item",
        confine: true,
        formatter: (params) => {
          const d = params?.data || {};
          const esc = (v) =>
            String(v ?? "").replace(/[&<>"']/g, (ch) =>
              ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch])
            );
          const num = (v, digits = 2) =>
            typeof v === "number" && Number.isFinite(v) ? v.toFixed(digits) : esc(v);
          const rows = [
            ["Library", d["Dataset"]],
            ["-log10 adj. p", num(d["Adjusted log p-value"])],
            ["Z-score", num(d["Z-score"])],
            ["Combined score", num(d["Combined score"], 1)],
          ].filter(([, v]) => v !== undefined && v !== null && v !== "");
          return (
            `<div style="max-width:320px;white-space:normal"><b>${esc(d["Term name"])}</b><br/>` +
            rows.map(([k, v]) => `${k}: ${typeof v === "string" ? v : esc(v)}`).join("<br/>") +
            "</div>"
          );
        },
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
          saveAsImage: { show: true, pixelRatio: 3, name: "genesetr_enrichment" },
          mySvg: svgToolboxFeature("genesetr-enrichment"),
          myPdf: pdfToolboxFeature("genesetr-enrichment"),
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
          // "Combined score" is the third dataset dimension (index 2)
          dimension: 2,
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
            const score = Number(data?.["Combined score"]);
            return Number.isFinite(score) && score > 0 ? Math.sqrt(score) : 10;
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
              // Label only the most significant terms (adj. p < 0.01 and
              // within the 10 strongest) to keep the chart readable.
              const value = Number(param.data?.["Adjusted log p-value"]);
              if (Number.isFinite(value) && value > 2 && value >= labelCutoff) {
                return param.data["Term name"];
              }
              return "";
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
          mySvg: svgToolboxFeature("genesetr-enrichment"),
          myPdf: pdfToolboxFeature("genesetr-enrichment"),
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
    const names = Object.keys(genesets || {});
    const tempx = [];
    const skipped = [];
    names.forEach((gl) => {
      const geneCount = countGenes(genesets[gl]);
      // Only gene lists with 3-400 genes can be sent to Enrichr
      if (geneCount >= MIN_ENRICHMENT_GENES && geneCount <= MAX_ENRICHMENT_GENES) {
        tempx.push({
          label: `${gl} (${geneCount} genes)`,
          value: gl,
          genes: genesets[gl],
        });
      } else if (geneCount > 0) {
        skipped.push({ name: gl, geneCount });
      }
    });

    setGeneListOptions((prev) => {
      // Keep the previous array when nothing changed so an identical genesets
      // object does not restart the enrichment.
      const same =
        prev.length === tempx.length &&
        prev.every(
          (item, idx) =>
            item.value === tempx[idx].value && item.genes === tempx[idx].genes
        );
      return same ? prev : tempx;
    });

    if (tempx.length > 0) {
      // Keep the user's selection while it still exists; otherwise fall back
      // to the first list so an enrichment is always shown.
      setselectedCluster((prev) =>
        tempx.some((item) => item.value === prev) ? prev : tempx[0].value
      );
      setLimitNotice("");
    } else {
      // Nothing can be analysed: never leave the previous selection's
      // enrichment on screen.
      enrichmentRequestRef.current += 1; // drop responses still in flight
      setselectedCluster("");
      setkeyedData([]);
      if (skipped.length > 0) {
        const first = skipped[0];
        setLimitNotice(
          skipped.length === 1
            ? `"${first.name}" has ${first.geneCount} gene${first.geneCount === 1 ? "" : "s"}. ` +
                `Enrichment is only run for lists of ${MIN_ENRICHMENT_GENES}-${MAX_ENRICHMENT_GENES} genes, so no enrichment is shown.`
            : `None of the ${skipped.length} gene lists has ${MIN_ENRICHMENT_GENES}-${MAX_ENRICHMENT_GENES} genes, ` +
                `so no enrichment is shown.`
        );
      } else {
        setLimitNotice("");
      }
    }
  }, [genesets]); // Notice: selectedCluster is no longer in the dependency array here

  // Call performEnrichmentNow only when selectedCluster changes
  useEffect(() => {
    if (!selectedCluster) return;

    // Rerun enrichment when either the selected list OR its gene contents change
    const geneItem = genelistOptions.find(
      (item) => item.value === selectedCluster
    );

    if (geneItem?.genes) {
      performEnrichmentNow(geneItem.genes);
    }
  }, [selectedCluster, genelistOptions]);

  const handleSaveGeneList = () => {
    const genesString = cleanSelectedGenes().join(",");

    if (genesString.length > 2) {
      setgenesToSave(genesString);
      setNewListVisible(true);
    }
  };

  // Get current genes as a formatted string
  const getCurrentGenes = () => cleanSelectedGenes().join("\n");

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
              <CopyToClipboard text={getCurrentGenes()}>
                <Button
                  small
                  label="Copy Genes"
                  colored="success"
                  icon={<FaCopy />}
                  width={80}
                />
              </CopyToClipboard>

              <Spacer width="6px" />
              <SendToMenu genes={() => cleanSelectedGenes()} />
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
                    value={getCurrentGenes()}
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

          {limitNotice && (
            <div
              role="status"
              style={{
                margin: "8px 0",
                padding: "10px 12px",
                backgroundColor: "#fff3cd",
                border: "1px solid #ffeeba",
                borderRadius: "6px",
                color: "#8a6d3b",
                fontSize: "14px",
              }}
            >
              {limitNotice}
            </div>
          )}

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
            <Table table={table} />
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

const ConnectedGeneSetEnrichmentTable = connect(
  mapStateToProps,
  mapDispatchToProps
)(GeneSetEnrichmentTable);

// An enrichment failure must not take down the chart/table it is embedded in.
const MainContainer = withErrorBoundary(ConnectedGeneSetEnrichmentTable, {
  label: "Enrichment",
});

export { MainContainer as GeneSetEnrichmentTable };
