import React, { useState } from 'react';
import { Table, Spacer, ButtonGroup } from '@oliasoft-open-source/react-ui-library';
import { FaChartBar, FaTable } from 'react-icons/fa';
import styles from './gene-regulation-page.module.scss';

import { connect } from 'react-redux';
import { useEffect } from 'react';
import * as echarts from 'echarts/core';
//import GraphChart from 'echarts/charts';
import {GraphChart} from 'echarts/charts';
import EnrichmentTable from '../../components/enrichment-table';
import { GridComponent, TooltipComponent,TitleComponent, DataZoomComponent,DatasetComponent,ToolboxComponent} from 'echarts/components';
import {
  CanvasRenderer,
  // SVGRenderer,
} from 'echarts/renderers';
import ReactEChartsCore from 'echarts-for-react/lib/core';
import dagre from 'dagre';
import {getBlackList} from "../../store/api"
import { geneRegulationCoreSettingsSlice } from '../../store/settings/gene-regulation-core-settings';

const headings  = ['Regulation Type', 'Direction', 'Gene Symbol From','Gene Symbol To','Score','Source NC', 'Target NC', 'Total NC']
const helps = {'Regulation Type':'Corr: Correlation; Exp: Expression',
               'Direction': 'Corr: Correlation \n Exp: Expression',
               'Score':'r Value for correlation\n Z Score for expression',
               'Source NC':'Source Neighbour Count',
               'Target NC':'Target Neighbour Count',
               'Total NC':'Total Neighbour Count',
              }


echarts.use(
  [TitleComponent, TooltipComponent, GridComponent, GraphChart, CanvasRenderer, DataZoomComponent,DatasetComponent,ToolboxComponent]
);

const GeneRegulation = ({
  geneRegulationCoreSettings, geneRegulationGraph,graphmapSettings,
}) => {
  const [selectedView, setSelectedView] = useState(0);
  const [options, setOptions] = useState({}); 
  const [keyedData, setkeyedData] = useState([{}]); 
  const [blackListDown, setblackListDown] = useState({});
  const [blackListUp, setblackListUp] = useState({});
  const [blackListExpDown, setblackListExpDown] = useState({});
  const [blackListExpUp, setblackListExpUp] = useState({});
  const [blackListPCount, setblackListPCount] = useState({});
  const [blackListECount, setblackListECount] = useState({});
 
  //console.log("Start of the page")
  useEffect(()=> {
    
    getBlackList().then((result)=> {
      const genesUp = {};
      const genesDown= {};
      console.log(result.blacklist)
  
      for (const gene in result.blacklist.ZS) {      
          if (result.blacklist.ZS[gene] > 0) {
            genesUp[gene] = result.blacklist.ZS[gene];
          } else{
            genesDown[gene] = Math.abs(result.blacklist.ZS[gene]);
          }        
      }
      console.log("setblackListDown",genesDown )
      console.log("setblackListUp",genesUp )  
      setblackListDown(genesDown);
      setblackListUp(genesUp);

      
      setblackListPCount(result.blacklist.C);
      setblackListECount(result.blacklistExp.C);



console.log("blacklistExp",result.blacklistExp)
      const genesUpExp = {};
      const genesDownExp= {};
      for (const gene in result.blacklistExp.ZS) {      
        if (result.blacklistExp.ZS[gene] > 0) {
          genesUpExp[gene] = result.blacklistExp.ZS[gene];
        } else{
          genesDownExp[gene] = Math.abs(result.blacklistExp.ZS[gene]);
        }        
    }

    setblackListExpDown(genesDownExp);
    setblackListExpUp(genesUpExp);
    //console.log("setblackListExpDown",genesDownExp )
    //console.log("setblackListExpUp",genesUpExp )  

    })
  },[] )
  
  useEffect(() => {
    //console.log("USe effect")
    if(geneRegulationGraph && geneRegulationGraph.nodes &&geneRegulationGraph.nodes.length >0){

    
      //console.log("geneRegulationGraph",geneRegulationGraph)
      
      var edges = [] 
      var nodes = []      
      
    
      nodes = geneRegulationGraph.nodes.map(node => ({      
        id: node.id,
        name: node.id, 
        category: node.category, 
        neighbourCount:0,
        //symbolSize: 15,         
        kd:node.kd,            
        lineStyle: {opacity: node.kd? Math.min(0.4118*node.kd + 1.0235,1):0.5},
        itemStyle: {borderColor: 'black'},

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
        tooltip: {
          formatter: edge.id.includes("+cor+")? 'Corr. R: '+  edge.value +'<br />' + edge.id.replace("+cor+"," ~ ")  + '<br />' + edge.Type.replace("_"," to "): (edge.id.includes("+int+")  ? 'Protein-Protein Intereation: ':'Effect: '+  edge.value +'<br />' + edge.id.replace("+exp+"," → ") +'<br />' + edge.Type.replace("_"," to ")),
        },
      }));
    

let edgesFiltered = []; 
let uniqueNodeNamesWithEdges = new Set()
//let  rows = [] 


for(let m = edges.length-1; m >-1; m--)
{  
  if(edges[m].type2 === "Corr" && !geneRegulationCoreSettings.include_corr ) continue;
  else if(edges[m].type2 === "Exp" && !geneRegulationCoreSettings.include_exp ) continue;
  if(edges[m].source.startsWith("non-targ") || edges[m].target.startsWith("non-targ")) continue; 
  if (geneRegulationCoreSettings.filter1Enabled && edges[m].source !== geneRegulationCoreSettings.selectedGene){  
    if((edges[m].type === "UPR" || edges[m].type === "UPR_DPR" || edges[m].type === "UNR_DNR" || edges[m].type === "UNR_UNR" || edges[m].type === "UPR_UPR" || edges[m].type === "DPR_DPR" || edges[m].type === "DNR_DNR") &&   blackListDown[edges[m].source] !== undefined && blackListDown[edges[m].source]>geneRegulationCoreSettings.filterBlackListed) continue;
    if((edges[m].type === "UNR" || edges[m].type === "UNR_DPR" || edges[m].type === "UPR_DNR" || edges[m].type === "UPR_UNR" || edges[m].type === "UNR_UPR" || edges[m].type === "DPR_DNR" || edges[m].type === "DNR_DPR" ) && blackListUp[edges[m].source] !== undefined && blackListUp[edges[m].source]>geneRegulationCoreSettings.filterBlackListed) continue;
    }
  
  if (geneRegulationCoreSettings.filter2Enabled && edges[m].target !== geneRegulationCoreSettings.selectedGene){ 
    if((edges[m].type === "UPR_DPR" || edges[m].type === "UNR_DNR" || edges[m].type === "UNR_UNR" || edges[m].type === "UPR_UPR" || edges[m].type === "DPR_DPR" || edges[m].type === "DNR_DNR") &&   blackListExpDown[edges[m].target] !== undefined && blackListExpDown[edges[m].target]>geneRegulationCoreSettings.filterBlackListedExp) continue;
    if((edges[m].type === "UNR_DPR" || edges[m].type === "UPR_DNR" || edges[m].type === "UPR_UNR" || edges[m].type === "UNR_UPR" || edges[m].type === "DPR_DNR" || edges[m].type === "DNR_DPR" ) && blackListExpUp[edges[m].target] !== undefined && blackListExpUp[edges[m].target]>geneRegulationCoreSettings.filterBlackListedExp) continue;
  }
  
  if(geneRegulationCoreSettings.filter1Enabled && !geneRegulationCoreSettings.filter1Directional){
    if(edges[m].source !== geneRegulationCoreSettings.selectedGene){
      if((blackListUp[edges[m].source]!== undefined && blackListUp[edges[m].source]>geneRegulationCoreSettings.filterBlackListed) || (blackListDown[edges[m].source]!== undefined && blackListDown[edges[m].source]>geneRegulationCoreSettings.filterBlackListed)) continue;
    }
    if(edges[m].target !== geneRegulationCoreSettings.selectedGene){
      if((blackListUp[edges[m].target]!== undefined && blackListUp[edges[m].target]>geneRegulationCoreSettings.filterBlackListed) || (blackListDown[edges[m].target]!== undefined && blackListDown[edges[m].target]>geneRegulationCoreSettings.filterBlackListed)) continue;
    }
  }

  if(geneRegulationCoreSettings.filter2Enabled && !geneRegulationCoreSettings.filter2Directional){
    if(edges[m].target !== geneRegulationCoreSettings.selectedGene){
      if((blackListExpUp[edges[m].target]!== undefined && blackListExpUp[edges[m].target]>geneRegulationCoreSettings.filterBlackListed) || (blackListExpDown[edges[m].target]!== undefined && blackListExpDown[edges[m].target]>geneRegulationCoreSettings.filterBlackListed)) continue;
    }
    if(edges[m].source !== geneRegulationCoreSettings.selectedGene){
      if((blackListExpUp[edges[m].source]!== undefined && blackListExpUp[edges[m].source]>geneRegulationCoreSettings.filterBlackListed) || (blackListExpDown[edges[m].source]!== undefined && blackListExpDown[edges[m].source]>geneRegulationCoreSettings.filterBlackListed)) continue;
    }
  }


  if(geneRegulationCoreSettings.filter3Enabled){
    if(blackListPCount[edges[m].source]!== undefined && blackListPCount[edges[m].source]>geneRegulationCoreSettings.filterCount1) continue;
    if(blackListPCount[edges[m].target]!== undefined && blackListPCount[edges[m].target]>geneRegulationCoreSettings.filterCount1) continue;
  }

  if(geneRegulationCoreSettings.filter4Enabled){
    if(blackListECount[edges[m].source]!== undefined && blackListECount[edges[m].source]>geneRegulationCoreSettings.filterCount2) continue;
    if(blackListECount[edges[m].target]!== undefined && blackListECount[edges[m].target]>geneRegulationCoreSettings.filterCount2) continue;
  }


  if(edges[m].type === "UNR_DNR" && (!geneRegulationCoreSettings.unr_dnr || !geneRegulationCoreSettings.unr || !geneRegulationCoreSettings.dnr) )continue;
  if(edges[m].type === "UNR_DPR" && (!geneRegulationCoreSettings.unr_dpr || !geneRegulationCoreSettings.unr || !geneRegulationCoreSettings.dpr) )continue;
  if(edges[m].type === "UPR_DNR" && (!geneRegulationCoreSettings.upr_dnr || !geneRegulationCoreSettings.upr || !geneRegulationCoreSettings.dnr)) continue;
  if(edges[m].type === "UPR_DPR" && (!geneRegulationCoreSettings.upr_dpr || !geneRegulationCoreSettings.upr || !geneRegulationCoreSettings.dpr) ) continue;
  if(edges[m].type === "UPR" && !geneRegulationCoreSettings.upr ) continue;
  if(edges[m].type === "DPR" && !geneRegulationCoreSettings.dpr ) continue;
  if(edges[m].type === "UNR" && !geneRegulationCoreSettings.unr ) continue;
  if(edges[m].type === "DNR" && !geneRegulationCoreSettings.dnr ) continue;
  if(edges[m].type === "among_dpr" && !geneRegulationCoreSettings.among_dpr) continue;
  if(edges[m].type === "among_upr" && !geneRegulationCoreSettings.among_upr ) continue;
  if(edges[m].type2 === "Exp" && Math.abs(edges[m].value) < geneRegulationCoreSettings.absoluteZScore ) continue;
  if(edges[m].type2 === "Corr" && Math.abs(edges[m].value) < geneRegulationCoreSettings.corr_cutoff ) continue;
  if(edges[m].source ===  edges[m].target) continue;

  edgesFiltered.push(edges[m])
  uniqueNodeNamesWithEdges.add(edges[m].source)
  uniqueNodeNamesWithEdges.add(edges[m].target)
  //rows.push({cells: [{value: edges[m].type2},{value: edges[m].type},{value: edges[m].source},{value: edges[m].target},{value: edges[m].value}]});
}

let nodesFiltered = nodes.filter(node => 
  (node.id  === geneRegulationCoreSettings.selectedGene)||
  ((node.category === 0 &&  (blackListDown[node.id] === undefined || !geneRegulationCoreSettings.filter1Enabled || geneRegulationCoreSettings.filter1Directional || blackListDown[node.id]<=geneRegulationCoreSettings.filterBlackListed     )) ||
  (node.category === 1 &&  (blackListUp[node.id] === undefined || !geneRegulationCoreSettings.filter1Enabled || geneRegulationCoreSettings.filter1Directional||blackListUp[node.id]<=geneRegulationCoreSettings.filterBlackListed)) ||
  (node.category === 3 &&  (blackListExpDown[node.id] === undefined || !geneRegulationCoreSettings.filter2Enabled || geneRegulationCoreSettings.filter2Directional || blackListExpDown[node.id]<=geneRegulationCoreSettings.filterBlackListedExp)) ||
  (node.category === 2 &&  (blackListExpUp[node.id] === undefined || !geneRegulationCoreSettings.filter2Enabled || geneRegulationCoreSettings.filter2Directional || blackListExpUp[node.id]<=geneRegulationCoreSettings.filterBlackListedExp)) 
  ) &&

  ((node.category !== 0 && node.category === 1) ||  !geneRegulationCoreSettings.filter1Enabled || geneRegulationCoreSettings.filter1Directional || (blackListDown[node.id] === undefined && blackListUp[node.id] === undefined))
  &&
  ((node.category !== 2 && node.category === 3) ||  !geneRegulationCoreSettings.filter2Enabled || geneRegulationCoreSettings.filter2Directional || (blackListExpDown[node.id] === undefined && blackListExpUp[node.id] === undefined))
  &&
  (!geneRegulationCoreSettings.filter3Enabled || blackListPCount[node.id] === undefined || blackListPCount[node.id]<=geneRegulationCoreSettings.filterCount1)
  &&
  (!geneRegulationCoreSettings.filter4Enabled || blackListECount[node.id] === undefined || blackListECount[node.id]<=geneRegulationCoreSettings.filterCount2)

  ); 


  if(!graphmapSettings.isolatednodes){
    let uniqueNodeNamesWithEdges = new Set()
    //We need to keep the key gene
    uniqueNodeNamesWithEdges.add(geneRegulationCoreSettings.selectedGene)
  
    edgesFiltered.forEach(edge => {    
      if(edge.source !== edge.target){ 
        uniqueNodeNamesWithEdges.add(edge.source)
        uniqueNodeNamesWithEdges.add(edge.target)
      }
    });

    nodesFiltered = nodesFiltered.filter(function (node) {
      return uniqueNodeNamesWithEdges.has(node.id);
    });  
  }

  




// Create a map to keep track of node counts
let nodeCounts = new Map();
//console.log("nodeCounts",nodeCounts)
// Count number of each node in edges array
edgesFiltered.forEach(edge => {
  const { source, target } = edge;
  if (!nodeCounts[source]) {
    nodeCounts[source] = 1;
  } else {
    nodeCounts[source]++;
  }
  if (!nodeCounts[target]) {
    nodeCounts[target] = 1;
  } else {
    nodeCounts[target]++;
  }
});

// Update node counts in nodes array
nodesFiltered.forEach(node => {
  const { id } = node;
  if (id ===  geneRegulationCoreSettings.selectedGene){
  node["symbolSize"] = 40
  node["itemStyle"]["borderColor"] = "red"
  node["itemStyle"]["color"] = "orange"
  node["neighbourCount"] = nodeCounts[id]?nodeCounts[id]:0
  }else if (nodeCounts[id]) {
    node["neighbourCount"] = nodeCounts[id]
    //node["symbolSize"] = Math.max(Math.min(nodeCounts[id]*2 +4,20),8);   
  }
});



//filter out nodes with less than X number of neighbours
// Precompute neighbors for each node
let neighborsMap = {};
edgesFiltered.forEach(edge => {
  //const [source, target] = edge;
  let source = edge["source"]
  let target = edge["target"]
  if (!neighborsMap[source]) {
    neighborsMap[source] = new Set();
  }
  neighborsMap[source].add(target);

  if (!neighborsMap[target]) {
    neighborsMap[target] = new Set();
  }
  neighborsMap[target].add(source);
});

let toBeRemoved;
do {
  toBeRemoved = new Set();
  //console.log("nodesFinals  ",nodesFinal)
  for (let id in nodesFiltered) {
    const node = nodesFiltered[id];
    if (node.id  === geneRegulationCoreSettings.selectedGene) continue;
    if (node.neighbourCount < geneRegulationCoreSettings.neighbourCount) {
      toBeRemoved.add(nodesFiltered[id]);
    }
  }
  //console.log("neighborsMap ",neighborsMap)
  //console.log("toBeRemoved ",toBeRemoved)
 toBeRemoved.forEach(node => {
    //console.log("id", node)
    const neighbors = neighborsMap[node["id"]];
    //console.log("neighbors  ",neighbors)
    if(neighbors){
        neighbors.forEach(neighborId => {
          //console.log("neighborId ",neighborId)
          const temp= nodesFiltered.find(element => element["id"] == neighborId)
          if(temp){
            temp["neighbourCount"]--;
            if (temp.id  !== geneRegulationCoreSettings.selectedGene && temp.neighbourCount < geneRegulationCoreSettings.neighbourCount) {
              //console.log("before addin g to  toBeRemoved",toBeRemoved)
              toBeRemoved.add(temp);
              //console.log("added to  toBeRemoved",toBeRemoved)
            }
          }
        });
    }
    const index = nodesFiltered.indexOf(node);
    if (index > -1) { // only splice array when item is found
      nodesFiltered.splice(index, 1); // 2nd parameter means remove one item only
    }  
    
    //delete neighborsMap[node];

    edgesFiltered = edgesFiltered.filter(edge => edge["source"] !== node["id"] && edge["target"] !== node["id"]);
  });

} while (toBeRemoved.size > 0);


if(geneRegulationCoreSettings.onlyLinked === true){
  neighborsMap = {};
  const currentNodeIds = new Set(nodesFiltered.map(object => object.id))
  edgesFiltered.forEach(edge => {
    //const [source, target] = edge;
    let source = edge["source"]
    let target = edge["target"]
    if(!currentNodeIds.has(source) && !currentNodeIds.has(target))
      return;

    if (!neighborsMap[source]) {
      neighborsMap[source] = new Set();
    }
    neighborsMap[source].add(target);

    if (!neighborsMap[target]) {
      neighborsMap[target] = new Set();
    }
    neighborsMap[target].add(source);
  });
  const visited = new Set();
  
  const queue = [geneRegulationCoreSettings.selectedGene];

  while (queue.length > 0) {
    const currentNodeId = queue.shift();
    visited.add(currentNodeId);
    //console.log("visited", visited)
    //console.log("queue", queue)
    const neighbors = neighborsMap[currentNodeId] || new Set();
    neighbors.forEach(neighborId => {
      if (!visited.has(neighborId)) {        
        visited.add(neighborId);
        queue.push(neighborId);
      }
    });
  }

  nodesFiltered = nodesFiltered.filter(function (node) {
    return visited.has(node.id);
  });
}

if(geneRegulationCoreSettings.basedOnFinal === true){
  
    nodeCounts = new Map();
    let minValue = 99999;
    let maxValue = 1;
    let idSet = new Set(nodesFiltered.map(node => node.id));

    // Count number of each node in edges array
    edgesFiltered.forEach(edge => {
      const { source, target } = edge;
      if(!idSet.has(source) || !idSet.has(target)) return
    
      if (!nodeCounts[source]) {
        nodeCounts[source] = 1;
      } else {
        nodeCounts[source]++;
      }
      if (!nodeCounts[target]) {
        nodeCounts[target] = 1;
      } else {
        nodeCounts[target]++;
      }     
      
    });

    //If simplified view filter enabled
    if(geneRegulationCoreSettings?.filter5Enabled === true){
      console.log("nodesFiltered", nodesFiltered)

      edgesFiltered = edgesFiltered.filter(edge => (edge.source === geneRegulationCoreSettings.selectedGene || edge.target === geneRegulationCoreSettings.selectedGene) && (nodeCounts[edge.target] + nodeCounts[edge.source] - nodeCounts[geneRegulationCoreSettings.selectedGene])>=geneRegulationCoreSettings.filterCount5);
      
      uniqueNodeNamesWithEdges = new Set()
      //We need to keep the key gene
      uniqueNodeNamesWithEdges.add(geneRegulationCoreSettings.selectedGene)
    
      edgesFiltered.forEach(edge => {    
        if(edge.source !== edge.target){ 
          uniqueNodeNamesWithEdges.add(edge.source)
          uniqueNodeNamesWithEdges.add(edge.target)
        }
      });
      console.log("nodesFinal", nodesFiltered)
      console.log("uniqueNodeNamesWithEdges", uniqueNodeNamesWithEdges)
      nodesFiltered = nodesFiltered.filter(function (node) {
        return uniqueNodeNamesWithEdges.has(node.id);
      }); 
      console.log("nodesFinal", nodesFiltered)
    }

    //Find the minimum and maxiumum neighbour count we need for symbolSize
    for (const node in nodesFiltered) { 
      if(nodesFiltered[node]["id"] === geneRegulationCoreSettings.selectedGene) continue;     
      let value = nodeCounts[nodesFiltered[node]["id"]]    
      if (value < minValue) {
        minValue = value;
      }
      if (value > maxValue) {
        maxValue = value;
      }
    }
    
    // Update node counts in nodes array  
      var minSize = 6;
      var maxSize = 30;
      var sizeRange = maxSize - minSize;      
    
      nodesFiltered.forEach(node => {
      const { id } = node;
      if (id ===  geneRegulationCoreSettings.selectedGene){
      node["symbolSize"] = 40
      node["itemStyle"]["borderColor"] = "red"
      node["itemStyle"]["color"] = "orange"
      node["neighbourCount"] = nodeCounts[id]?nodeCounts[id]:0
      }else if (nodeCounts[id]) {
        node["neighbourCount"] = nodeCounts[id]
        //node["symbolSize"] = Math.max(Math.min(nodeCounts[id]*2 +2,100),8);   
        node["symbolSize"] = minSize + (nodeCounts[id] - minValue) / (maxValue - minValue) * sizeRange;;  
      }
    });
}

let tableInfo = []

let idSet = new Set(nodesFiltered.map(node => node.id));

for(let m = edgesFiltered.length-1; m >-1; m--)
{ 
  if(!idSet.has(edgesFiltered[m].source) || !idSet.has(edgesFiltered[m].target)) 
    continue;

tableInfo.push({'Regulation Type':edgesFiltered[m].type2 , 'Direction': edgesFiltered[m].type, 'Gene Symbol From': edgesFiltered[m].source,'Gene Symbol To':edgesFiltered[m].target,'Score': edgesFiltered[m].value, 'Source NC': nodeCounts[edgesFiltered[m].source], 'Target NC': nodeCounts[edgesFiltered[m].target], 'Total NC': nodeCounts[edgesFiltered[m].target] +nodeCounts[edgesFiltered[m].source ]})
}
setkeyedData(tableInfo)


let nodesFinal =[]
let edgesFinal =[]

if(graphmapSettings.layout ==="none"){ 
    // Create a new directed graph 
    var g = new dagre.graphlib.Graph();    
    // Set an object for the graph label
    g.setGraph({      
      height:100,
      width:100,
      ranksep:800,
      nodesep:100
    });
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
    //edge["weight"]  = nodeCounts[edge.target] + nodeCounts[edge.source]
    //if(edge.type2 === "Corr") continue;
    
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


console.log("nodesFinal", nodesFinal)
console.log("edgesFinal",edgesFinal)

setOptions({
  tooltip: {
    formatter: function (params) {        
      let kd = "";
      if(params.data.kd)
      kd = kd + "<br>Knockdown: " + params.data.kd;

      if(params.data.neighbourCount)
      kd = kd + "<br>Neighbour Count: " + params.data.neighbourCount;
      return params.data.name + kd ;
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
  toolbox: {
    show: true,
    feature: {
      mark: { show: true },       
      restore: { show: true },
      saveAsImage: { show: true },
      dataZoom: {},       
    },
  },
  brush: {},    
  series: [
    {
      autoCurveness: true,     
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
        position: 'top',
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
        width: 4,
      },
      draggable:true,  
     // categories: sample.categories,
      roam: true,        
      force: {
        repulsion: graphmapSettings.repulsion,
        initLayout: 'circular',
        //layoutAnimation : false,
        friction:0.1
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
            label: 'Link Table',
          }
        ]}
        onSelected={(key) => setSelectedView(key)}
        value={selectedView}
      />
      
      {keyedData && selectedView === 1 && (
        <EnrichmentTable keyedData={keyedData} headings = {headings} helps= {helps} />
      )}
      {selectedView === 0 && (
        <>
        <div className={styles.mainView}>
         <ReactEChartsCore
    echarts={echarts}
    option={options}
    style={{ height: '120%', width: '100%' }}
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

const MainContainer = connect(mapStateToProps)(GeneRegulation);

export { MainContainer as GeneRegulation };;


