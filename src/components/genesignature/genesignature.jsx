import React, { useState, useMemo } from "react";
import {
  Spacer,
  ButtonGroup,
  Tabs,
} from "@oliasoft-open-source/react-ui-library";
import { FaChartBar, FaTable } from "react-icons/fa";
import styles from "../../pages/genesignature/gene-signature-page.module.scss";
import { connect } from "react-redux";
import { useEffect } from "react";
import * as echarts from "echarts/core";
import { Accordion, AccordionSummary, AccordionDetails } from "@mui/material";
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
//import GraphChart from 'echarts/charts';
import { ScatterChart } from "echarts/charts";
import EnrichmentTable from "../enrichment-table-new";
import { GeneSetEnrichmentTable } from "../enrichment";

import {
  GridComponent,
  TooltipComponent,
  TitleComponent,
  DataZoomSliderComponent,
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
  DataZoomSliderComponent,
  TooltipComponent,
  GridComponent,
  ScatterChart,
  CanvasRenderer,
  DataZoomComponent,
  DatasetComponent,
  ToolboxComponent,
]);

const helps = {
  Gene: "sgRNAs that mediate effect",
  Effect: "Up or down regulation of the signature",
  Score: "Orginal Z Scores from the raw data",
  "Z-Score": "Z Score based on the distribution",
};

const helps2 = {
  Gene: "Genes that show similar profile to the current gene signature",
  Similarity:
    "Pearson correlation score between current gene signature and other genes in the data (only abs(r) > 0.1)",
  Included: "Whether gene is currently included in the gene signature",
};

// Add module description and tab explanations
const moduleDescription = {
  title: "Gene Signature Analysis",
  description: "This module identifies genes that induce specific phenotypes upon their perturbation by applying mathematical expressions to z-score normalized data. It helps to identify sets of genes responsible for specific phenotypic changes (e.g. genes that regulate ER stress, cholesterol biosynthesis, etc).",
  tabs: {
    chart: "Graph showing perturbations ranked by their effect on the gene signature. Green dots indicate perturbations that increase the signature, red dots decrease it.",
    table: "Table of all perturbations showing their effect direction and z-scores based on the gene signature analysis.",
    similarGenes: "This table lists genes that show similar expression patterns to your gene signature and may be considered for inclusion in the signature to enhance its specificity. Higher similarity scores indicate stronger correlation with your signature."
  }
};

const GeneSignature = ({ coreSettings, genesignatureSettings, data, blacklistData, blacklistLoading }) => {
  const [selectedView, setSelectedView] = useState(0);
  const [options, setOptions] = useState({});
  const [pointData, setPointData] = useState([]);
  const [pointDistribution, setPointDistribution] = useState([]);
  const [keyedData, setkeyedData] = useState([{}]);
  const [keyedData2, setkeyedData2] = useState([{}]);
  const [selectedTab, setSelectedTab] = useState({
    label: "Geneset Enrichment",
    value: "gsea",
  });
  const [genelists, setGeneLists] = useState([]);


  const columns = useMemo(
    () => [
      {
        accessorKey: "Gene", //normal accessorKey
        header: "Gene",
        size: 75,
        filterVariant: "autocomplete",
        minSize: 50, //min size enforced during resizing
        maxSize: 150,
        muiFilterTextFieldProps: {
          placeholder: "Symbol",
          size: "small",
        },
      },
      {
        accessorKey: "Effect",
        header: "Effect",
        size: 50,
        maxSize: 50,
        filterVariant: "select",
        muiFilterTextFieldProps: {
          placeholder: "Select",
          size: "small",
        },
      },

      {
        accessorKey: "Score",
        header: "Score",
        size: 50,
        filterVariant: "range-slider",
        muiFilterSliderProps: {
          size: "small",
          color: "primary",
          step: 0.01,
        },
        enableResizing: true,
      },
      {
        accessorKey: "Z-Score",
        header: "Z-Score",
        size: 50,
        filterVariant: "range-slider",
        muiFilterSliderProps: {
          size: "small",
          color: "primary",
          step: 0.01,
        },
        enableResizing: true,
      },
    ],
    []
  );

  const columns2 = useMemo(
    () => [
      {
        accessorKey: "Gene", //normal accessorKey
        header: "Gene",
        size: 75,
        filterVariant: "autocomplete",
        minSize: 50, //min size enforced during resizing
        maxSize: 150,
        muiFilterTextFieldProps: {
          placeholder: "Symbol",
          size: "small",
        },
      },

      {
        accessorKey: "Similarity",
        header: "Similarity",
        size: 50,
        filterVariant: "range-slider",
        muiFilterSliderProps: {
          size: "small",
          color: "primary",
          step: 0.01,
        },
        enableResizing: true,
      },
      {
        accessorKey: "Included",
        header: "Included",
        size: 50,
        maxSize: 50,
        filterVariant: "select",
        muiFilterTextFieldProps: {
          placeholder: "Select",
          size: "small",
        },
      },
    ],
    []
  );

  function roundToThree(num) {
    return +(Math.round(num + "e+3") + "e-3");
  }

  //For tabs under the table
  const tabOptions = [
    {
      label: "Geneset Enrichment",
      value: "gsea",
    },
    /*    {
      label: 'HeatMap',
      value: 'heatmap',
    },
    {
      label: 'Network',
      value: 'network',
    }*/
  ];

  //console.log("Start of the page")

  //Function to find nearest index

  function findNearestIndex(arr, distY, target) {
    let left = 0;
    let right = arr.length - 1;

    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      if (arr[mid] === target) {
        return getRandomArbitrary(
          -1 * distY[mid] * 10 - 5,
          distY[mid] * 10 + 5
        );
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

    const nearest = target - arr[right] < arr[left] - target ? right : left;

    if (target > 5)
      //console.log(target, nearest, distY[nearest])
      //we have the nearest index
      //return a random Y in the range
      return getRandomArbitrary(
        -1 * distY[nearest] * 10 - 5,
        distY[nearest] * 10 + 5
      );
  }

  function getRandomArbitrary(min, max) {
    return Math.random() * (max - min) + min;
  }

  function trimmedMean(arr, trimPercentage) {
    // Sort the array in ascending order
    arr = arr.slice().sort(function (a, b) {
      return a - b;
    });

    // Determine the number of elements to trim
    var trimCount = Math.floor(arr.length * (trimPercentage / 100));

    // Remove the specified number of elements from both ends
    var trimmedArr = arr.slice(trimCount, arr.length - trimCount);

    // Calculate the mean of the remaining elements
    const mean = trimmedArr.reduce((a, b) => a + b) / trimmedArr.length;
    const std = Math.sqrt(
      trimmedArr.reduce((a, b) => a + (b - mean) ** 2, 0) /
        (trimmedArr.length - 1)
    );

    return { mean: mean, std: std };
  }

  useEffect(() => {
    // getBlackList().then((result) => {
    //   const genesUp = {};
    //   const genesDown = {};

    //   for (const gene in result.blacklist.ZS) {
    //     if (result.blacklist.ZS[gene] > 0) {
    //       genesUp[gene] = result.blacklist.ZS[gene];
    //     } else {
    //       genesDown[gene] = Math.abs(result.blacklist.ZS[gene]);
    //     }
    //   }
    //   console.log("setblackListDown", genesDown);
    //   console.log("setblackListUp", genesUp);
    //   setblackListDown(genesDown);
    //   setblackListUp(genesUp);
    // });
  }, []);

  useEffect(() => {
    console.log('GeneSignature - Data processing useEffect triggered:', {
      hasData: !!data,
      hasResults: !!(data?.results),
      resultsLength: data?.results?.length || 0,
      hasCorrelations: !!(data?.correlations),
      correlationsKeys: data?.correlations ? Object.keys(data.correlations).length : 0,
      targetGeneList: coreSettings.targetGeneList,
      hasBlacklistData: !!blacklistData,
      blacklistLoading
    });
    
    // Don't return early if blacklist is loading - process data anyway
    if (!data) {
      console.log('GeneSignature - No data, returning early');
      return;
    }
    
    let signatureGenes = coreSettings.targetGeneList
      .replaceAll(/[,\s;]+/g, "+")
      .replaceAll(/\++|\-+/g, "+")
      .trimStart("+")
      .split("+");
    let highlightList = new Set(
      genesignatureSettings?.genesTolabel
        .replaceAll(/[,\s;]+/g, "\n")
        .trimStart("\n")
        .split("\n")
    );
    highlightList = new Set([...highlightList, ...signatureGenes]);

    if (
      data.results &&
      data.results.length > 0
    ) {
      console.log('GeneSignature - Processing data with results:', {
        resultsLength: data.results.length,
        genesLength: data.genes?.length || 0,
        correlationsCount: data.correlations ? Object.keys(data.correlations).length : 0
      });
      //const chart = echarts.init(chartRef.current);
      let xValues = data.results;
      const labels = data.genes;
      let similarGenes = data.correlations;

      let tableInfo = [];
      let similarGenesTableInfo = [];

      let signatureGenesSet = new Set(signatureGenes);

      Object.keys(similarGenes).forEach((gene) =>
        similarGenesTableInfo.push({
          Gene: gene,
          Similarity: similarGenes[gene],
          Included: signatureGenesSet.has(gene.split("_")[0]) ? "YES" : "",
        })
      );
      setkeyedData2(
        similarGenesTableInfo.sort(
          (geneA, geneB) => geneB["Similarity"] - geneA["Similarity"]
        )
      );

      const pointData = [];

      var results = trimmedMean(xValues, 0.2);
      if (results.mean === undefined) results.mean = 0;
      if (results.std === undefined) results.std = 1;
      // Calculate the Z-scores for each data point
      const zScores = xValues.map(
        (value) => (value - results.mean) / results.std
      );

      //console.log("highlightList", highlightList,coreSettings )

      // Determine the range of the data
      let min = Math.min(...zScores);
      let max = Math.max(...zScores);

      // Initialize bins
      let bins = [];
      let binSize = 0.05;
      for (let i = min; i <= max; i += binSize) {
        bins.push({ binStart: i, binEnd: i + binSize, count: 0 });
      }

      // Iterate through data and increment the count of the corresponding bin
      for (let value of zScores) {
        let binIndex = Math.floor((value - min) / binSize);
        bins[binIndex].count++;
      }

      //Calculate rolling average for distribution graph
      const pointDistribution = [];
      for (let i = 2; i <= bins.length - 3; i += 1) {
        pointDistribution.push([
          bins[i].binEnd,
          (bins[i - 2].count +
            bins[i - 1].count +
            bins[i].count +
            bins[i + 1].count +
            bins[i + 2].count) /
            5,
        ]);
      }
      setPointDistribution(pointDistribution);
      //console.log("pointDistribution", pointDistribution)

      //findNearestIndex(distX,distY, xValues[i])
      for (let i = 0; i < xValues.length; i++) {
        // Only apply blacklist filtering if blacklist data is available and filtering is enabled
        if (
          genesignatureSettings.filter &&
          blacklistData &&
          xValues[i] < 0 &&
          blacklistData.blackListDown &&
          blacklistData.blackListDown[labels[i]] !== undefined &&
          blacklistData.blackListDown[labels[i]] > genesignatureSettings.filterBlackListed
        )
          continue;
        else if (
          genesignatureSettings.filter &&
          blacklistData &&
          xValues[i] > 0 &&
          blacklistData.blackListUp &&
          blacklistData.blackListUp[labels[i]] !== undefined &&
          blacklistData.blackListUp[labels[i]] > genesignatureSettings.filterBlackListed
        )
          continue;

        //For sgRNAs that are not significant we dont need to show all.
        if (
          zScores[i] < 1.5 &&
          zScores[i] > -1.5 &&
          !highlightList.has(labels[i])
        ) {
          let randomNum = Math.floor(Math.random() * 10) + 1; //Generate random num 1:10
          if (randomNum < 7) continue;
        }

        let binLoc = bins[Math.floor((zScores[i] - min) / binSize)].count;
        let histY = Math.random() * 2 * binLoc - binLoc;
        pointData.push([
          zScores[i],
          histY,
          labels[i],
          xValues[i],
          highlightList.has(labels[i]),
        ]);
        tableInfo.push({
          Gene: labels[i],
          Effect:
            zScores[i] > 2 ? "UP" : zScores[i] < -2 ? "DOWN" : "NO CHANGE",
          Score: xValues[i],
          "Z-Score": roundToThree(zScores[i]),
        });
      }

      const sortedtableInfo = tableInfo.sort(
        (geneA, geneB) => geneB["Z-Score"] - geneA["Z-Score"]
      );

      const upreg = [];
      const dowreg = [];

      tableInfo.forEach((gene) => {
        if (gene.Effect === "UP") {
          upreg.push(gene.Gene);
        } else if (gene.Effect === "DOWN") {
          dowreg.push(gene.Gene);
        }
      });

      const topRange = 100; // Adjust this value based on the maximum top range you're interested in
      const bottomRange = 100; // Adjust for the maximum bottom range
      const totalLength = sortedtableInfo.length;

      // Calculate slices to map, ensuring we don't map more than necessary
      const maxTopIndex = Math.min(topRange, totalLength);
      const minBottomIndex = Math.max(totalLength - bottomRange, 0);

      // Map only the necessary parts
      const topGenes = sortedtableInfo
        .slice(0, maxTopIndex)
        .map((gene) => gene.Gene);
      const bottomGenes = sortedtableInfo
        .slice(minBottomIndex, totalLength)
        .map((gene) => gene.Gene);

      const temp = {};
      temp["Increases Gene Signature"] = upreg.join();
      temp["Decreasing Gene Signature"] = dowreg.join();
      temp["Top 20 Increasing"] = topGenes.slice(0, 20).join();
      temp["Top 50 Increasing"] = topGenes.slice(0, 50).join();
      temp["Top 100 Increasing"] = topGenes.slice(0, 100).join();
      temp["Top 20 Decreasing"] = bottomGenes
        .slice(Math.max(bottomGenes.length - 20, 0))
        .join();
      temp["Top 50 Decreasing"] = bottomGenes
        .slice(Math.max(bottomGenes.length - 50, 0))
        .join();
      temp["Top 100 Decreasing"] = bottomGenes.join();

      console.log('GeneSignature - Setting table and point data:', {
        tableInfoLength: tableInfo.length,
        pointDataLength: pointData.length,
        sampleTableInfo: tableInfo.slice(0, 3),
        samplePointData: pointData.slice(0, 3)
      });
      
      setGeneLists(temp);
      setkeyedData(tableInfo);
      
      pointData.sort((a, b) => b[0] - a[0]);
      console.log("GeneSignature - Final pointData:", pointData.slice(0, 5));
      setPointData(pointData);
    }
  }, [data, coreSettings.targetGeneList, genesignatureSettings, blacklistData, blacklistLoading]);

  console.log('GeneSignature - pointData state:', pointData);
  useEffect(() => {
    console.log('GeneSignature - Chart options useEffect triggered:', {
      hasData: !!data,
      pointDataLength: pointData?.length || 0,
      pointDistributionLength: pointDistribution?.length || 0
    });
    
    if (!data || !pointData || pointData.length === 0) {
      console.log('GeneSignature - No data for chart options, returning early');
      return;
    }

    setOptions({
      tooltip: {
        formatter: function (params) {
          return params.data[2] + " Score:" + params.data[0]?.toFixed(2);
        },
      },
      xAxis: [
        {
          type: "value",
          //max:pointData.length>0?Math.ceil(pointData[0][0] + 0.1):2,
          //min:pointData.length>0?Math.floor(pointData[pointData.length-1][0] - 0.1):-2
          axisLine: {
            lineStyle: {
              color: "black",
            },
          },
          axisLabel: {
            color: "black",
            fontSize: 16,
          },
          axisTick: {
            lineStyle: {
              color: "black",
            },
          },
          name: "Signature Score (Averaged Z-Score)",
          nameTextStyle: {
            fontSize: 16,
            color: "black",
          },
          nameGap: 38,
          nameLocation: "middle",
        },
      ],
      grid: [
        {
          left: 50,
          top: 20,
          bottom: 100,
        },
      ],
      yAxis: {
        show: false,
      },
      dataZoom: [
        {
          type: "slider",
          show: true,
          //  throttle: 300 ,
          realtime: true,
          // startValue: 10,  // Increase this value
          // endValue: 90,     // Decrease this value
          xAxisIndex: [0],
          //  filterMode: 'empty'
        },
      ],
      toolbox: {
        feature: {
          dataZoom: {
            yAxisIndex: "none",
          },
          restore: {},
          saveAsImage: {},
        },
      },

      series: [
        {
          name: "Series 2",
          type: "line",
          roam: true,
          symbol: "none",
          lineStyle: {
            width: 0,
          },
          xAxisIndex: 0, // use the second x-axis for this series
          //yAxisIndex: 0, // use the second y-axis for this series
          data: pointDistribution.map(function (x) {
            return [x[0], x[1]];
          }),
        },
        {
          roam: true,
          data: pointData,
          itemStyle: {
            color: function (params) {
              if (params.data[2].startsWith("non-targeting"))
                return "rgba(216, 245, 39, 0.5)"; //yellow
              else if (params.data[4] === true) {
                return "rgba(39, 96, 245, 0.7)";
              } //blue highlight
              else if (params.data[0] > 2) {
                return "rgba(39, 245, 55, 0.7)"; //green
              } else if (params.data[0] < -2) {
                return "rgba(245, 55, 39, 0.7)"; //red
              } else {
                //if( params.data[3]> -2 &&params.data[3]<2 )
                return (
                  "rgba(200, 200, 200," +
                  String((Math.abs(params.data[0]) + 0.1) * 0.15 + 0.185) +
                  ")"
                );
              }
            },
          },
          label: {
            show: true,
            color: "black",
            position: "top",
            fontSize: 14,
            formatter: function (params) {
              if (params.data[4] === true) {
                return params.data[2];
                //} else if (params.data[0] > 2 || params.data[0] < -2) {
                //  return params.data[2];
              } else {
                return "";
              }
            },
          },
          symbolSize: function (params) {
            if (params[2].startsWith("non-targeting")) return 6;
            else if (params[0] > 2 || params[0] < -2) return 10;
            else return Math.round(Math.abs(params[0]) * 2.5 + 3);
          },
          type: "scatter",
        },
      ],
    });
  }, [pointData, data.geneRegulationResults]);



  return (
    <>
    
     
      <Accordion defaultExpanded={true}
            sx={{
              marginBottom: '14px',
              backgroundColor: '#f8f9fa', 
              border: '1px solid #e9ecef',

              borderRadius: '8px',
              '&:before': {
                display: 'none',
              },
              '& .MuiAccordionSummary-root': {
      minHeight: '30px',
      height: '30px',
    }
    , '& .MuiAccordionSummary-root.Mui-expanded': {
      minHeight:  '30px',
      height: '30px',
    }}}>
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
               sx={{ 
            backgroundColor: '#f5f5f5',
            borderBottom: '1px solid #e0e0e0',
            minHeight: '30px',
            '&.Mui-expanded': {
              minHeight: '30px'
            }
          }}
            >
              <h3 style={{ margin: 0, color: '#495057', fontSize: '16px' }}>{moduleDescription.title}</h3>
            </AccordionSummary>
            <AccordionDetails sx={{ padding: '5px 14px 5px' }}>
              <p style={{ margin: '0 0 0px 0', color: '#424242', fontSize: '14px', lineHeight: '1.4' }}>
                {moduleDescription.description}
              </p>    
               <br/>
         <p style={{ margin: '0', color: '#424242', fontSize: '14px', lineHeight: '1.4' }}>
        {selectedView === 0 ?        
            moduleDescription.tabs.chart: selectedView === 1 ? moduleDescription.tabs.table : moduleDescription.tabs.similarGenes
         
        }
         </p>        
             
            </AccordionDetails>
          </Accordion>

      <ButtonGroup
        items={[
          {
            icon: <FaChartBar />,
            key: 0,
            label: "Chart",
          },
          {
            icon: <FaTable />,
            key: 1,
            label: "Table",
          },
          {
            icon: <FaTable />,
            key: 2,
            label: "Similar Genes",
          },
        ]}
        onSelected={(key) => setSelectedView(key)}
        value={selectedView}
      />
      {blacklistLoading && (
        <div style={{ 
          padding: '12px', 
          backgroundColor: '#e8f5e8', 
          borderLeft: '4px solid #4caf50',
          borderRadius: '4px',
          color: '#2e7d32',
          marginBottom: '8px'
        }}>
          🔄 Loading blacklist data for filtering...
        </div>
      )}
      <Spacer height={5} />
      {keyedData && selectedView === 1 && (
        <>
          <EnrichmentTable data={keyedData} columns={columns} />
        </>
      )}

      {keyedData2 && selectedView === 2 && (
        <>
          <EnrichmentTable data={keyedData2} columns={columns2} />
        </>
      )}

      {selectedView === 0 && (
        <>
          <div className={styles.mainView}>
            <ReactEChartsCore
              echarts={echarts}
              option={options}
              style={{ height: "100%", width: "100%" }}
              notMerge={true}
              lazyUpdate={true}
            />
          </div>
        </>
      )}
      <Spacer height={5} />

      {genelists && (
        <>
          <Tabs
            name="tabs"
            value={selectedTab}
            options={tabOptions}
            onChange={(evt) => {
              const { value, label } = evt.target;
              setSelectedTab({ value, label });
            }}
          />

          {selectedTab.value === "gsea" ? (
            <GeneSetEnrichmentTable genesets={genelists} />
          ) : (
            <span> Will be available soon! </span>
          )}
        </>
      )}
    </>
  );
};

const mapStateToProps = ({ settings }) => ({
  coreSettings: settings?.core ?? {},
  genesignatureSettings: settings?.genesignature ?? {},
});

const MainContainer = connect(mapStateToProps)(GeneSignature);

export { MainContainer as GeneSignature };
