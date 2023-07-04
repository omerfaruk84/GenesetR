import React, { useEffect, useRef,useState  } from 'react';
import { connect } from 'react-redux';
import * as echarts from 'echarts/core';
//import GraphChart from 'echarts/charts';
import {GraphChart} from 'echarts/charts';
import { GridComponent, TooltipComponent,TitleComponent, DataZoomComponent,DatasetComponent,ToolboxComponent} from 'echarts/components';
import {
  CanvasRenderer,
  // SVGRenderer,
} from 'echarts/renderers';
import ReactEChartsCore from 'echarts-for-react/lib/core';
// import text from './sample.json';
import dagre from 'dagre';

echarts.use(
  [TitleComponent, TooltipComponent, GridComponent, GraphChart, CanvasRenderer, DataZoomComponent,DatasetComponent,ToolboxComponent]
);

const PathFinder = ({ pathFinderGraph , graphmapSettings, pathfinderSettings}) => {

    //Import json file. Used in {options}.
 
  const [options, setOptions] = useState({}); 
  useEffect(() => {

    if(pathFinderGraph && pathFinderGraph.nodes &&pathFinderGraph.nodes.length >0){

    const nodes = pathFinderGraph.nodes.map(node => ({      
      id: node.id,
      name: node.id, 
      direction:node.direction,
      kd:node.kd,
       

  }));

  


  const edges = pathFinderGraph.edges.map(edge => ({
      source: edge.source,
      target: edge.target,
      id: edge.id,
      value: edge.value,
      lineStyle: {
        opacity:Math.min(0.32*Math.abs(edge.value) + 0.04,1), 
        width:Math.max(4*Math.abs(edge.value) - 1,1), 
        color:edge.id.includes("+cor+")?'rgb(25, 25, 250)':(edge.value < -0.3  ? 'rgb(25, 206, 17)': (edge.value > 0.3  ? 'rgb(255, 1, 1)':'rgb(123, 123, 123)')),
        type: edge.id.includes("+cor+")? 'dotted': (edge.id.includes("+int+")  ? 'dashed':'solid'),
        curveness: edge.id.includes("+cor+")? 0.3: (edge.id.includes("+int+")  ? 0.5:0.4),
      },
      
      tooltip: {
        formatter: edge.id.includes("+cor+")? 'Corr. R: '+  edge.value +'<br />' + edge.id.replace("+cor+"," ~ ") : (edge.id.includes("+int+")  ? 'Protein-Protein Intereation: ':'Effect: '+  edge.value +'<br />' + edge.id.replace("+"," → ")),
      },      
      //value: edge.value,
  }));

  let edgesFiltered = []; 

  for(let edge in edges){     
    if(edges[edge].id.includes("+cor+"))
    {
      if(pathfinderSettings.checkCorr === false) continue;
    
      if(Math.abs(edges[edge].value) < pathfinderSettings.corrCutOff) continue;
    } else if(edges[edge].id.includes("+int+") && pathfinderSettings.BioGridData == false){
      continue;      
    }else 
    {     
      if(Math.abs(edges[edge].value) < pathfinderSettings.cutoff) continue;
    }
    edgesFiltered.push(edges[edge])
  } 




  let nodesFiltered = nodes;  
  if(!graphmapSettings.isolatednodes){
    let uniqueNodeNamesWithEdges = new Set()
    edgesFiltered.forEach(edge => {    
      if(edge.source !== edge.target){ 
        uniqueNodeNamesWithEdges.add(edge.source)
        uniqueNodeNamesWithEdges.add(edge.target)
      }
    });
    nodesFiltered = nodes.filter(function (node) {
      return uniqueNodeNamesWithEdges.has(node.id);
    });  
  }

  let nodesFinal = [];  
  let edgesFinal = []; 

  if(graphmapSettings.layout ==="none"){ 
    // Create a new directed graph 
    var g = new dagre.graphlib.Graph();    
    // Set an object for the graph label
    g.setGraph({      
      height:500,
      width:500,
      ranksep:200
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

// Create a map to keep track of node counts
const nodeCounts = {};

// Count number of each node in edges array
edgesFinal.forEach(edge => {
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

console.log(nodeCounts)
// Update node counts in nodes array
nodesFinal.forEach(node => {
  const { id } = node;
  if (nodeCounts[id]) {
    node["symbolSize"] = Math.max(Math.min(nodeCounts[id]*5 +3,50),8);
    node["neighbours"] = nodeCounts[id];
    node["label"] = {show: nodeCounts[id]>1,  position: nodeCounts[id]>6? "inside":'right' , color: nodeCounts[id]>6? "white":'black'};
    node["opacity"] = Math.max(Math.min(nodeCounts[id]*4 +4,40),8);
    node["itemStyle"] = {
      color: nodeCounts[id]>6? "red":'orange',
      opacity: node["kd"]? Math.min(0.4118*Math.abs(node["kd"]),1):0.5
  };

  }
});
console.log(nodesFinal)
  

  setOptions({
    tooltip: {
      formatter: function (params) {        
        let kd = '';
        if(params.data.kd)
        kd = "Knockdown: " + params.data.kd + (params.data.neighbours?"<br>Neighbour Count: " + params.data.neighbours:"");
        return params.data.name + "<br>" + kd ;
      },
      

    },
    //legend: [
    //  {
        // selectedMode: 'single',
    //    data: pathFinderGraph.categories.map(function (a) {
    //      return a.name;
    //    })
    //  }
    //],
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
        type: 'graph',
        autoCurveness: true,
        circular: {
          rotateLabel: true
        },
        layout:  graphmapSettings.layout,       
        data: nodesFinal,
        links: edgesFinal,       
        edgeSymbol: ['circle', 'arrow'],
        edgeSymbolSize: [4, 14],
        edgeLabel: {
          fontSize: 16
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
          blurScope: 'global',
          lineStyle: {
            width: 6
          }
        },
        
        itemStyle:{
          color: function (params) {            
            if (params.data.direction === "down") {
                return '#1e81b0';
            } else {              
               return 'red';
            }
          },                  
          borderColor : 'black',
          borderWidth :2
        },
        lineStyle: {          
          width: 4,
        },
       // categories: sample.categories,
        roam: true,        
        force: {
          repulsion: graphmapSettings.repulsion,
          //layoutAnimation : false,
          friction:0.05
        }
      }
    ]
});

}

  }, [pathFinderGraph, graphmapSettings, pathfinderSettings]);

  return (
    /*<EchartsReact
        option={options}
        style={{ height: '100%', width: '100%' }}
    />*/

    <ReactEChartsCore
    echarts={echarts}
    option={options}
    style={{ height: '100%', width: '100%' }}
    notMerge={true}
    lazyUpdate={true}    
    />
);
  

}



const mapStateToProps = ({  settings,calcResults }) => ({
  pathFinderGraph: calcResults?.pathFinderGraph?.result ?? null,
  graphmapSettings: settings?.graphmap ?? {},
  pathfinderSettings: settings?.pathfinder ?? {},
})

const MainContainer = connect(mapStateToProps)(PathFinder);

export { MainContainer as PathFinder };;