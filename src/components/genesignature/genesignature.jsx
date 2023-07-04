import React, { useState } from 'react';
import { Table, Spacer, ButtonGroup, Tabs } from '@oliasoft-open-source/react-ui-library';
import { FaChartBar, FaTable } from 'react-icons/fa';
import styles from "../../pages/genesignature/gene-signature-page.module.scss";
import { connect } from 'react-redux';
import { useEffect } from 'react';
import * as echarts from 'echarts/core';
//import GraphChart from 'echarts/charts';
import {ScatterChart} from 'echarts/charts';
import EnrichmentTable from '../enrichment-table';
import { GeneSetEnrichmentTable } from "../enrichment/";
import {getBlackList} from "../../store/api"
import { GridComponent, TooltipComponent,TitleComponent,DataZoomSliderComponent, DataZoomComponent,DatasetComponent,ToolboxComponent} from 'echarts/components';
import {
  CanvasRenderer,
  // SVGRenderer,
} from 'echarts/renderers';
import ReactEChartsCore from 'echarts-for-react/lib/core';

echarts.use(
  [TitleComponent,DataZoomSliderComponent, TooltipComponent, GridComponent, ScatterChart, CanvasRenderer, DataZoomComponent,DatasetComponent,ToolboxComponent]
);
const headings  = ['Gene', 'Effect', 'Score' , 'Z-Score']
const helps = {'Gene':'sgRNAs that mediate effect',
               'Effect': 'Up or down regulation of the signature',
               'Score':'Orginal Z Scores from the raw data',
               'Z-Score':'Z Score based on the distribution'
              }

const GeneSignature = ({coreSettings, genesignatureSettings,  data}) => {
  const [selectedView, setSelectedView] = useState(0);
  const [options, setOptions] = useState({}); 
  const [pointData, setPointData] = useState([]);   
  const [keyedData, setkeyedData] = useState([{}]); 
  const [selectedTab, setSelectedTab] = useState({label: 'Geneset Enrichment', value: 'gsea'});
  const [genelists, setGeneLists] = useState([]); 
  const [blackListDown, setblackListDown] = useState({});
  const [blackListUp, setblackListUp] = useState({});
  //For tabs under the table
  const tabOptions = [
    {
      label: 'Geneset Enrichment',
      value: 'gsea',
    },
    {
      label: 'HeatMap',
      value: 'heatmap',
    },
    {
      label: 'Network',
      value: 'network',
    }
  ];


  console.log("Start of the page")

  //Function to find nearest index

  function findNearestIndex(arr,distY, target) {
    let left = 0;
    let right = arr.length - 1;
    
     
    
    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      if (arr[mid] === target) {
        return getRandomArbitrary(-1* distY[mid] * 10 -5, distY[mid] * 10 +5);        
      } else if (arr[mid] > target) {
        right = mid - 1;
      } else {
        left = mid + 1;
      }
    }
  
    if (right < 0) {
      right = 0;
    }
  
    if (left >= arr.length) {
      left = arr.length - 1;
    }
  
    const nearest = (target - arr[right] < arr[left] - target) ? right : left;
    
    if(target>5)
    console.log(target, nearest, distY[nearest])
    //we have the nearest index 
    //return a random Y in the range 
    return getRandomArbitrary(-1* distY[nearest] * 10 -5, distY[nearest] * 10 +5);
  }
  
  function getRandomArbitrary(min, max) {
    return Math.random() * (max - min) + min;
  }


  function trimmedMean(arr, trimPercentage) {
    // Sort the array in ascending order
    arr = arr.slice().sort(function(a, b) {
      return a - b;
    });
  
    // Determine the number of elements to trim
    var trimCount = Math.floor(arr.length * (trimPercentage / 100));
  
    // Remove the specified number of elements from both ends
    var trimmedArr = arr.slice(trimCount, arr.length - trimCount);
  
    // Calculate the mean of the remaining elements
    const mean = trimmedArr.reduce((a, b) => a + b) / trimmedArr.length;
    const std = Math.sqrt(trimmedArr.reduce((a, b) => a + (b - mean) ** 2, 0) / (trimmedArr.length - 1));


  
    return {'mean':mean, 'std':std};
  }
   
  
  
useEffect(()=> {
    
    getBlackList().then((result)=> {
      const genesUp = {};
      const genesDown= {};
  
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
    })
  },[] )
  


  useEffect(() => {

    let highlightList = new Set(coreSettings.targetGeneList.replaceAll(/\s+|,|;/g, '\n').replaceAll(/\n+/g, '\n').trimStart('\n').split('\n'))
   
    if(data.geneRegulationResults && data.geneRegulationResults.x && data.geneRegulationResults.x.length>0)
    {
   
    
      //const chart = echarts.init(chartRef.current);
      let xValues = data.geneRegulationResults.results;
      const labels = data.geneRegulationResults.genes;
      const distX = data.geneRegulationResults.x;
      const distY = data.geneRegulationResults.y;      
      let tableInfo = []
      const pointData = []   

      var results = trimmedMean(xValues,0.2)  
      if(results.mean === undefined) results.mean =0
      if(results.std === undefined) results.std =1
        // Calculate the Z-scores for each data point
      const zScores = xValues.map((value) => (value - results.mean) / results.std);
      
      console.log("highlightList", highlightList,coreSettings )
      
      for (let i = 0; i<xValues.length;i++){
        if(genesignatureSettings.filter && xValues[i]<0 && blackListDown[labels[i]] !== undefined && blackListDown[labels[i]]>genesignatureSettings.filterBlackListed) continue;
        else if( genesignatureSettings.filter && xValues[i]>0 && blackListUp[labels[i]] !== undefined && blackListUp[labels[i]]>genesignatureSettings.filterBlackListed) continue;
        pointData.push([xValues[i], findNearestIndex(distX,distY, xValues[i]),labels[i], zScores[i], highlightList.has(labels[i]) ])
        tableInfo.push({'Gene':labels[i] , 'Effect':zScores[i]>2?"UP":zScores[i]<-2?"DOWN":"NO CHANGE"  , 'Score':xValues[i],'Z-Score':zScores[i] })
      }

      const sortedtableInfo = tableInfo.sort((geneA, geneB) => geneB["Z-Score"] - geneA["Z-Score"])
  
  
      

      const upreg = tableInfo.filter(gene => gene.Effect === "UP").map(gene => gene.Gene);
      const dowreg = tableInfo.filter(gene => gene.Effect === "DOWN").map(gene => gene.Gene);
      const top20  = sortedtableInfo.slice(0, 20).map(gene => gene.Gene);
      const top50  = sortedtableInfo.slice(0, 50).map(gene => gene.Gene);
      const top100  = sortedtableInfo.slice(0, 100).map(gene => gene.Gene);
      const bottom20  = sortedtableInfo.slice(Math.max(sortedtableInfo.length - 20, 0)).map(gene => gene.Gene);
      const bottom50  = sortedtableInfo.slice(Math.max(sortedtableInfo.length - 50, 0)).map(gene => gene.Gene);
      const bottom100  = sortedtableInfo.slice(Math.max(sortedtableInfo.length - 100, 0)).map(gene => gene.Gene);
      const temp = {}
      temp["Upregulated"] = upreg.join()
      temp["Downregulated"] = dowreg.join()
      temp["Top 20 Upregulated"] = top20.join()
      temp["Top 50 Upregulated"] = top50.join()
      temp["Top 100 Upregulated"] = top100.join()
      temp["Top 20 Downregulated"] = bottom20.join()
      temp["Top 50 Downregulated"] = bottom50.join()
      temp["Top 100 Downregulated"] = bottom100.join()

      setGeneLists(temp)

      setkeyedData(tableInfo)


      console.log("pointData", pointData)
      setPointData(pointData)
    
  }
  }, [data, coreSettings.targetGeneList, genesignatureSettings]);

  useEffect(() => {
    if (!data.geneRegulationResults)
     return 

  setOptions({
    legend: {},
    tooltip: {      
      formatter: function (params) {
       
        return params.data[2] + '\n' + params.data[0];
      }
    },
    xAxis: [ {
      type: 'value',
      min:data.geneRegulationResults.x[0] - 0.1,
      max:data.geneRegulationResults.x[data.geneRegulationResults.x.length-1] + 0.1        
       
    },
    {
      type: 'value',    
      //show: false,  
      min:data.geneRegulationResults.x[0] - 0.1,
      max:data.geneRegulationResults.x[data.geneRegulationResults.x.length-1] + 0.1 
      
    }],
    yAxis: {},
    dataZoom: [
      {
        type :'slider',
        show: true,
        realtime: true,
        xAxisIndex:[1,0],                
      }
    ],
    toolbox: {
      feature: {
        dataZoom: {
          yAxisIndex: 'none'
        },
        restore: {},
        saveAsImage: {}
      }
    },    
    legend: [
      
    ],
    series: [{
      roam: true, 
      data: pointData,
      itemStyle: {
        color: function(params) {         
          if (params.data[2].startsWith("non-targeting"))
            return 'rgba(216, 245, 39, 0.5)'; //yellow
          else if (params.data[4] === true) {
              return 'rgba(39, 96, 245, 0.7)';} //blue highlight
          else if (params.data[3] > 2) {
            return 'rgba(39, 245, 55, 0.7)'; //green
          } else if (params.data[3] < -2) {
            return 'rgba(245, 55, 39, 0.7)'; //red
          } else {
            //if( params.data[3]> -2 &&params.data[3]<2 )
              return 'rgba(200, 200, 200,' + String((Math.abs(params.data[3])+0.1)*0.15+0.185) + ')' ;
          }
        }},
        label: {
          show: true,
          color:'black',
          position:'top',
          fontSize:14,
          formatter: function (params) {
            if (params.data[4] === true) {
              return params.data[2];
            } else if (params.data[3] > 2 || params.data[3] < -2) {
              return params.data[2];
            } else {
              return '';
            }
          }
        },
        symbolSize:function(params) { 
        if (params[2].startsWith("non-targeting"))
        return 6;
        else if (params[3] > 2 || params[3] < -2)
        return 10;
        else
         return Math.round(Math.abs(params[3])*2.5+3); 
      },
      type: 'scatter',          
    },
    {
      name: 'Series 2',
      type: 'line',
      roam: true, 
      symbol: 'none',
      lineStyle: {        
        width:0
      }, 
          
      xAxisIndex: 1, // use the second x-axis for this series
      yAxisIndex: 0, // use the second y-axis for this series
      data: data.geneRegulationResults.x.map(function (value, index) {
        return [value, data.geneRegulationResults.y[index]];
      })   
      
      
      
    },  
  ]
  })},[pointData])




/*
  useEffect(() => {
    console.log("USe effect")
    if(data && data.x && data.x.length >0 && data.results){     
      

      
      for(let m = edges.length-1; m >-1; m--)
      {  
        rows.push({cells: [{value: edges[m].type2},{value: edges[m].type},{value: edges[m].source},{value: edges[m].target},{value: edges[m].value}]});
        tableInfo.push({'Regulation Type':edges[m].type2 , 'Direction': edges[m].type, 'Gene Symbol From': edges[m].source,'Gene Symbol To':edges[m].target,'Score': edges[m].value})
      }
      setkeyedData(tableInfo)
      



      }
}, [geneRegulationGraph, graphmapSettings, geneRegulationCoreSettings]);
*/

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
      <Spacer height={5}/>
      {keyedData && selectedView === 1 && (
      <> 
        <EnrichmentTable keyedData={keyedData} headings = {headings} helps= {helps} />        
      </>
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
      <Spacer height={5} />
      
      {genelists && (
       <> 
      <Tabs name="tabs" value={selectedTab} options={tabOptions}
          onChange={(evt) => {const { value, label } = evt.target;
          setSelectedTab({ value, label });
          }}
        />

         <GeneSetEnrichmentTable genesets={genelists}/>        
         </>
      )}
      


    </>
  );
};

const mapStateToProps = ({  settings }) => ({
  coreSettings: settings?.core ?? {},  
  genesignatureSettings: settings?.genesignature ?? {}

})

const MainContainer = connect(mapStateToProps)(GeneSignature);

export { MainContainer as GeneSignature };;


