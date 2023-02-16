import React, { useEffect, useRef,useState  } from 'react';
import { connect } from 'react-redux';
import * as echarts from 'echarts/core';
//import GraphChart from 'echarts/charts';
import sample from './les-miserables.json';
import {GraphChart} from 'echarts/charts';
import { GridComponent, TooltipComponent,TitleComponent, DataZoomComponent,DatasetComponent,ToolboxComponent} from 'echarts/components';
import {
  CanvasRenderer,
  // SVGRenderer,
} from 'echarts/renderers';
import ReactEChartsCore from 'echarts-for-react/lib/core';
import { data } from 'jquery';
// import text from './sample.json';

echarts.use(
  [TitleComponent, TooltipComponent, GridComponent, GraphChart, CanvasRenderer, DataZoomComponent,DatasetComponent,ToolboxComponent]
);

const Cytoscape = ({ pathFinderGraph , graphmapSettings, pathfinderSettings}) => {

    //Import json file. Used in {options}.
 
  const [options, setOptions] = useState({}); 
  useEffect(() => {
    if(pathFinderGraph && pathFinderGraph.nodes &&pathFinderGraph.nodes.length >0){


    const nodes = pathFinderGraph.nodes.map(node => ({      
      id: node.id,
      name: node.id, 
      symbolSize: 35,   
      direction:node.direction,
      kd:node.kd,
      lineStyle: {opacity: node.kd? Math.min(0.4118*node.kd + 1.0235,1):0.5}
      

  }));

  


  const edges = pathFinderGraph.edges.map(edge => ({
      source: edge.source,
      target: edge.target,
      id: edge.id,
      value: edge.value,
      lineStyle: {opacity:Math.min(0.4118*Math.abs(edge.value) + 0.1765,1), color:
        edge.id.includes("+cor+")?'rgb(25, 25, 250)':(edge.value < -0.3  ? 'rgb(25, 206, 17)': (edge.value > 0.3  ? 'rgb(255, 1, 1)':'rgb(123, 123, 123)')),
        type: edge.id.includes("+cor+")? 'dotted': (edge.id.includes("+int+")  ? 'dashed':'solid'),
        curveness: edge.id.includes("+cor+")? 0.3: (edge.id.includes("+int+")  ? 0.5:0.4),
      },
      
      tooltip: {
        formatter: edge.id.includes("+cor+")? 'Correlation R: '+  edge.value: (edge.id.includes("+int+")  ? 'Protein-Protein Intereation: ':'Effect: '+  edge.value),
      },      
      //value: edge.value,
  }));

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
       // categories: sample.categories,
        roam: true,        
        force: {
          repulsion: graphmapSettings.repulsion,
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
  pathFinderGraph: calcResults?.pathFinderGraph ?? null,
  graphmapSettings: settings?.graphmap ?? {},
  pathfinderSettings: settings?.pathfinder ?? {},
})

const MainContainer = connect(mapStateToProps)(Cytoscape);

export { MainContainer as Cytoscape };;