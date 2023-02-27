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
} from "@oliasoft-open-source/react-ui-library";
import React, { useEffect, useRef, useState } from "react";
import { connect } from "react-redux";
import { FiDatabase } from "react-icons/fi";
import DropdownTreeSelect from "react-dropdown-tree-select";
//import 'react-dropdown-tree-select/dist/styles.css'
import "./treeview.css";
import data from "./enrichrDatasets.json";
//import { runEnrichr } from "../../store/api";
import { genesetEnrichmentSettingsChanged } from "../../store/settings/geneset-enrichment-settings";
import { GeneSetEnrichmentSettingsTypes } from "../../components/side-bar/settings/enums.js";
import ReactEChartsCore from "echarts-for-react/lib/core";
import * as echarts from "echarts/core";
import { ScatterChart, EffectScatterChart, CustomChart } from "echarts/charts";
import { performEnrichment} from "./enrichrAPI";

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
//console.log(data);

const onChange = (currentNode, selectedNodes) => {
 checkNode(data, currentNode.path, currentNode.checked);
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
  const [keyedData, setkeyedData] = useState([]);
  const [selectedCluster, setselectedCluster] = useState("");
 
  //Rank, Term name, P-value, Z-score, Combined score, Overlapping genes, Adjusted p-value, Old p-value, Old adjusted p-value
const headings = ["Dataset", "Rank", "Term name", "P-value",  "Z-score", "Combined score","Adjusted p-value", "GC"  ];


let temp =[{}]

const performEnrichmentNow = function (genes) {
  let selectedDatasets = data.filter(function (node){return node.checked===true;}).map(node => (node.label)).join()
  performEnrichment(genes, selectedDatasets).then((results)=>{
    //console.log("keyedData", temp, results)
    for(let i in results){
      for(let j in results[i].data){
        temp.push({
          "Dataset":results[i].name.replaceAll("_"," "),
          "Rank":results[i].data[j][0],
          "Term name": results[i].data[j][1].charAt(0).toUpperCase() + results[i].data[j][1].slice(1).split("(")[0],        
          "P-value":results[i].data[j][2]>0.001?results[i].data[j][2].toFixed(5):results[i].data[j][2].toExponential(2),  
          "Z-score":results[i].data[j][3].toFixed(1), 
          "Combined score":results[i].data[j][4].toFixed(1), 
          "Adjusted p-value":results[i].data[j][6]>0.001?results[i].data[j][6].toFixed(5):results[i].data[j][6].toExponential(2),  
          "GC":results[i].data[j][5]}      
          )    
      }
    }
   // console.log(temp)
    setkeyedData(temp)
  }).catch(error => {
    toast({
      message: { "type":  "Error",
      "icon": true,
      "heading": "Enrichr",
      "content": "Sorry. Enrichr servers are not responding." + error},
      autoClose:2000
    })
  });
  
}
  
  const rowsPerPageOptions = [
    { label: "10 / page", value: 10 },
    { label: "20 / page", value: 20 },
    { label: "50 / page", value: 50 },
    { label: "100 / page", value: 100 },
    { label: "Show all", value: 0 },
  ];

  console.log("We are in tables");
  const clusterNames = Object.keys(clusters);
  //console.log(clusterNames);

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
        
        const rowsCells = Object.entries(dataRow).map(([key, value]) => (
          key==="GC"?
          {
          key:"GC",
          value: value.length,
          "tooltip": value.join(),
          //type: "Input",
          //disabled: false,
        }:{
          key,
          value,
          //type: "Input",
          //disabled: true,
        }
        
        
        ));
        //console.log(rowsCells)
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

  const [options, setOptions] = useState({});

  useEffect(() => {

    /*
        "Dataset":results[i].name.replaceAll("_"," "),
          "Rank":results[i].data[j][0],
          "Term name": results[i].data[j][1].charAt(0).toUpperCase() + results[i].data[j][1].slice(1).split("(")[0],        
          "P-value":results[i].data[j][2]>0.001?results[i].data[j][2].toFixed(5):results[i].data[j][2].toExponential(2),  
          "Z-score":results[i].data[j][3].toFixed(1), 
          "Combined score":results[i].data[j][4].toFixed(1), 
          "Adjusted p-value":results[i].data[j][6]>0.001?results[i].data[j][6].toFixed(5):results[i].data[j][6].toExponential(2),  
          "GC":results[i].data[j][5]}    
    */
 
      //3D chart
      const bubbleGraphData = [];

      for( let data in keyedData){
        const objClone = {
          'Adjusted p-value': -Math.log10(keyedData[data]['Adjusted p-value']),
          'p-value': -Math.log10(keyedData[data]['P-value']),
          'Combined score':keyedData[data]['Combined score'],
          'Z-score':keyedData[data]['Z-score'],
          'Term name':keyedData[data]['Term name'],
          'Genes':keyedData[data]['GC'],
          'Dataset':keyedData[data]['Dataset'],
        }
        
        bubbleGraphData.push(objClone)
  
      }
      console.log("bubbleGraphData", bubbleGraphData)
      setOptions(
        {    
          dataset: {
            dimensions: ['Combined score', 'Adjusted p-value', 'Z-score', 'Term name'],
            source: bubbleGraphData,           
        },
         /* legend: {
              right: 10,
              data: ['1990', '2015']
          },*/
          xAxis: {
              splitLine: {
                  lineStyle: {
                      type: 'dashed'
                  }
              },              
              nameLocation : "center",
              nameTextStyle:{
                fontWeight:'bold',
                fontSize : '14'

              },

              name: "Combined Score",           
              nameGap: 25
          },
          yAxis: {
              splitLine: {
                  lineStyle: {
                      type: 'dashed'
                  }
              },
              nameRotate: 90,
              scale: true,
              name: "-log 10 (Adjusted p Value)",
              nameLocation : "center",
              nameGap: 35,
              nameTextStyle:{
                fontWeight:'bold',
                fontSize : '14',
                verticalAlign : 'center',
              },
          },
          series: [{
              //name: '1990',              
              type: 'scatter',
              symbolSize: function (data) {                 
                  return Math.sqrt(data["Z-score"]);
              },
              emphasis: {
                  label: {
                      show: true,
                      formatter: function (param) {
                          return param.data['Term name'];
                      },
                      position: 'top'
                  }
              },
              itemStyle: {
                  shadowBlur: 10,
                  shadowColor: 'rgba(120, 36, 50, 0.5)',
                  shadowOffsetY: 5,
                  color: new echarts.graphic.RadialGradient(0.4, 0.3, 1, [{
                      offset: 0,
                      color: 'rgb(200, 60, 60)'
                  }, {
                      offset: 1,
                      color: 'rgb(0, 0, 0)'
                  }])
              }
          } 
          ]
      }
      );
    
  }, [keyedData]);

  //In the first run set the selected cluter to cluster 0
  useEffect(() => {
    if(Object.keys(clusters).length>0)
    setselectedCluster(Object.keys(clusters)[0]);  
    console.log("Checking Clusters ", clusters[Object.keys(clusters)[0]])  
    performEnrichmentNow(clusters[Object.keys(clusters)[0]]);   
  }, []);


  return (
    <>
      <div style={{ width: "100%", height: "100%" }}>
        <Row spacing={0} width="100%" height="10%">
          <Field labelLeft labelWidth="130px" label="Select Cluster">
            <Select
              onChange={({ target: { value } }) => {
                setselectedCluster(value);
                console.log("selectedCluster",selectedCluster, value);
                performEnrichmentNow(clusters[value])                
              }}              
              options={Object.keys(clusters)}
              width={"250px"}
              value= {selectedCluster}
            />
          </Field>
          <Spacer width="16px" />
          <div>
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

        

        <div style={{ width: "100%", height: "100%" }}>
        <Row spacing={0} width="100%" height="70%">
          <ReactEChartsCore
            echarts={echarts}
            option={options}
            style={{ height: "100%", width: "100%" }}
            notMerge={true}
            lazyUpdate={true}
          />
        </Row>        
        </div>

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
  genesetEnrichmentSettingsChanged, performEnrichment
};

const MainContainer = connect(
  mapStateToProps,
  mapDispatchToProps
)(TableWithSortAndFilter);

export { MainContainer as TableWithSortAndFilter };
