import React, { useState } from 'react';
import { Table, Spacer, ButtonGroup } from '@oliasoft-open-source/react-ui-library';
import { FaChartBar, FaTable } from 'react-icons/fa';
import styles from './gene-regulation-page.module.scss';

import { connect } from 'react-redux';
import { useEffect } from 'react';
import * as echarts from 'echarts/core';
//import GraphChart from 'echarts/charts';
import {GraphChart} from 'echarts/charts';
import SortableFilterableTable from '../../components/sortable-filterable-table';
import { GridComponent, TooltipComponent,TitleComponent, DataZoomComponent,DatasetComponent,ToolboxComponent} from 'echarts/components';
import {
  CanvasRenderer,
  // SVGRenderer,
} from 'echarts/renderers';
import ReactEChartsCore from 'echarts-for-react/lib/core';
import dagre from 'dagre';

const headings  = ['Regulation Type', 'Direction', 'Gene Symbol From','Gene Symbol To','Score']
const helps = {'Regulation Type':'Corr: Correlation; Exp: Expression',
               'Direction': 'Corr: Correlation \n Exp: Expression',
               'Score':'r Value for correlation\n Z Score for expression'
              }


echarts.use(
  [TitleComponent, TooltipComponent, GridComponent, GraphChart, CanvasRenderer, DataZoomComponent,DatasetComponent,ToolboxComponent]
);

const ChartTableResultsGene = ({
  geneRegulationCoreSettings, geneRegulationGraph,graphmapSettings,
}) => {
  const [selectedView, setSelectedView] = useState(1);
  const [options, setOptions] = useState({}); 
  const [tableData, setTable] = useState({}); 
  const [keyedData, setkeyedData] = useState([{}]); 

 
  console.log("Start of the page")
  

  useEffect(() => {
    console.log("USe effect")
    if(geneRegulationGraph && geneRegulationGraph.nodes &&geneRegulationGraph.nodes.length >0){

    
      console.log("geneRegulationGraph",geneRegulationGraph)
      
      var edges = [] 
      var nodes = []      
      
    
      nodes = geneRegulationGraph.nodes.map(node => ({      
        id: node.id,
        name: node.id, 
        category: node.category, 
        //symbolSize: 15, 
        width: -500,
        height: 500,  
        kd:node.kd,
        count:node.count,        
        lineStyle: {opacity: node.kd? Math.min(0.4118*node.kd + 1.0235,1):0.5}
      }));
  
      edges = geneRegulationGraph.edges.map(edge => ({
        source: edge.From,
        target: edge.To,
        type:edge.Type,
        type2:edge.Type2,
        id: edge.id,
        value: edge.value,     
        lineStyle: {opacity:Math.min(0.4118*Math.abs(edge.value) + 0.1765,1), 
        color:
        edge.id.includes("+cor+")?'rgb(153, 51, 255)':
        (edge.value < -0.3  ? 'rgb(25, 206, 17)': 
        (edge.value > 0.3  ? 'rgb(255, 1, 1)':'rgb(123, 123, 123)')),
        type: edge.id.includes("+cor+")? 'dotted': (edge.id.includes("+int+")  ? 'dashed':'solid'),
        //curveness: edge.id.includes("+cor+")? 0.3: (edge.id.includes("+int+")  ? 0.5:0.4),
        }, 
        tooltip: {formatter: edge.id.includes("+cor+")? 'Correlation R: '+  edge.value: (edge.id.includes("+int+")  ? 'Protein-Protein Intereation: ':'Effect: '+  edge.value)},
      }));
    

let edgesFiltered = []; 
let uniqueNodeNamesWithEdges = new Set()
let  rows = [] 
let tableInfo = []
for(let m = edges.length-1; m >-1; m--)
{  
  if(edges[m].type2 === "Corr" && !geneRegulationCoreSettings.include_corr ) continue;
  else if(edges[m].type2 === "Exp" && !geneRegulationCoreSettings.include_exp ) continue;
  if(edges[m].type === "UNR_DNR" && !geneRegulationCoreSettings.unr_dnr )continue;
  if(edges[m].type === "UNR_DPR" && !geneRegulationCoreSettings.unr_dpr )continue;
  if(edges[m].type === "UPR_DNR" && !geneRegulationCoreSettings.upr_dnr )continue;
  if(edges[m].type === "UPR_DPR" && !geneRegulationCoreSettings.upr_dpr ) continue;
  if(edges[m].type === "UPR" && !geneRegulationCoreSettings.upr ) continue;
  if(edges[m].type === "DPR" && !geneRegulationCoreSettings.dpr ) continue;
  if(edges[m].type === "UNR" && !geneRegulationCoreSettings.unr ) continue;
  if(edges[m].type === "DNR" && !geneRegulationCoreSettings.dnr ) continue;
  if(edges[m].type === "among_dpr" && !geneRegulationCoreSettings.among_dpr) continue;
  if(edges[m].type === "among_upr" && !geneRegulationCoreSettings.among_upr ) continue;
  if(edges[m].type === "Exp" && edges[m].value < geneRegulationCoreSettings.absoluteZScore ) continue;
  if(edges[m].type === "Corr" && Math.abs(edges[m].value) < geneRegulationCoreSettings.corr_cutoff ) continue;
  if(edges[m].source ===  edges[m].target) continue;

  edgesFiltered.push(edges[m])
  uniqueNodeNamesWithEdges.add(edges[m].source)
  uniqueNodeNamesWithEdges.add(edges[m].target)
  rows.push({cells: [{value: edges[m].type2},{value: edges[m].type},{value: edges[m].source},{value: edges[m].target},{value: edges[m].value}]});
  tableInfo.push({'Regulation Type':edges[m].type2 , 'Direction': edges[m].type, 'Gene Symbol From': edges[m].source,'Gene Symbol To':edges[m].target,'Score': edges[m].value})
}
setkeyedData(tableInfo)


let nodesFiltered = nodes.filter(function (node) {return uniqueNodeNamesWithEdges.has(node.id);});

nodesFiltered = nodesFiltered.filter(node => node.count > 1);

let nodesFinal =[]
let edgesFinal =[]

if(graphmapSettings.layout ==="none"){ 
    // Create a new directed graph 
    var g = new dagre.graphlib.Graph();    
    // Set an object for the graph label
    g.setGraph({});
    // Default to assigning a new object as a label for each new edge.
    g.setDefaultEdgeLabel(function() { return {}; });
    // Add nodes to the graph.  
    for (let i in nodesFiltered  ) { 
      var node = nodesFiltered[i];  
      if(node !== undefined) g.setNode(node.id, node);      
  };  

  // Add edges
  for (let i in edgesFiltered) { 
    var edge = edgesFiltered[i];   
    if(edge.type2 === "Corr") continue;
      g.setEdge(edge.source, edge.target,edge);
  };           
  dagre.layout(g);

  for (let x in g._edgeLabels  )
    if((g._edgeLabels[x])) edgesFinal.push(g._edgeLabels[x])

  for (let x in g._nodes)
    if(g._nodes[x])  nodesFinal.push(g._nodes[x])
}
else
{
  nodesFinal =nodesFiltered;
  edgesFinal =edgesFiltered;
}

setOptions({
  tooltip: {
    formatter: function (params) {        
      let kd = '';
      if(params.data.kd)
      kd = "Knockdown: " + params.data.kd;
      return params.data.name + "<br>" + kd ;
    },
  },
  legend: [
    {
      data:["Upstream Pos. Regulator","Upstream Neg. Regulator","Downstream Pos. Regulated","Downstream Neg. Regulated"]
      ,
      top: 'top',
      itemGap : 5,
      left: 'left',
      padding: [
        5,  // up
        5, // right
        1,  // down
        5, // left
    ],
    orient:"vertical",
   }
  ],
  animationDurationUpdate: 1500,
  animationEasingUpdate: 'quinticInOut',
  
  series: [
    {
      autoCurveness: true,
      selectMode:'multiple',
      select: {
        disabled :false,
      },
      circular: {
        rotateLabel: true
      },
      type: 'graph',
      layout:  graphmapSettings.layout,       
      data: nodesFinal,
      links: edgesFinal,  
      categories:[{"name": "Upstream Pos. Regulator"},{"name":"Upstream Neg. Regulator"},{"name":"Downstream Pos. Regulated"},{"name":"Downstream Neg. Regulated"}],     
      edgeSymbol: ['circle', 'arrow'],
      edgeSymbolSize: [4, 20],
      edgeLabel: {
        fontSize: 20
      },

      label: {
        show: true,
        position: 'right',
        formatter: function (params) {
          return params.data.name;
        },
        
        fontWeight: 'bold',
        color: 'black'
      },
      emphasis: {
        focus: 'adjacency',
        lineStyle: {
          width: 6
        }
      },
      
      itemStyle:{
        /*color: function (params) {            
          if (params.data.direction === "down") {
              return '#1e81b0';
          } else {              
             return 'red';
          }
        },*/
        //opacity: 0.9,          
        borderColor : 'black',
        borderWidth :2

      },      
      lineStyle: {
        curveness: 0.3 ,
        width: 4,
      },
      draggable:true,  
     // categories: sample.categories,
      roam: true,        
      force: {
        repulsion: graphmapSettings.repulsion,
        initLayout: 'circular'
      }
    }
  ]
});

}

}, [geneRegulationGraph, graphmapSettings, geneRegulationCoreSettings]);


  return (
    <>
      <ButtonGroup
        items={[
          {
            icon: <FaChartBar />,
            key: 0,
            label: 'Chart',
          },
          {
            icon: <FaTable />,
            key: 1,
            label: 'Table',
          }
        ]}
        onSelected={(key) => setSelectedView(key)}
        value={selectedView}
      />
      <Spacer />
      {keyedData && selectedView === 1 && (
        <SortableFilterableTable keyedData={keyedData} headings = {headings} helps= {helps} />
      )}
      {selectedView === 0 && (
        <>
        <div className={styles.mainView}>
         <ReactEChartsCore
    echarts={echarts}
    option={options}
    style={{ height: '100%', width: '100%' }}
    notMerge={true}
    lazyUpdate={true}    
    />
        </div>
        </>
      )}
      <Spacer height={70} />
    </>
  );
};

const mapStateToProps = ({  settings,calcResults }) => ({
  geneRegulationGraph: calcResults?.geneRegulationGraph?.result ?? null,
  graphmapSettings: settings?.graphmap ?? {},
  geneRegulationCoreSettings: settings?.geneRegulationCore ?? {},
})

const MainContainer = connect(mapStateToProps)(ChartTableResultsGene);

export { MainContainer as ChartTableResultsGene };;


