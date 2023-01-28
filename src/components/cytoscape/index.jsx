import React, { useEffect, useRef,useState  } from 'react';
import { connect } from 'react-redux';
import COSEBilkent from 'cytoscape-cose-bilkent';
import EchartsReact  from 'echarts-for-react';
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
// import text from './sample.json';

echarts.use(
  [TitleComponent, TooltipComponent, GridComponent, GraphChart, CanvasRenderer, DataZoomComponent,DatasetComponent,ToolboxComponent]
);

const Cytoscape = ({ pathFinderGraph }) => {

    //Import json file. Used in {options}.
 
  const [options, setOptions] = useState({});
  {console.log(pathFinderGraph)}
  useEffect(() => {
    if(sample){
      {console.log("Here it is")}

    const nodes = pathFinderGraph.nodes.map(node => ({      
      id: node.id,
      name: node.id, 
      symbolSize: 15,   
      direction:node.direction,
  }));
  const edges = pathFinderGraph.edges.map(edge => ({
      source: edge.source,
      target: edge.target,
      //value: edge.value,
  }));

  {console.log(edges)}

  setOptions({
    tooltip: {},
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
        layout: 'force',        
        data: nodes,
        links: edges,
        edgeSymbol: ['circle', 'arrow'],
        edgeSymbolSize: [4, 10],
        edgeLabel: {
          fontSize: 20
        },

        label: {
          show: false,
          position: 'inside',
          formatter: function (params) {
            return params.data.name;
          },
          fontSize: 14,
          fontWeight: 'bold',
          color: 'red'
        },
        
        itemStyle:{
          color: function (params) {
            console.log(params);
            if (params.data.direction == "down") {
                return 'green';
            } else {
              
               return 'red';
            }
          }

        },
        lineStyle: {
          opacity: 0.9,
          width: 2,
          curveness: 0.3          
        },
       // categories: sample.categories,
        roam: true,        
        force: {
          repulsion: 100
        }
      }
    ]
});

}

  }, [pathFinderGraph]);

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



const mapStateToProps = ({ calcResults }) => ({
  pathFinderGraph: calcResults?.pathFinderGraph ?? null,
})

const MainContainer = connect(mapStateToProps)(Cytoscape);

export { MainContainer as Cytoscape };;