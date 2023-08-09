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
  
} from "@oliasoft-open-source/react-ui-library";
import React, { useEffect, useRef, useState } from "react";
import { connect } from "react-redux";
import { FiCopy, FiDatabase, FiDownload } from "react-icons/fi";
import { FaCopy, FaDatabase,FaDownload } from "react-icons/fa";
import DropdownTreeSelect from "react-dropdown-tree-select";
//import 'react-dropdown-tree-select/dist/styles.css'
import "./treeview.css";
import data from "./enrichrDatasets.json";
//import { runEnrichr } from "../../store/api";
import { genesetEnrichmentSettingsChanged } from "../../store/settings/geneset-enrichment-settings";
import ReactEChartsCore from "echarts-for-react/lib/core";
import * as echarts from "echarts/core";
import { ScatterChart, EffectScatterChart, CustomChart } from "echarts/charts";
import { performEnrichment} from "./enrichrAPI";
import { saveAs } from 'file-saver';

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

const GeneSetEnrichmentTable = ({
  //runEnrichr,
    genesets,
  //genesetEnrichmentSettingsChanged,
  //genesetEnrichmentSettings,
  //clusteringSettingsChanged,
}) => {
  assignObjectPaths(data);
  const [keyedData, setkeyedData] = useState([]);
  const [selectedCluster, setselectedCluster] = useState("");
  const [genelistOptions, setGeneListOptions] = useState([]);

  //Rank, Term name, P-value, Z-score, Combined score, Overlapping genes, Adjusted p-value, Old p-value, Old adjusted p-value
const headings = ["Dataset", "Rank", "Term name", "P-value",  "Z-score", "Combined score","Adjusted p-value", "GC"  ];

let temp =[{}]

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
  selectedDatasets = selectedDatasets.concat(findCheckedLeaves(obj));}
 
  
  performEnrichment(genes, selectedDatasets.join().replaceAll(" ", "_")).then((results)=>{
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
  let allGenes = selectedCluster?genelistOptions.find(item => item.value === selectedCluster).genes?.replaceAll("_2","").split(","):[]
  const dataRows = [
    ...filteredAndSortedData
      .slice(firstVisibleRow, lastVisibleRow)
      .map((dataRow) => { 
        //console.log("dataRow", dataRow)
        const datasetName = dataRow["Dataset"];
        const rowsCells = Object.entries(dataRow).map(([key, value]) => (
          key==="GC"?
          {
          key:"GC",
          value: value.length,
          "tooltip": value.join(", "),
          type: 'Popover',          
          content: <ClusterInfoForm title = {datasetName}  value={value.join(", ")} value2={allGenes.filter(x => !value.includes(x) && !value.includes(x + "_2") ).join(", ")} />,
          //type: "Input",
          //disabled: false,
        }:{
          key,
          value,
          //type: "Input",
          //disabled: true,
        }));        
       
    
       
        return {          
          cells: rowsCells,
          
          //onRowMouseEnter: () => setDisplayText('Genes ' + identified + "\nMissing: " + distinctValues),
          //onRowMouseLeave: () => setDisplayText(''),
          
        };
      }),
  ];
  const table = {
    fixedWidth: '850px',
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
            label: 'Download',
            disabled: keyedData=== undefined,
            onClick: () =>{                
              const csvData = (headings.join('\t')) + '\n' + ( keyedData.map(item => Object.values(item).join('\t')).join('\n'));
              ;
              // Create a blob with the data
              const blob = new Blob([csvData], { type: 'text/plain;charset=utf-8' });
            
              // Save the blob as a file using FileSaver.js
              saveAs(blob, 'data.tsv'); }

          }
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
          'Z-score': keyedData[data]['Z-score'],// Math.log(keyedData[data]['Z-score'],10),
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
            dimensions: ['Z-score', 'Adjusted p-value', 'Combined score', 'Term name'],
            source: bubbleGraphData,           
        },
        grid:{
          right: '15%',
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
              left: 'right',
              top: '10%',
              dimension: 1,
              min: 0,
              max: 20,
              itemWidth: 30,
              itemHeight: 120,
              calculable: true,
              precision: 0.1,
              text: ['P Value'],
              textGap: 10,
              inRange: {
                symbolSize: [10, 70]
              },
              outOfRange: {
                symbolSize: [10, 0],
                color: ['rgba(255,255,255,0.4)']
              },
              controller: {
                inRange: {
                  color: ['#c23531']
                },
                outOfRange: {
                  color: ['#999']
                }
              }
            },
            {
              left: 'right',
              bottom: '10%',
              dimension: 0,
              min: 100,
              max: 1000,
              itemWidth: 30,
              itemHeight: 120,
              calculable: true,
              precision: 0.1,
              text: ['Combined\nScore'],
              textGap: 10,
              inRange: {
                colorLightness: [0.9, 0.3]
              },
              outOfRange: {                
                color: ['rgba(255,255,255,0.4)']
              },
              controller: {
                inRange: {
                  color: ['#c23531']
                },
                outOfRange: {
                  color: ['#999']
                }
              }
            }
          ], 
                  
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
              name: "Z Score",           
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
                  return Math.sqrt(data["Combined Score"]);
              },
              emphasis: {
                  label: {
                      show: true,
                      backgroundColor:'black',
                      color:'white',
                      formatter: function (param) {
                          return param.data['Term name'];
                      },
                      position: 'top',
                      fontSize:'12',
                      //borderColor:'black',
                      //borderWidth:2,
                  }                  
              },
              labelLayout: {
                align: 'center',
                hideOverlap: true,
                moveOverlap: 'shiftY',
                draggable: true,
                
                

              },
             
              label: {
                textBorderColor:"black",
                show: true,
                overflow: "truncate",
                distance:15,
                width: 300,
                fontSize:'12',
                formatter: function (param) {
                  
                  let maxVis = Math.min(10, bubbleGraphData.length)
                  if(param.data && param.data["Adjusted p-value"]>2 && param.data["Adjusted p-value"]> bubbleGraphData[maxVis]["Adjusted p-value"]){                    
                    return param.data['Term name'];
                  }else 
                  return ""
                  
                },
                minMargin: 10,
                position: 'top'
              },
              itemStyle: {
                  //shadowBlur: 10,
                  //shadowColor: 'rgba(120, 36, 50, 0.5)',
                  //shadowOffsetY: 5,
                  color: 'red', 
                  borderWidth: 1,
                  borderColor: 'gray',
                  /*color: new echarts.graphic.RadialGradient(0.4, 0.3, 1, [{
                      offset: 0,
                      color: 'rgb(170, 120, 60)'
                  }, {
                      offset: 1,
                      color: 'rgb(0, 0, 0)'
                  }])*/
              }
          } 
          ]
      }
      );
    
  }, [keyedData]);

  //In the first run set the selected cluter to cluster 0
  useEffect(() => {
    
    if(Object.keys(genesets).length>0){
      let tempx = []
      Object.keys(genesets).forEach((gl) => {
        if (genesets[gl].trim(',').split(',').length>2)
          tempx.push({label:gl + " ("+ genesets[gl].trim(',').split(',').length + " genes)", value: gl, genes: genesets[gl]})
      
      })
      
      setGeneListOptions(tempx);
      setselectedCluster(Object.keys(genesets)[0]);     
      performEnrichmentNow(genesets[Object.keys(genesets)[0]]);  
    }


   // setselectedCluster(Object.keys(clusters)[0] +  " ("+ clusters[Object.keys(clusters)[0]].trim(',').split(',').length + " genes)");  
   // console.log("Checking Clusters ", clusters[Object.keys(clusters)[0]])  
   // performEnrichmentNow(clusters[Object.keys(clusters)[0]]);   
  }, [genesets]);


  return (
    <>
      <div style={{display: "block", marginLeft:"auto", marginRight:"auto", width : "95%"} }>
        <Card heading={<Heading>Enrichment</Heading>}>

        <Row spacing={0} width="100%" height="10%">
         {genelistOptions.length>1?(
          <>
          <Field labelLeft labelWidth="130px" label="Select Gene List">
            <Select
              onChange={({ target: { value} }) => {
                setselectedCluster(value);
                console.log("selectedCluster",selectedCluster, value);
                //performEnrichmentNow(clusters[value.split(" (")[0]]) 
                performEnrichmentNow(genelistOptions.find(item => item.value === value).genes)               
              }}              
              // options={Object.keys(clusters).map(x=> x + " ("+ clusters[x].trim(',').split(',').length + " genes)")}
              options = {genelistOptions}
              width={"250px"}
              value= {selectedCluster}
            />
          </Field>          
          <Spacer width="16px"/></>
          ):(null)}
          <div>
            <Popover
              content={
                <>
                <DropdownTreeSelect
                  data={data}
                  onChange={onChange}
                  onAction={onAction}
                  showDropdown="always"
                  className="mdl-demo"
                  //keepChildrenOnSearch={true}
                  //keepOpenOnSelect ={true}
                />           
              </>
              }
            >
              <Button
                label="Set Datasets"
                colored
                margin-top={20}
                icon={<FaDatabase />}
              />
            </Popover>
            


          </div>
          <div>
          <Spacer width="16px" />
              <Button
                label="Copy Genes"
                colored="success"                                
                margin-top={20}
                icon={<FaCopy/>}
                onClick =  {() =>{
                  if(selectedCluster)
                  navigator.clipboard.writeText(genelistOptions.find(item => item.value === selectedCluster).genes.replaceAll("_2", "").replaceAll(",", "\n"))
                }}
              />
              </div>
        </Row>


        <Row spacing={0} width="100%" height="70%">
        <div style={{ width: "100%", height: "100%" }}>
          <ReactEChartsCore
            echarts={echarts}
            option={options}
            style={{ height: "60VH", width: "100%" }}
            notMerge={true}
            lazyUpdate={true}
          />
           </div>
        </Row>        
        <div style={{overflowX:"auto", display: "block", marginLeft:"auto", marginRight:"auto", width : "100%"}}>
        
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
  genesetEnrichmentSettingsChanged, performEnrichment
};

const MainContainer = connect(
  mapStateToProps,
  mapDispatchToProps
)(GeneSetEnrichmentTable);

export { MainContainer as GeneSetEnrichmentTable };
