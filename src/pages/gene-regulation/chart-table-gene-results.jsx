import React, { useState } from 'react';
import { Table, Spacer, ButtonGroup } from '@oliasoft-open-source/react-ui-library';
import { FaChartBar, FaTable } from 'react-icons/fa';
import styles from './gene-regulation-page.module.scss';

import { connect } from 'react-redux';
import { useEffect } from 'react';
import * as echarts from 'echarts/core';
//import GraphChart from 'echarts/charts';
import {GraphChart} from 'echarts/charts';

import { GridComponent, TooltipComponent,TitleComponent, DataZoomComponent,DatasetComponent,ToolboxComponent} from 'echarts/components';
import {
  CanvasRenderer,
  // SVGRenderer,
} from 'echarts/renderers';
import ReactEChartsCore from 'echarts-for-react/lib/core';
import dagre from 'dagre';




echarts.use(
  [TitleComponent, TooltipComponent, GridComponent, GraphChart, CanvasRenderer, DataZoomComponent,DatasetComponent,ToolboxComponent]
);

const ChartTableResultsGene = ({
  tableData, geneRegulationGraph,graphmapSettings, pathfinderSettings,
}) => {
  const [selectedView, setSelectedView] = useState(1);
  const [options, setOptions] = useState({}); 
  console.log("Start of the page")
  useEffect(() => {
    console.log("USe effect")
    if(geneRegulationGraph && geneRegulationGraph.nodes &&geneRegulationGraph.nodes.length >0){

      // Create a new directed graph 
      var g = new dagre.graphlib.Graph();

      // Set an object for the graph label
      g.setGraph({});

      // Default to assigning a new object as a label for each new edge.
      g.setDefaultEdgeLabel(function() { return {}; });

      // Add nodes to the graph. The first argument is the node id. The second is
      // metadata about the node. In this case we're going to add labels to each of
      // our nodes.
      console.log("geneRegulationGraph",geneRegulationGraph)
      
      var edges = [] 
      var nodes = [] 
      if(graphmapSettings.layout ==="none"){
            var nodesx = geneRegulationGraph.nodes;
            var edgesx = geneRegulationGraph.edges;
          
            console.log(graphmapSettings.layout)
            // Add nodes
            nodesx.forEach(function(node) {  
                g.setNode(node.id, {
                    id: node.id,
                    name: node.id, 
                    symbolSize: 35,   
                    direction:node.direction,
                    kd:node.kd,
                    count:node.count,
                    lineStyle: {opacity: node.kd? Math.min(0.4118*node.kd + 1.0235,1):0.5}, 
                    width: -5050, 
                    height: -5500                   
                  });
                
            });  
          
            // Add edges
            edgesx.forEach(function(edge) {                
                g.setEdge(edge.From, edge.To,
                  {
                    source: edge.From,
                    target: edge.To,
                    id: edge.id,
                    value: edge.value,
                    lineStyle: {opacity:Math.min(0.4118*Math.abs(edge.value) + 0.1765,1), color:
                      edge.id.includes("+cor+")?'rgb(25, 25, 250)':(edge.value < -0.3  ? 'rgb(25, 206, 17)': (edge.value > 0.3  ? 'rgb(255, 1, 1)':'rgb(123, 123, 123)')),
                      type: edge.id.includes("+cor+")? 'dotted': (edge.id.includes("+int+")  ? 'dashed':'solid'),
                      curveness: edge.id.includes("+cor+")? 0.3: (edge.id.includes("+int+")  ? 0.5:(Math.floor(Math.random() * 12)-6)/10),
                    },
                  
                    
                    tooltip: {
                      formatter: edge.id.includes("+cor+")? 'Correlation R: '+  edge.value: (edge.id.includes("+int+")  ? 'Protein-Protein Intereation: ':'Effect: '+  edge.value),
                    }, 
                  });
            });           
          
      dagre.layout(g);
       
      for (let x in g._edgeLabels  )
      edges.push(g._edgeLabels[x])

      for (let x in g._nodes)
      nodes.push(g._nodes[x])
    }
    else
    {
        nodes = geneRegulationGraph.nodes.map(node => ({      
        id: node.id,
        name: node.id, 
        symbolSize: 15,   
        direction:node.direction,
        kd:node.kd,
        count:node.count,
        lineStyle: {opacity: node.kd? Math.min(0.4118*node.kd + 1.0235,1):0.5}      
  
    }));
  
        edges = geneRegulationGraph.edges.map(edge => ({
      source: edge.From,
      target: edge.To,
      id: edge.id,
      value: edge.value,
      lineStyle: {opacity:Math.min(0.4118*Math.abs(edge.value) + 0.1765,1), color:
        edge.id.includes("+cor+")?'rgb(25, 25, 250)':(edge.value < -0.3  ? 'rgb(25, 206, 17)': (edge.value > 0.3  ? 'rgb(255, 1, 1)':'rgb(123, 123, 123)')),
        type: edge.id.includes("+cor+")? 'dotted': (edge.id.includes("+int+")  ? 'dashed':'solid'),
        curveness: edge.id.includes("+cor+")? 0.3: (edge.id.includes("+int+")  ? 0.5:0.4),
      }, tooltip: {
        formatter: edge.id.includes("+cor+")? 'Correlation R: '+  edge.value: (edge.id.includes("+int+")  ? 'Protein-Protein Intereation: ':'Effect: '+  edge.value),
      },      
      //value: edge.value,
      }));
    }



let edgesFinal = []; 

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
  edgesFinal.push(edges[edge])
} 

console.log("edgesFinal", edgesFinal)


let nodesFinal = nodes;  
if(!graphmapSettings.isolatednodes){
  let nodeNamesWithEdges = edgesFinal.map(function (edge) {
    if(edge.source != edge.target)
    return edge.source;
  }).concat(edgesFinal.map(function (edge) {
    if(edge.source != edge.target)      
    return edge.target;
  }));

  let uniqueNodeNamesWithEdges = [...new Set(nodeNamesWithEdges)];    
  let filteredData = nodes.filter(function (node) {
    return uniqueNodeNamesWithEdges.includes(node.id);
  });
  nodesFinal = filteredData;    
}

console.log("Before Filter ", nodesFinal)

nodesFinal = nodesFinal.filter(node => node.count > 1);
console.log("Filtered nodes ", nodesFinal)


setOptions({
  tooltip: {
    formatter: function (params) {        
      let kd = '';
      if(params.data.kd)
      kd = "Knockdown: " + params.data.kd;
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
  
  series: [
    {
      selectMode:'multiple',
      select: {
        disabled :false,
      },
      type: 'graph',
      layout:  graphmapSettings.layout,       
      data: nodesFinal,
      links: edgesFinal,       
      edgeSymbol: ['circle', 'arrow'],
      edgeSymbolSize: [4, 20],
      edgeLabel: {
        fontSize: 20
      },

      label: {
        show: true,
        position: 'inside',
        formatter: function (params) {
          return params.data.name;
        },
        fontSize: 8,
        fontWeight: 'bold',
        color: 'white'
      },
      emphasis: {
        focus: 'adjacency',
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
        //opacity: 0.9,          
        borderColor : 'black',
        borderWidth :3

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

}, [geneRegulationGraph, graphmapSettings, pathfinderSettings]);


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
      {tableData && selectedView === 1 && (
        <Table table={tableData} />
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
  pathfinderSettings: settings?.pathfinder ?? {},
})

const MainContainer = connect(mapStateToProps)(ChartTableResultsGene);

export { MainContainer as ChartTableResultsGene };;


