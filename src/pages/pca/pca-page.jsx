import React, {useEffect, useState} from 'react';
import { connect } from 'react-redux';
import { ScatterPlot } from '../../components/scatterPlot';
import { ModulePathNames } from '../../store/results/enums';
import { Heading, Spacer, Row } from "@oliasoft-open-source/react-ui-library";
import styles from './pca-page.module.scss';
import { OffcanvasHeader } from 'react-bootstrap';
import "echarts-gl";
import * as echarts from "echarts/core";
import { registerTransform } from "echarts/core";
//import GraphChart from 'echarts/charts';
import { EffectScatterChart, CustomChart, LineChart, BarChart } from "echarts/charts";
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
import ReactEChartsCore from "echarts-for-react/lib/core";

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
  LineChart,
  BarChart,
  CanvasRenderer,
  DataZoomComponent,
  DatasetComponent,
  ToolboxComponent,
]);

const PcaPage = ({ pcaResults }) => {
  const [options, setOptions] = useState({});

  useEffect(() => {  
  var cumulative_ratio = []  
  var explained_ratio = []  
  if(pcaResults && pcaResults.ratio){    
    
    
    explained_ratio = [...pcaResults.ratio].map((val) => val*100)    
    cumulative_ratio = [...explained_ratio]     
    for(let i =1 ; i< cumulative_ratio.length; i++)        
      cumulative_ratio[i] = explained_ratio[i] + cumulative_ratio[i-1]
  

   console.log(pcaResults.ratio,cumulative_ratio)

   setOptions({
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross',
        crossStyle: {
          color: '#999'
        }
      }

    },
    dataZoom: [
      {
        show: true,
        realtime: true,        
        xAxisIndex: [0, 1]
      },
      {
        type: 'inside',
        realtime: true,        
        xAxisIndex: [0, 1]
      }
    ],
    toolbox: {
      feature: {
        dataView: { show: true, readOnly: false },
        magicType: { show: true, type: ['line', 'bar'] },
        restore: { show: true },
        saveAsImage: { show: true }
      }
    },
    legend: {
      data: ['Cummulative Variance Explained', 'Variance Explained']
    },
    xAxis: [
      {
        type: 'category',
      }
    ],
    yAxis: [
      {
        nameRotate: 90,
        scale: true,       
        nameLocation : "center",
        nameGap: 50,
        nameTextStyle:{
          fontWeight:'bold',
          fontSize : '14',
          verticalAlign : 'center',
        },

        type: 'value',       
        min: 0,
        max: explained_ratio[0],
        name : "Variance exp.",        
        interval: Math.round(explained_ratio[0]/5),
        axisLabel: {
          formatter: '{value}  %',          
        }
      },
      {
        nameRotate: 90,
        scale: true,       
        nameLocation : "center",
        nameGap: 50,
        nameTextStyle:{
          fontWeight:'bold',
          fontSize : '14',
          verticalAlign : 'center',
        },
        name:  'Cumm. var. exp.',
        type: 'value',       
        min: 0,
        max: 100,
        interval: 20,
        axisLabel: {
          formatter: '{value} %'
        }
      }
    ],
    series: [
      {
        name: 'Variance Explained',
        type: 'bar',
        tooltip: {
          valueFormatter: function (value) {
            return value.toFixed(2);
          }
        },
        data: explained_ratio
      },
      {
        name: 'Cummulative Variance Explained',
        type: 'line',
        yAxisIndex: 1,
        tooltip: {
          valueFormatter: function (value) {
            return value.toFixed(2) + ' %';
          }
        },
        data: cumulative_ratio,
      }
    ]
  });
} 
},[pcaResults])

  return (
    <div className={styles.mainView}>
      <Heading>PCA</Heading>
        <Spacer />
      {pcaResults ? (
        <> 
        <div className={styles.infoSection}> Total number of principal components: {pcaResults.ratio?.length}</div>
        <Row spacing={0} width="100%" height="35%">
          <ReactEChartsCore
            echarts={echarts}
            option={options}
            style={{ height: "100%", width: "100%" }}
            notMerge={true}
            lazyUpdate={true}
          />
        </Row>
        <Spacer height="2em" />

        <ScatterPlot graphData={pcaResults} /> 
        </>
      ): (
        <div className={styles.infoSection}>
          <p className={styles.moduleTextInfos}>
          <img alt='PCA' src='/images/PCA.png' className={`${styles['float-right']}`}/>
          Principal Component Analysis (PCA) aids visualization and interpretation of rich datasets by reducing their dimensionality with minimal information loss. Given a dataset with an N-dimensional space, where N represents the number of variables under investigation, PCA summarizes the data by making a linear transformation of vectors into a new coordinate system with fewer, uncorrelated variables - the Principal Components. These variables successively maximize variance from the original matrix and graphically simplify the identification of trends, clusters, and correlation among the subjects to analysis.
          
          <p style={{ color: 'DodgerBlue'}} > <a href="https://en.wikipedia.org/wiki/Principal_component_analysis" target="_blank" rel="noreferrer">Read More</a> </p>

          </p>
          
        </div>
      )}
    </div>
  );
};

const mapStateToProps = ({ calcResults }, { path }) => ({
  pcaResults: calcResults?.[ModulePathNames?.[path]]?.result ?? null,
});

const MainContainer = connect(mapStateToProps)(PcaPage);
export { MainContainer as PcaPage };