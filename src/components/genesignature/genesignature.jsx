import React, { useState, useMemo, useCallback } from "react";
import {
  Spacer,
  ButtonGroup,
  Tabs,
  Toggle,
  Flex,
  Text,
} from "@oliasoft-open-source/react-ui-library";
import { FaChartBar, FaTable, FaSortAmountUpAlt, FaSortAmountDownAlt } from "react-icons/fa";
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
import { runMultiDatasetGeneSignature } from "../../store/results";
import { runMultiDatasetGeneSignatureSimilar } from "../../store/results";

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
import { createGeneTooltipFormatter, formatGeneTooltip } from "../../utils/geneFunctionUtils";

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
    similarGenes: "This table lists genes that show similar expression patterns to your gene signature and may be considered for inclusion in the signature to enhance its specificity. Higher similarity scores indicate stronger correlation with your signature.",
    multiDataset: "Cross-dataset analysis showing how your gene signature performs across multiple cell lines and conditions. Results are ranked by average z-score and filtered by minimum dataset presence. Use settings to control ranking and filtering parameters.",
    multiDatasetSimilar: "Genes that correlate with your gene signature across multiple whole-genome datasets. Shows genes with similar perturbation effects based on average ranks across all datasets."
  }
};

const GeneSignature = ({ coreSettings, genesignatureSettings, data, similarData, multiDatasetData, similarLoading, blacklistData, blacklistLoading, dispatch }) => {
  // Use sessionStorage to persist selectedView across data updates and component remounts
  const getInitialSelectedView = () => {
    const saved = sessionStorage.getItem('geneSignatureSelectedView');
    return saved !== null ? parseInt(saved, 10) : 0;
  };
  
  const [selectedView, setSelectedView] = useState(getInitialSelectedView);
  
  // Save selectedView to sessionStorage whenever it changes
  React.useEffect(() => {
    sessionStorage.setItem('geneSignatureSelectedView', selectedView.toString());
  }, [selectedView]);
  const [options, setOptions] = useState({});
  const [pointData, setPointData] = useState([]);
  const [pointDistribution, setPointDistribution] = useState([]);
  const [keyedData, setkeyedData] = useState([{}]);
  const [keyedData2, setkeyedData2] = useState([{}]);
  const [keyedDataMulti, setkeyedDataMulti] = useState([{}]); // New state for multi-dataset data
  const [keyedDataMultiSimilar, setkeyedDataMultiSimilar] = useState([]); // New state for multi-dataset similar genes
  
  const [selectedTab, setSelectedTab] = useState({
    label: "Geneset Enrichment",
    value: "gsea",
  });
  const [genelists, setGeneLists] = useState([]);
  
  // Enrichment tabs for table views
  const [enrichmentTabTable, setEnrichmentTabTable] = useState({
    label: "Geneset Enrichment",
    value: "gsea",
  });
  const [enrichmentTabSimilar, setEnrichmentTabSimilar] = useState({
    label: "Geneset Enrichment",
    value: "gsea",
  });
  const [enrichmentTabMulti, setEnrichmentTabMulti] = useState({
    label: "Geneset Enrichment",
    value: "gsea",
  });
  const [enrichmentTabMultiSimilar, setEnrichmentTabMultiSimilar] = useState({
    label: "Geneset Enrichment",
    value: "gsea",
  });
  
  // Gene lists for enrichment in table views
  const [genelistsTable, setGeneListsTable] = useState([]);
  const [genelistsSimilar, setGeneListsSimilar] = useState([]);
  const [genelistsMulti, setGeneListsMulti] = useState([]);
  const [genelistsMultiSimilar, setGeneListsMultiSimilar] = useState([]);
  
  // Callback functions to update gene lists when table data changes (sorted/filtered)
  const handleTableDataChange = useCallback((sortedData) => {
    if (!sortedData || sortedData.length === 0) return;
    
    const tableGeneLists = {};
    const sortedByZScore = [...sortedData]; // Already sorted by table
    const upreg = sortedByZScore.filter(g => g.Effect === "UP").map(g => g.Gene);
    const dowreg = sortedByZScore.filter(g => g.Effect === "DOWN").map(g => g.Gene);
    const topGenes = sortedByZScore.map(g => g.Gene);
    const bottomGenes = [...topGenes].reverse();
    
    tableGeneLists["All UP"] = upreg.join();
    tableGeneLists["All DOWN"] = dowreg.join();
    tableGeneLists["Top 10 Increasing"] = topGenes.slice(0, 10).join();
    tableGeneLists["Top 20 Increasing"] = topGenes.slice(0, 20).join();
    tableGeneLists["Top 50 Increasing"] = topGenes.slice(0, 50).join();
    tableGeneLists["Top 100 Increasing"] = topGenes.slice(0, 100).join();
    tableGeneLists["Bottom 10 Decreasing"] = bottomGenes.slice(0, 10).join();
    tableGeneLists["Bottom 20 Decreasing"] = bottomGenes.slice(0, 20).join();
    tableGeneLists["Bottom 50 Decreasing"] = bottomGenes.slice(0, 50).join();
    tableGeneLists["Bottom 100 Decreasing"] = bottomGenes.slice(0, 100).join();
    setGeneListsTable(tableGeneLists);
  }, []);
  
  const handleSimilarDataChange = useCallback((sortedData) => {
    if (!sortedData || sortedData.length === 0) return;
    
    const similarGeneLists = {};
    const topSimilar = sortedData.filter(g => (g.Similarity || 0) > 0).map(g => g.Gene);
    const bottomSimilar = sortedData.filter(g => (g.Similarity || 0) < 0).map(g => g.Gene);
    
    similarGeneLists["All Positively Correlated"] = topSimilar.join();
    similarGeneLists["All Negatively Correlated"] = bottomSimilar.join();
    similarGeneLists["Top 10 Similar"] = topSimilar.slice(0, 10).join();
    similarGeneLists["Top 20 Similar"] = topSimilar.slice(0, 20).join();
    similarGeneLists["Top 50 Similar"] = topSimilar.slice(0, 50).join();
    similarGeneLists["Top 100 Similar"] = topSimilar.slice(0, 100).join();
    similarGeneLists["Bottom 10 Anti-correlated"] = bottomSimilar.slice(0, 10).join();
    similarGeneLists["Bottom 20 Anti-correlated"] = bottomSimilar.slice(0, 20).join();
    similarGeneLists["Bottom 50 Anti-correlated"] = bottomSimilar.slice(0, 50).join();
    similarGeneLists["Bottom 100 Anti-correlated"] = bottomSimilar.slice(0, 100).join();
    setGeneListsSimilar(similarGeneLists);
  }, []);
  
  const handleMultiDataChange = useCallback((sortedData) => {
    if (!sortedData || sortedData.length === 0) return;
    
    const multiGeneLists = {};
    const topMulti = sortedData.filter(g => (g.average || 0) > 0).map(g => g.gene);
    const bottomMulti = sortedData.filter(g => (g.average || 0) < 0).map(g => g.gene);
    
    multiGeneLists["All Increasing"] = topMulti.join();
    multiGeneLists["All Decreasing"] = bottomMulti.join();
    multiGeneLists["Top 10 Increasing"] = topMulti.slice(0, 10).join();
    multiGeneLists["Top 20 Increasing"] = topMulti.slice(0, 20).join();
    multiGeneLists["Top 50 Increasing"] = topMulti.slice(0, 50).join();
    multiGeneLists["Top 100 Increasing"] = topMulti.slice(0, 100).join();
    multiGeneLists["Bottom 10 Decreasing"] = bottomMulti.slice(0, 10).join();
    multiGeneLists["Bottom 20 Decreasing"] = bottomMulti.slice(0, 20).join();
    multiGeneLists["Bottom 50 Decreasing"] = bottomMulti.slice(0, 50).join();
    multiGeneLists["Bottom 100 Decreasing"] = bottomMulti.slice(0, 100).join();
    setGeneListsMulti(multiGeneLists);
  }, []);
  
  const handleMultiSimilarDataChange = useCallback((sortedData) => {
    if (!sortedData || sortedData.length === 0) return;
    
    const multiSimilarGeneLists = {};
    const topMultiSimilar = sortedData.filter(g => (g.average || 0) > 0).map(g => g.Gene);
    const bottomMultiSimilar = sortedData.filter(g => (g.average || 0) < 0).map(g => g.Gene);
    
    multiSimilarGeneLists["All Positively Correlated"] = topMultiSimilar.join();
    multiSimilarGeneLists["All Negatively Correlated"] = bottomMultiSimilar.join();
    multiSimilarGeneLists["Top 10 Similar"] = topMultiSimilar.slice(0, 10).join();
    multiSimilarGeneLists["Top 20 Similar"] = topMultiSimilar.slice(0, 20).join();
    multiSimilarGeneLists["Top 50 Similar"] = topMultiSimilar.slice(0, 50).join();
    multiSimilarGeneLists["Top 100 Similar"] = topMultiSimilar.slice(0, 100).join();
    multiSimilarGeneLists["Bottom 10 Anti-correlated"] = bottomMultiSimilar.slice(0, 10).join();
    multiSimilarGeneLists["Bottom 20 Anti-correlated"] = bottomMultiSimilar.slice(0, 20).join();
    multiSimilarGeneLists["Bottom 50 Anti-correlated"] = bottomMultiSimilar.slice(0, 50).join();
    multiSimilarGeneLists["Bottom 100 Anti-correlated"] = bottomMultiSimilar.slice(0, 100).join();
    setGeneListsMultiSimilar(multiSimilarGeneLists);
  }, []);
  
  // Multi-dataset local settings
  const [showRanks, setShowRanks] = useState(false);
  const [rankOrder, setRankOrder] = useState('desc');
  const [multiDatasetLoading, setMultiDatasetLoading] = useState(false);
  const [multiDatasetSimilarLoading, setMultiDatasetSimilarLoading] = useState(false);


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

  const columnsMulti = useMemo(() => {
    if (!multiDatasetData?.datasets) return [];
    
    console.log('GeneSignature - Creating columns with showRanks:', showRanks);
    
    const columns = [];
    
    // Gene column wrapped in parent column for consistency
    columns.push({
      id: "gene_group", // Required when using non-string header
      header: "", // Empty header for parent column
      columns: [{
        accessorKey: "gene",
        header: "Gene",
        size: 120,
        enableColumnActions: false, // Disable three dots menu
        filterVariant: "autocomplete",
        muiFilterTextFieldProps: {
          placeholder: "Symbol",
          size: "small",
        },
      }],
    });
    
    // Group dataset columns under "Score" or "Rank" header
    const datasetColumns = multiDatasetData.datasets.map(dataset => {
      const datasetName = dataset === 'K562gwps' ? 'K562' : 
                         dataset === 'HCT116gwps' ? 'HCT116' : 
                         dataset === 'HEK293gwps' ? 'HEK293' : dataset;
      
      return {
        accessorKey: showRanks ? `${dataset}_display` : dataset,
        header: datasetName,
        size: showRanks ? 70 : 50, // Reduced width
        enableColumnActions: false, // Disable three dots menu
        filterVariant: "range-slider",
        muiFilterSliderProps: {
          size: "small",
          color: "primary",
          step: showRanks ? 0.1 : 0.01,
        },
        Cell: ({ cell }) => {
          const value = cell.getValue();
          if (showRanks) {
            return value || '';
          } else {
            return typeof value === 'number' ? value.toFixed(3) : (value || '');
          }
        },
      };
    });
    
    // Add grouped header for dataset columns
    columns.push({
      header: showRanks ? "Rank (Score)" : "Score",
      columns: datasetColumns,   
      // Don't disable filters on the grouped header - filters should only appear on child columns
      // The grouped header itself doesn't need filter properties
    });
    
    // Group Average and Datasets columns under one header
    columns.push({
      id: "summary_group", // Required when using non-string header
      header: "", // Empty header for parent column
      columns: [
        {
          accessorKey: showRanks ? "average_rank" : "average",
          header: showRanks ? "Avg Rank" : "Average",
          size: 80,
          enableColumnActions: false, // Disable three dots menu
          filterVariant: "range-slider",
          muiFilterSliderProps: {
            size: "small",
            color: "primary",
            step: showRanks ? 0.1 : 0.01,
          },
          Cell: ({ cell }) => {
            const value = cell.getValue();
            if (showRanks) {
              return typeof value === 'number' ? value.toFixed(1) : '';
            } else {
              return typeof value === 'number' ? value.toFixed(3) : '';
            }
          },
        },
        {
          accessorKey: "dataset_count",
          header: "Datasets",
          size: 60,
          enableColumnActions: false, // Disable three dots menu
          filterVariant: "range-slider",
          muiFilterSliderProps: {
            size: "small",
            color: "primary",
            step: 1,
          },
        },
      ],
    });
    
    return columns;
  }, [multiDatasetData?.datasets, showRanks]);

  const columnsMultiSimilar = useMemo(() => {
    const ds = similarData?.datasets || multiDatasetData?.datasets || [];
    if (!ds.length) return [];

    const cols = [];

    // Gene column wrapped in parent column for consistency
    cols.push({
      id: "gene_group_similar", // Required when using non-string header
      header: "", // Empty header for parent column
      columns: [{
        accessorKey: "Gene",
        header: "Gene",
        size: 120,
        enableColumnActions: false, // Disable three dots menu
        filterVariant: "autocomplete",
        muiFilterTextFieldProps: { placeholder: "Symbol", size: "small" },
      }],
    });

    // Group dataset columns under "Similarity (r coefficient)" header
    const similarityColumns = ds.map(dataset => {
      const datasetName =
        dataset === 'K562gwps' ? 'K562' :
        dataset === 'HCT116gwps' ? 'HCT116' :
        dataset === 'HEK293gwps' ? 'HEK293' : dataset;

      return {
        accessorKey: showRanks ? `${dataset}_display` : dataset,
        header: showRanks ? `${datasetName} Rank` : datasetName,
        size: showRanks ? 70 : 50, // Reduced width
        enableColumnActions: false, // Disable three dots menu
        filterVariant: showRanks ? "text" : "range-slider",
        muiFilterTextFieldProps: showRanks ? { placeholder: "Rank", size: "small" } : undefined,
        muiFilterSliderProps: showRanks ? undefined : { size: "small", color: "primary", step: 0.01 },
        Cell: ({ cell }) => {
          const v = cell.getValue();
          if (showRanks) return v || '';
          return typeof v === 'number' ? v.toFixed(3) : (v ?? '');
        },
      };
    });

    // Add grouped header for similarity columns
    cols.push({
      header: showRanks ? "Rank (Similarity)" : "Similarity (r coefficient)",
      columns: similarityColumns,
      // Don't disable filters on the grouped header - filters should only appear on child columns
      // The grouped header itself doesn't need filter properties
    });

    // Group Average and Datasets columns under one header
    cols.push({
      id: "summary_group_similar", // Required when using non-string header
      header: "", // Empty header for parent column
      columns: [
        {
          accessorKey: showRanks ? "average_rank" : "average",
          header: showRanks ? "Avg Rank" : "Avg Similarity",
          size: 80,
          enableColumnActions: false, // Disable three dots menu
          sortingFn: 'basic',
          filterVariant: showRanks ? "text" : "range-slider",
          muiFilterSliderProps: showRanks ? undefined : { size: "small", color: "primary", step: 0.01 },
          Cell: ({ cell }) => {
            const v = cell.getValue();
            return typeof v === 'number' ? (showRanks ? v.toFixed(1) : v.toFixed(3)) : '';
          },
        },
        {
          accessorKey: "Datasets",
          header: "Datasets",
          size: 60,
          enableColumnActions: false, // Disable three dots menu
          filterVariant: "range-slider",
          muiFilterSliderProps: { size: "small", color: "primary", step: 1 },
        },
      ],
    });

    // Included column wrapped in parent column for consistency
    cols.push({
      id: "included_group", // Required when using non-string header
      header: "", // Empty header for parent column
      columns: [{
        accessorKey: "Included",
        header: "Included",
        size: 70,
        maxSize: 70,
        enableColumnActions: false, // Disable three dots menu
        filterVariant: "select",
        muiFilterTextFieldProps: { placeholder: "Select", size: "small" },
      }],
    });

    return cols;
  }, [data?.datasets, similarData?.datasets, showRanks]);

  function roundToThree(num) {
    return +(Math.round(num + "e+3") + "e-3");
  }

  // Function to trigger multi-dataset calculation
  const triggerMultiDatasetCalculation = async () => {
    if (!coreSettings.targetGeneList || coreSettings.targetGeneList.trim().length < 2) {
      console.log('GeneSignature - Skipping multi-dataset calculation: no target gene list');
      return;
    }
    
    if (multiDatasetLoading) {
      console.log('GeneSignature - Skipping multi-dataset calculation: already loading');
      return;
    }
    
    console.log('GeneSignature - Starting multi-dataset calculation');
    setMultiDatasetLoading(true);
    
    const multiSettings = {
      min_datasets: 1, // Always use 1 since we have table filters
      ranking_order: rankOrder,
    };
    
    try {
      await dispatch(runMultiDatasetGeneSignature(multiSettings));
      console.log('GeneSignature - Multi-dataset calculation completed');
    } catch (error) {
      console.error("Multi-dataset calculation failed:", error);
    } finally {
      setMultiDatasetLoading(false);
    }
  };

  // Function to trigger multi-dataset similar genes calculation
  const triggerMultiDatasetSimilarCalculation = async () => {
    if (!coreSettings.targetGeneList || coreSettings.targetGeneList.trim().length < 2) {
      console.log('GeneSignature - Skipping multi-dataset similar calculation: no target gene list');
      return;
    }
    
    if (multiDatasetSimilarLoading) {
      console.log('GeneSignature - Skipping multi-dataset similar calculation: already loading');
      return;
    }
    
    console.log('GeneSignature - Starting multi-dataset similar genes calculation');
    setMultiDatasetSimilarLoading(true);
    
    const multiSettings = {
      ranking_order: rankOrder,
    };
    
    try {
      await dispatch(runMultiDatasetGeneSignatureSimilar(multiSettings));
      console.log('GeneSignature - Multi-dataset similar genes calculation completed');
    } catch (error) {
      console.error("Multi-dataset similar genes calculation failed:", error);
    } finally {
      setMultiDatasetSimilarLoading(false);
    }
  };

  // Handle tab selection
  const handleTabSelection = (key) => {
    // Save to sessionStorage immediately before any async operations
    sessionStorage.setItem('geneSignatureSelectedView', key.toString());
    setSelectedView(key);
    
    // If multi-dataset tab is selected and we don't have data yet, trigger calculation
    if (key === 3 && (!multiDatasetData?.datasets || multiDatasetData?.datasets?.length === 0)) {
      triggerMultiDatasetCalculation();
    }
    
    // If multi-dataset similar genes tab is selected and we don't have correlations data yet, trigger calculation
    if (key === 4 && !similarData?.correlations) {
      triggerMultiDatasetSimilarCalculation();
    }
    
    // Clear multi-dataset data when switching away from multi-dataset tabs
    if (key < 3) {
      // We don't clear multiDatasetData here since it comes from props now
      setkeyedDataMulti([{}]);
      setkeyedDataMultiSimilar([{}]);
    }
  };

  // Function to process multi-dataset data on frontend
  const processMultiDatasetData = useCallback((data, minDatasets = 1, blacklistData = null, genesignatureSettings = null) => {
    console.log('GeneSignature - processMultiDatasetData called with:', {
      showRanks,
      rankOrder,
      datasets: data?.datasets,
      hasBlacklistData: !!blacklistData,
      filterSettings: genesignatureSettings
    });
    
    if (!data || !data.datasets) return [];

    const datasets = data.datasets;
    
    // First, aggregate data from all datasets into comparison format
    const aggregatedData = {};
    
    datasets.forEach(datasetId => {
      const datasetData = data[datasetId];
      if (!datasetData) return;
      
      // Aggregate the scores
      Object.entries(datasetData).forEach(([gene, score]) => {
        if (!aggregatedData[gene]) {
          aggregatedData[gene] = {};
        }
        aggregatedData[gene][datasetId] = score;
      });
    });

    // Filter genes by minimum dataset count and calculate averages/ranks
    const filteredData = {};
    Object.entries(aggregatedData).forEach(([gene, values]) => {
      // Check which datasets have valid data for this gene
      const validValues = datasets
        .map(dataset => values[dataset])
        .filter(val => val !== undefined && val !== null && typeof val === 'number' && !isNaN(val));
      
      if (validValues.length >= minDatasets) {
        // Calculate average from valid values
        const average = validValues.length > 0 
          ? Math.round((validValues.reduce((sum, val) => sum + val, 0) / validValues.length) * 1000) / 1000
          : null;
        
        // Apply blacklist filtering if enabled
        let shouldInclude = true;
        if (genesignatureSettings?.filter && blacklistData && average !== null) {
          if (average < 0 && 
              blacklistData.blackListDown && 
              blacklistData.blackListDown[gene] !== undefined &&
              blacklistData.blackListDown[gene] > genesignatureSettings.filterBlackListed) {
            shouldInclude = false;
          } else if (average > 0 && 
                     blacklistData.blackListUp && 
                     blacklistData.blackListUp[gene] !== undefined &&
                     blacklistData.blackListUp[gene] > genesignatureSettings.filterBlackListed) {
            shouldInclude = false;
          }
        }
        
        if (shouldInclude) {
          // Create row with all dataset columns
          const rowData = {};
          datasets.forEach(dataset => {
            rowData[dataset] = values[dataset]; // This might be undefined for some datasets
          });
          rowData.average = average;
          rowData.dataset_count = validValues.length;
          
          filteredData[gene] = rowData;
        }
      }
    });

    // Calculate ranks for each dataset
    const datasetRanks = {};
    datasets.forEach(dataset => {
      // Get all genes with valid scores for this dataset
      const datasetScores = [];
      Object.entries(filteredData).forEach(([gene, data]) => {
        if (data[dataset] !== undefined && data[dataset] !== null) {
          datasetScores.push([gene, data[dataset]]);
        }
      });
      
      // Sort by score (desc for gene signature - higher is better)
      datasetScores.sort((a, b) => {
        if (rankOrder === 'desc') {
          return b[1] - a[1]; // Higher scores get better (lower) ranks
        } else {
          return a[1] - b[1]; // Lower scores get better (lower) ranks
        }
      });
      
      // Assign ranks
      const ranks = {};
      datasetScores.forEach(([gene, score], index) => {
        ranks[gene] = index + 1;
      });
      
      datasetRanks[dataset] = ranks;
    });

    // Calculate average ranks for each gene
    Object.keys(filteredData).forEach(gene => {
      const ranks = datasets
        .map(dataset => datasetRanks[dataset]?.[gene])
        .filter(rank => typeof rank === 'number');
      
      if (ranks.length > 0) {
        filteredData[gene].average_rank = Math.round((ranks.reduce((sum, rank) => sum + rank, 0) / ranks.length) * 10) / 10;
      }
    });

    // Create final table data similar to multidataset-comparison
    const processedData = Object.entries(filteredData).map(([gene, values]) => {
      const row = { gene };
      
      // Add dataset columns
      datasets.forEach(dataset => {
        if (showRanks) {
          const rank = datasetRanks[dataset]?.[gene];
          const score = values[dataset];
          if (rank !== undefined && score !== undefined) {
            row[`${dataset}_display`] = `${rank} (${typeof score === 'number' ? score.toFixed(3) : score})`;
          } else {
            row[`${dataset}_display`] = '';
          }
        } else {
          row[dataset] = values[dataset];
        }
      });
      
      // Add aggregate columns
      if (values.average !== undefined) {
        row.average = values.average;
      }
      if (showRanks && values.average_rank !== undefined) {
        row.average_rank = values.average_rank;
      }
      row.dataset_count = values.dataset_count;
      
      return row;
    });

    console.log('GeneSignature - Processed data sample:', processedData.slice(0, 2));

    // Sort by average rank or score
    processedData.sort((a, b) => {
      if (showRanks && a.average_rank !== undefined && b.average_rank !== undefined) {
        return a.average_rank - b.average_rank; // Lower rank is better
      } else {
        // Sort by average score
        const aScore = a.average || 0;
        const bScore = b.average || 0;
        if (rankOrder === 'desc') {
          return bScore - aScore; // Higher scores first
        } else {
          return aScore - bScore; // Lower scores first
        }
      }
    });

    return processedData;
  }, [showRanks, rankOrder]);

  // Function to process multi-dataset similar genes from backend correlations
  const processMultiDatasetSimilarGenes = useCallback((data, blacklistData = null, genesignatureSettings = null) => {
    
    if (!data || !data.correlations) {

      return [];
    }

    const correlations = data.correlations; // Now this is per-dataset correlations
    const datasets = data.datasets || [];
    const signatureGenes = new Set(coreSettings.targetGeneList
      .replaceAll(/[,\s;]+/g, "+")
      .replaceAll(/\++|\-+/g, "+")
      .trimStart("+")
      .split("+"));

    // Get all unique genes that have correlations in any dataset
    const allGenesWithCorrelations = new Set();
    datasets.forEach(dataset => {
      if (correlations[dataset]) {
        Object.keys(correlations[dataset]).forEach(gene => {
          allGenesWithCorrelations.add(gene);
        });
      }
    });

    console.log('GeneSignature - Found genes with correlations:', {
      totalGenes: allGenesWithCorrelations.size,
      datasets: datasets,
      sampleGenes: Array.from(allGenesWithCorrelations).slice(0, 5)
    });

    // Process each gene with correlations
    const similarGenesData = Array.from(allGenesWithCorrelations)
      .map((gene) => {
        // Create row with individual dataset correlations
        const rowData = { Gene: gene };
        
        // Add individual dataset correlations
        let totalCorrelation = 0;
        let datasetCount = 0;
        
        datasets.forEach(dataset => {
          if (correlations[dataset] && correlations[dataset][gene] !== undefined) {
            const correlation = correlations[dataset][gene];
            rowData[dataset] = correlation;
            totalCorrelation += correlation;
            datasetCount++;
          } else {
            rowData[dataset] = null; // No correlation data for this gene in this dataset
          }
        });
        
        const avgCorrelation = datasetCount > 0 ? totalCorrelation / datasetCount : 0;
        
        // Skip genes that have no correlation data in any dataset
        if (datasetCount === 0) {
          console.log(`Skipping gene ${gene} - no correlation data in any dataset`);
          return null;
        }
        
        // Apply blacklist filtering if enabled
        let shouldInclude = true;
        if (genesignatureSettings?.filter && blacklistData && avgCorrelation !== null) {
          if (avgCorrelation < 0 && 
              blacklistData.blackListDown && 
              blacklistData.blackListDown[gene] !== undefined &&
              blacklistData.blackListDown[gene] > genesignatureSettings.filterBlackListed) {
            shouldInclude = false;
          } else if (avgCorrelation > 0 && 
                     blacklistData.blackListUp && 
                     blacklistData.blackListUp[gene] !== undefined &&
                     blacklistData.blackListUp[gene] > genesignatureSettings.filterBlackListed) {
            shouldInclude = false;
          }
        }
        
        if (shouldInclude) {
          // Add summary columns
          rowData.Similarity = avgCorrelation; // This is now the averaged correlation
          rowData.average = avgCorrelation;
          rowData.Datasets = datasetCount;
          rowData.Included = signatureGenes.has(gene.split("_")[0]) ? "YES" : "";
          
          return rowData;
        }
        return null;
      })
      .filter(item => item !== null);

    // Calculate ranks for each dataset if showRanks is true
    if (showRanks) {
      // Calculate ranks for each dataset
      const datasetRanks = {};
      datasets.forEach(dataset => {
        // Get all genes with valid correlations for this dataset
        const datasetCorrelations = [];
        similarGenesData.forEach(gene => {
          if (gene[dataset] !== undefined && gene[dataset] !== null) {
            datasetCorrelations.push([gene.Gene, gene[dataset]]);
          }
        });
        
        // Sort by correlation (desc for similarity - higher is better)
        datasetCorrelations.sort((a, b) => {
          if (rankOrder === 'desc') {
            return b[1] - a[1]; // Higher correlations get better (lower) ranks
          } else {
            return a[1] - b[1]; // Lower correlations get better (lower) ranks
          }
        });
        
        // Assign ranks
        const ranks = {};
        datasetCorrelations.forEach(([gene, correlation], index) => {
          ranks[gene] = index + 1;
        });
        
        datasetRanks[dataset] = ranks;
      });

      // Add rank display and calculate average ranks
      similarGenesData.forEach(gene => {
        // Add rank display for each dataset
        datasets.forEach(dataset => {
          const rank = datasetRanks[dataset]?.[gene.Gene];
          const correlation = gene[dataset];
          if (rank !== undefined && correlation !== undefined) {
            gene[`${dataset}_display`] = `${rank} (${typeof correlation === 'number' ? correlation.toFixed(3) : correlation})`;
          } else {
            gene[`${dataset}_display`] = '';
          }
        });

        // Calculate average rank
        const ranks = datasets
          .map(dataset => datasetRanks[dataset]?.[gene.Gene])
          .filter(rank => typeof rank === 'number');
        
        if (ranks.length > 0) {
          gene.average_rank = Math.round((ranks.reduce((sum, rank) => sum + rank, 0) / ranks.length) * 10) / 10;
        }
      });
    }

    // Sort by average rank or correlation
    similarGenesData.sort((a, b) => {
      if (showRanks && a.average_rank !== undefined && b.average_rank !== undefined) {
        return a.average_rank - b.average_rank; // Lower rank is better
      } else {
        // Sort by correlation
       const av = (typeof a.average === 'number') ? a.average : Number.NEGATIVE_INFINITY;
  const bv = (typeof b.average === 'number') ? b.average : Number.NEGATIVE_INFINITY;
  return rankOrder === 'desc' ? (bv - av) : (av - bv); // score sort
      }
    });

    console.log('GeneSignature - Processed similar genes:', {
      totalGenes: allGenesWithCorrelations.size,
      filteredGenes: similarGenesData.length,
      sampleGenes: similarGenesData.slice(0, 3),
      showRanks,
      rankOrder,
      genesWithNoData: similarGenesData.filter(g => g.Datasets === 0).map(g => g.Gene)
    });

    return similarGenesData;
  }, [coreSettings.targetGeneList, showRanks, rankOrder]);

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
    // Restore selectedView from sessionStorage if it was set (preserve tab selection across data updates)
    const savedView = sessionStorage.getItem('geneSignatureSelectedView');
    if (savedView !== null) {
      const savedViewNum = parseInt(savedView, 10);
      if (savedViewNum !== selectedView && savedViewNum >= 0 && savedViewNum <= 4) {
        console.log('GeneSignature - Restoring selectedView from sessionStorage:', savedViewNum);
        setSelectedView(savedViewNum);
      }
    }
    
    console.log('GeneSignature - Data processing useEffect triggered:', {
      hasData: !!data,
      hasResults: !!(data?.results),
      resultsLength: data?.results?.length || 0,
      hasCorrelations: !!(data?.correlations),
      correlationsKeys: data?.correlations ? Object.keys(data.correlations).length : 0,
      hasMultiDatasetData: !!multiDatasetData,
      multiDatasetDatasets: multiDatasetData?.datasets?.length || 0,
      targetGeneList: coreSettings.targetGeneList,
      hasBlacklistData: !!blacklistData,
      blacklistLoading,
      // Add similar data debugging
      hasSimilarData: !!similarData,
      similarDataKeys: similarData ? Object.keys(similarData) : [],
      similarDataCorrelations: similarData?.correlations ? Object.keys(similarData.correlations) : [],
      similarDataDatasets: similarData?.datasets,
      currentSelectedView: selectedView,
      savedViewFromStorage: savedView
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

    // Process multi-dataset results if available (from separate prop)
    if (multiDatasetData && multiDatasetData.datasets && multiDatasetData.datasets.length > 0) {
      console.log('GeneSignature - Processing multi-dataset results:', {
        datasets: multiDatasetData.datasets,
        processed_datasets: multiDatasetData.processed_datasets,
        total_datasets: multiDatasetData.total_datasets
      });
      
      const multiTableInfo = processMultiDatasetData(multiDatasetData, 1, blacklistData, genesignatureSettings);
      
      console.log('GeneSignature - Setting multi-dataset table data:', {
        tableInfoLength: multiTableInfo.length,
        sampleTableInfo: multiTableInfo.slice(0, 3),
        showRanks,
        rankOrder
      });
      
      setkeyedDataMulti(multiTableInfo);
      
      // Create gene lists for Multi-Dataset tab enrichment
      const multiGeneLists = {};
      const sortedMultiByAvg = [...multiTableInfo].sort((a, b) => (b.average || 0) - (a.average || 0));
      const topMulti = sortedMultiByAvg.filter(g => (g.average || 0) > 0).map(g => g.gene);
      const bottomMulti = sortedMultiByAvg.filter(g => (g.average || 0) < 0).map(g => g.gene);
      
      multiGeneLists["All Increasing"] = topMulti.join();
      multiGeneLists["All Decreasing"] = bottomMulti.join();
      multiGeneLists["Top 10 Increasing"] = topMulti.slice(0, 10).join();
      multiGeneLists["Top 20 Increasing"] = topMulti.slice(0, 20).join();
      multiGeneLists["Top 50 Increasing"] = topMulti.slice(0, 50).join();
      multiGeneLists["Top 100 Increasing"] = topMulti.slice(0, 100).join();
      multiGeneLists["Bottom 10 Decreasing"] = bottomMulti.slice(Math.max(bottomMulti.length - 10, 0)).join();
      multiGeneLists["Bottom 20 Decreasing"] = bottomMulti.slice(Math.max(bottomMulti.length - 20, 0)).join();
      multiGeneLists["Bottom 50 Decreasing"] = bottomMulti.slice(Math.max(bottomMulti.length - 50, 0)).join();
      multiGeneLists["Bottom 100 Decreasing"] = bottomMulti.slice(Math.max(bottomMulti.length - 100, 0)).join();
      setGeneListsMulti(multiGeneLists);
      
      // Also process multi-dataset similar genes from backend correlations
      // Note: similar genes from multi-dataset might come in multiDatasetData too
      const multiSimilarInfo = processMultiDatasetSimilarGenes(multiDatasetData, blacklistData, genesignatureSettings);
      setkeyedDataMultiSimilar(multiSimilarInfo);
      
      // Create gene lists for Multi-Dataset Similar Genes tab enrichment
      const multiSimilarGeneLists = {};
      const topMultiSimilar = multiSimilarInfo.filter(g => (g.average || 0) > 0).map(g => g.Gene);
      const bottomMultiSimilar = multiSimilarInfo.filter(g => (g.average || 0) < 0).map(g => g.Gene);
      
      multiSimilarGeneLists["All Positively Correlated"] = topMultiSimilar.join();
      multiSimilarGeneLists["All Negatively Correlated"] = bottomMultiSimilar.join();
      multiSimilarGeneLists["Top 10 Similar"] = topMultiSimilar.slice(0, 10).join();
      multiSimilarGeneLists["Top 20 Similar"] = topMultiSimilar.slice(0, 20).join();
      multiSimilarGeneLists["Top 50 Similar"] = topMultiSimilar.slice(0, 50).join();
      multiSimilarGeneLists["Top 100 Similar"] = topMultiSimilar.slice(0, 100).join();
      multiSimilarGeneLists["Bottom 10 Anti-correlated"] = bottomMultiSimilar.slice(Math.max(bottomMultiSimilar.length - 10, 0)).join();
      multiSimilarGeneLists["Bottom 20 Anti-correlated"] = bottomMultiSimilar.slice(Math.max(bottomMultiSimilar.length - 20, 0)).join();
      multiSimilarGeneLists["Bottom 50 Anti-correlated"] = bottomMultiSimilar.slice(Math.max(bottomMultiSimilar.length - 50, 0)).join();
      multiSimilarGeneLists["Bottom 100 Anti-correlated"] = bottomMultiSimilar.slice(Math.max(bottomMultiSimilar.length - 100, 0)).join();
      setGeneListsMultiSimilar(multiSimilarGeneLists);
    } else if ((selectedView === 3 || selectedView === 4) && 
               coreSettings.targetGeneList && 
               coreSettings.targetGeneList.trim().length > 0 && 
               (!multiDatasetData?.datasets || multiDatasetData.datasets.length === 0)) {
      // If we're on multi-dataset tabs but don't have multi-dataset data, trigger calculation
      console.log('GeneSignature - Triggering multi-dataset calculation due to new data');
      triggerMultiDatasetCalculation();
    }

    // Process multi-dataset similar genes if correlations data is available (separate API)
    if (similarData && similarData.correlations && Object.keys(similarData.correlations).length > 0) {
      const multiSimilarInfo = processMultiDatasetSimilarGenes(similarData, blacklistData, genesignatureSettings);
      setkeyedDataMultiSimilar(multiSimilarInfo);
      
      // Create gene lists for Multi-Dataset Similar Genes tab enrichment
      const multiSimilarGeneLists = {};
      const topMultiSimilar = multiSimilarInfo.filter(g => (g.average || 0) > 0).map(g => g.Gene);
      const bottomMultiSimilar = multiSimilarInfo.filter(g => (g.average || 0) < 0).map(g => g.Gene);
      
      multiSimilarGeneLists["All Positively Correlated"] = topMultiSimilar.join();
      multiSimilarGeneLists["All Negatively Correlated"] = bottomMultiSimilar.join();
      multiSimilarGeneLists["Top 10 Similar"] = topMultiSimilar.slice(0, 10).join();
      multiSimilarGeneLists["Top 20 Similar"] = topMultiSimilar.slice(0, 20).join();
      multiSimilarGeneLists["Top 50 Similar"] = topMultiSimilar.slice(0, 50).join();
      multiSimilarGeneLists["Top 100 Similar"] = topMultiSimilar.slice(0, 100).join();
      multiSimilarGeneLists["Bottom 10 Anti-correlated"] = bottomMultiSimilar.slice(Math.max(bottomMultiSimilar.length - 10, 0)).join();
      multiSimilarGeneLists["Bottom 20 Anti-correlated"] = bottomMultiSimilar.slice(Math.max(bottomMultiSimilar.length - 20, 0)).join();
      multiSimilarGeneLists["Bottom 50 Anti-correlated"] = bottomMultiSimilar.slice(Math.max(bottomMultiSimilar.length - 50, 0)).join();
      multiSimilarGeneLists["Bottom 100 Anti-correlated"] = bottomMultiSimilar.slice(Math.max(bottomMultiSimilar.length - 100, 0)).join();
      setGeneListsMultiSimilar(multiSimilarGeneLists);
    }
    
    // Process chart data if we have results (from main data prop)
    // Now data is not overwritten by multi-dataset, so we can use it directly
    if (
      data.results &&
      data.results.length > 0 &&
      data.genes &&
      data.genes.length > 0
    ) {
      console.log('GeneSignature - Processing chart data:', {
        resultsLength: data.results.length,
        genesLength: data.genes.length
      });
   
      //const chart = echarts.init(chartRef.current);
      let xValues = data.results;
      const labels = data.genes;
      let similarGenes = data.correlations || {};

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
      const sortedSimilarGenes = similarGenesTableInfo.sort(
        (geneA, geneB) => geneB["Similarity"] - geneA["Similarity"]
      );
      setkeyedData2(sortedSimilarGenes);
      
      // Create gene lists for Similar Genes tab enrichment
      const similarGeneLists = {};
      const topSimilar = sortedSimilarGenes.filter(g => g.Similarity > 0).map(g => g.Gene);
      const bottomSimilar = sortedSimilarGenes.filter(g => g.Similarity < 0).map(g => g.Gene);
      
      similarGeneLists["All Positively Correlated"] = topSimilar.join();
      similarGeneLists["All Negatively Correlated"] = bottomSimilar.join();
      similarGeneLists["Top 10 Similar"] = topSimilar.slice(0, 10).join();
      similarGeneLists["Top 20 Similar"] = topSimilar.slice(0, 20).join();
      similarGeneLists["Top 50 Similar"] = topSimilar.slice(0, 50).join();
      similarGeneLists["Top 100 Similar"] = topSimilar.slice(0, 100).join();
      similarGeneLists["Bottom 10 Anti-correlated"] = bottomSimilar.slice(Math.max(bottomSimilar.length - 10, 0)).join();
      similarGeneLists["Bottom 20 Anti-correlated"] = bottomSimilar.slice(Math.max(bottomSimilar.length - 20, 0)).join();
      similarGeneLists["Bottom 50 Anti-correlated"] = bottomSimilar.slice(Math.max(bottomSimilar.length - 50, 0)).join();
      similarGeneLists["Bottom 100 Anti-correlated"] = bottomSimilar.slice(Math.max(bottomSimilar.length - 100, 0)).join();
      setGeneListsSimilar(similarGeneLists);

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
      
      // Create gene lists for Table tab enrichment
      const tableGeneLists = {};
      tableGeneLists["All UP"] = upreg.join();
      tableGeneLists["All DOWN"] = dowreg.join();
      tableGeneLists["Top 10 Increasing"] = topGenes.slice(0, 10).join();
      tableGeneLists["Top 20 Increasing"] = topGenes.slice(0, 20).join();
      tableGeneLists["Top 50 Increasing"] = topGenes.slice(0, 50).join();
      tableGeneLists["Top 100 Increasing"] = topGenes.slice(0, 100).join();
      tableGeneLists["Bottom 10 Decreasing"] = bottomGenes.slice(Math.max(bottomGenes.length - 10, 0)).join();
      tableGeneLists["Bottom 20 Decreasing"] = bottomGenes.slice(Math.max(bottomGenes.length - 20, 0)).join();
      tableGeneLists["Bottom 50 Decreasing"] = bottomGenes.slice(Math.max(bottomGenes.length - 50, 0)).join();
      tableGeneLists["Bottom 100 Decreasing"] = bottomGenes.join();
      setGeneListsTable(tableGeneLists);
      
      pointData.sort((a, b) => b[0] - a[0]);
      console.log("GeneSignature - Final pointData:", pointData.slice(0, 5));
      setPointData(pointData);
    } else {
      // Log when chart data is not available
      console.log('GeneSignature - Chart data not available');
    }
  }, [data, multiDatasetData, coreSettings.targetGeneList, genesignatureSettings, blacklistData, blacklistLoading, showRanks, rankOrder, processMultiDatasetData]);

  useEffect(() => {
    if ((selectedView === 3 || selectedView === 4) && multiDatasetData?.datasets?.length > 0) {
      if (selectedView === 3) {
        const multiTableInfo = processMultiDatasetData(multiDatasetData, 1, blacklistData, genesignatureSettings);
        setkeyedDataMulti(multiTableInfo);
        
        // Update gene lists for Multi-Dataset tab
        const multiGeneLists = {};
        const sortedMultiByAvg = [...multiTableInfo].sort((a, b) => (b.average || 0) - (a.average || 0));
        const topMulti = sortedMultiByAvg.filter(g => (g.average || 0) > 0).map(g => g.gene);
        const bottomMulti = sortedMultiByAvg.filter(g => (g.average || 0) < 0).map(g => g.gene);
        
        multiGeneLists["All Increasing"] = topMulti.join();
        multiGeneLists["All Decreasing"] = bottomMulti.join();
        multiGeneLists["Top 10 Increasing"] = topMulti.slice(0, 10).join();
        multiGeneLists["Top 20 Increasing"] = topMulti.slice(0, 20).join();
        multiGeneLists["Top 50 Increasing"] = topMulti.slice(0, 50).join();
        multiGeneLists["Top 100 Increasing"] = topMulti.slice(0, 100).join();
        multiGeneLists["Bottom 10 Decreasing"] = bottomMulti.slice(Math.max(bottomMulti.length - 10, 0)).join();
        multiGeneLists["Bottom 20 Decreasing"] = bottomMulti.slice(Math.max(bottomMulti.length - 20, 0)).join();
        multiGeneLists["Bottom 50 Decreasing"] = bottomMulti.slice(Math.max(bottomMulti.length - 50, 0)).join();
        multiGeneLists["Bottom 100 Decreasing"] = bottomMulti.slice(Math.max(bottomMulti.length - 100, 0)).join();
        setGeneListsMulti(multiGeneLists);
      }
      if (selectedView === 4) {
        const source = (similarData && similarData.correlations) ? similarData : multiDatasetData;
        const multiSimilarInfo = processMultiDatasetSimilarGenes(source, blacklistData, genesignatureSettings);
        setkeyedDataMultiSimilar(multiSimilarInfo);
        
        // Update gene lists for Multi-Dataset Similar Genes tab
        const multiSimilarGeneLists = {};
        const topMultiSimilar = multiSimilarInfo.filter(g => (g.average || 0) > 0).map(g => g.Gene);
        const bottomMultiSimilar = multiSimilarInfo.filter(g => (g.average || 0) < 0).map(g => g.Gene);
        
        multiSimilarGeneLists["All Positively Correlated"] = topMultiSimilar.join();
        multiSimilarGeneLists["All Negatively Correlated"] = bottomMultiSimilar.join();
        multiSimilarGeneLists["Top 10 Similar"] = topMultiSimilar.slice(0, 10).join();
        multiSimilarGeneLists["Top 20 Similar"] = topMultiSimilar.slice(0, 20).join();
        multiSimilarGeneLists["Top 50 Similar"] = topMultiSimilar.slice(0, 50).join();
        multiSimilarGeneLists["Top 100 Similar"] = topMultiSimilar.slice(0, 100).join();
        multiSimilarGeneLists["Bottom 10 Anti-correlated"] = bottomMultiSimilar.slice(Math.max(bottomMultiSimilar.length - 10, 0)).join();
        multiSimilarGeneLists["Bottom 20 Anti-correlated"] = bottomMultiSimilar.slice(Math.max(bottomMultiSimilar.length - 20, 0)).join();
        multiSimilarGeneLists["Bottom 50 Anti-correlated"] = bottomMultiSimilar.slice(Math.max(bottomMultiSimilar.length - 50, 0)).join();
        multiSimilarGeneLists["Bottom 100 Anti-correlated"] = bottomMultiSimilar.slice(Math.max(bottomMultiSimilar.length - 100, 0)).join();
        setGeneListsMultiSimilar(multiSimilarGeneLists);
      }
    }
  }, [showRanks, rankOrder, multiDatasetData, similarData, selectedView,
    processMultiDatasetData, processMultiDatasetSimilarGenes,
    blacklistData, genesignatureSettings]);

  console.log('GeneSignature - pointData state:', pointData);
  useEffect(() => {
    console.log('GeneSignature - Chart options useEffect triggered:', {
      hasData: !!data,
      pointDataLength: pointData?.length || 0,
      pointDistributionLength: pointDistribution?.length || 0,
    });
    
    // Allow chart to render if we have pointData, even if current data doesn't have results
    // This handles the case where multi-dataset overwrote the data but we have preserved chart data
    if (!pointData || pointData.length === 0) {
      console.log('GeneSignature - No pointData for chart options, returning early');
      return;
    }

    setOptions({
      tooltip: {
        extraCssText: "width:auto; white-space:normal; max-width: 400px; z-index: 9999; padding: 12px; line-height: 1.5;",
        confine: true,
        backgroundColor: "#ffffff",
        borderColor: "#e0e0e0",
        borderWidth: 1,
        formatter: function (params, ticket, callback) {
          // params.data structure: [zScore, histY, geneSymbol, originalScore, isHighlighted]
          const geneSymbol = params.data[2];
          const zScore = params.data[0];
          const originalScore = params.data[3];
          const isHighlighted = params.data[4];
          
          if (!geneSymbol) return '';
          
          // Determine effect type based on z-score
          let effectType = "";
          let effectColor = "#666";
          if (zScore > 2) {
            effectType = "Increases Signature";
            effectColor = "#4caf50"; // green
          } else if (zScore < -2) {
            effectType = "Decreases Signature";
            effectColor = "#f44336"; // red
          } else {
            effectType = "No Significant Effect";
            effectColor = "#9e9e9e"; // gray
          }
          
          // Create a custom parseData function for the gene tooltip formatter
          const parseData = (params) => ({
            geneSymbol: geneSymbol,
            geneType: effectType,
            effectColor: effectColor,
            zScore: zScore?.toFixed(3),
            originalScore: originalScore?.toFixed(3),
            isHighlighted: isHighlighted,
            // Add score information to additional info
            signatureScore: originalScore?.toFixed(3),
            normalizedScore: zScore?.toFixed(3),
            effectType: effectType
          });
          
          // Enhanced createGeneTooltipFormatter that includes score information
          const enhancedFormatter = createGeneTooltipFormatter({
            useCache: true,
            parseData: (params) => ({
              geneSymbol: geneSymbol,
              geneType: effectType,
              signatureScore: originalScore?.toFixed(3),
              normalizedScore: zScore?.toFixed(3),
              effectType: effectType,
              isHighlighted: isHighlighted
            })
          });
          
          // For now, let's create a custom formatter that includes scores and then fetches gene info
          const customFormatter = function(params, ticket, callback) {
            // Create base tooltip with score information
            let baseTooltip = `<div style="line-height:1.4;font-weight:600;color:#1976d2;font-size:14px;margin:0 0 8px 0;padding:0;">
              ${geneSymbol}
            </div>
            <div style="font-size:12px;color:${effectColor};margin:4px 0;padding:0;font-weight:500;">
              <strong>Effect:</strong> ${effectType}
            </div>
            <div style="font-size:12px;color:#555;margin:4px 0;padding:0;">
              <strong>Z-Score:</strong> ${zScore?.toFixed(3)}
            </div>
            <div style="font-size:12px;color:#555;margin:4px 0;padding:0;">
              <strong>Signature Score:</strong> ${originalScore?.toFixed(3)}
            </div>`;
            
            if (isHighlighted) {
              baseTooltip += `<div style="font-size:11px;color:#ff9800;margin:4px 0;padding:0;">
                <strong>★ Highlighted Gene</strong>
              </div>`;
            }
            
            // Add gene description placeholder
            baseTooltip += `<div style="font-size:11px;color:#999;font-style:italic;margin:6px 0 0 0;padding:0;">Loading gene information...</div>`;
            
            // Try to fetch gene information asynchronously
            import('../../utils/geneFunctionUtils').then(({ fetchGeneInfo }) => {
              fetchGeneInfo(geneSymbol).then(content => {
                if (content) {
                  let parsedContent;
                  try {
                    parsedContent = typeof content === 'string' ? JSON.parse(content) : content;
                  } catch (e) {
                    parsedContent = { description: content };
                  }
                  
                  // Update tooltip with gene information
                  let enhancedTooltip = `<div style="line-height:1.4;font-weight:600;color:#1976d2;font-size:14px;margin:0 0 8px 0;padding:0;">
                    ${geneSymbol}${parsedContent?.name ? ` (${parsedContent.name})` : ''}
                  </div>
                  <div style="font-size:12px;color:${effectColor};margin:4px 0;padding:0;font-weight:500;">
                    <strong>Effect:</strong> ${effectType}
                  </div>
                  <div style="font-size:12px;color:#555;margin:4px 0;padding:0;">
                    <strong>Z-Score:</strong> ${zScore?.toFixed(3)}
                  </div>
                  <div style="font-size:12px;color:#555;margin:4px 0;padding:0;">
                    <strong>Signature Score:</strong> ${originalScore?.toFixed(3)}
                  </div>`;
                  if (isHighlighted) {
                    enhancedTooltip += `<div style="font-size:11px;color:#ff9800;margin:4px 0;padding:0;">
                      <strong>★ Highlighted Gene</strong>
                    </div>`;
                  }
                  
                  if (parsedContent?.description) {
                    enhancedTooltip += `<div style="font-size:11px;color:#444;margin:8px 0 0 0;padding:0;line-height:1.3;word-wrap:break-word;max-width:350px;">${parsedContent.description}</div>`;
                  }
                  
                  callback(ticket, enhancedTooltip);
                }
              }).catch(() => {
                // If gene info fetch fails, just show the base tooltip without the loading message
                let finalTooltip = baseTooltip.replace('<div style="font-size:11px;color:#999;font-style:italic;margin:6px 0 0 0;padding:0;">Loading gene information...</div>', '');
                callback(ticket, finalTooltip);
              });
            });
            
            return baseTooltip;
          };
          
          return customFormatter(params, ticket, callback);
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
  }, [pointData, pointDistribution]);



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
            moduleDescription.tabs.chart: 
         selectedView === 1 ? moduleDescription.tabs.table : 
         selectedView === 2 ? moduleDescription.tabs.similarGenes :
         selectedView === 3 ? moduleDescription.tabs.multiDataset :
         moduleDescription.tabs.multiDatasetSimilar
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
          {
            icon: <FaTable />,
            key: 3,
            label: "Multi-Dataset",
          },
          {
            icon: <FaTable />,
            key: 4,
            label: "Multi-Dataset Similar Genes",
          },
        ]}
        onSelected={handleTabSelection}
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
          <div style={{ height: "60vh", overflow: "auto" }}>
            <EnrichmentTable data={keyedData} columns={columns} onSortedDataChange={handleTableDataChange} />
          </div>
          <Spacer height={10} />
          {genelistsTable && Object.keys(genelistsTable).length > 0 && (
            <>
              <Tabs
                name="tabs-table"
                value={enrichmentTabTable}
                options={tabOptions}
                onChange={(evt) => {
                  const { value, label } = evt.target;
                  setEnrichmentTabTable({ value, label });
                }}
              />

              {enrichmentTabTable.value === "gsea" ? (
                <GeneSetEnrichmentTable genesets={genelistsTable} />
              ) : (
                <span> Will be available soon! </span>
              )}
            </>
          )}
        </>
      )}

      {keyedData2 && selectedView === 2 && (
        <>
          <div style={{ height: "60vh", overflow: "auto" }}>
            <EnrichmentTable data={keyedData2} columns={columns2} onSortedDataChange={handleSimilarDataChange} />
          </div>
          <Spacer height={10} />
          {genelistsSimilar && Object.keys(genelistsSimilar).length > 0 && (
            <>
              <Tabs
                name="tabs-similar"
                value={enrichmentTabSimilar}
                options={tabOptions}
                onChange={(evt) => {
                  const { value, label } = evt.target;
                  setEnrichmentTabSimilar({ value, label });
                }}
              />

              {enrichmentTabSimilar.value === "gsea" ? (
                <GeneSetEnrichmentTable genesets={genelistsSimilar} />
              ) : (
                <span> Will be available soon! </span>
              )}
            </>
          )}
        </>
      )}

      {selectedView === 3 && (
        <>
          

          {/* Controls for ranks and ordering */}
          <Flex justifyContent="flex-start" alignItems="left" gap="10px" style={{ marginBottom: '10px' }}>
            {/* Toggle for showing ranks */}
                       <Text muted style={{ marginBottom: '10px' }}>
             Gene signature analysis across whole-genome datasets. Rankings show relative positions within each dataset. 
             {genesignatureSettings?.filter && 'Blacklisted sgRNAs are filtered based on sidebar settings.'}
           </Text>
            <Flex justifyContent="flex-end" alignItems="center" gap="16px">
              <Flex alignItems="center" gap="10px">
                <Text size="small">Rank based average:</Text>
                <Toggle
                  checked={showRanks}
                  onChange={(e) => {
                    setShowRanks(e.target.checked);
                  }}
                />
                {showRanks && (
                  <Flex alignItems="center" gap="8px">
                    <Text size="small">Rank order:</Text>
                    <button
                      onClick={() => setRankOrder(rankOrder === 'asc' ? 'desc' : 'asc')}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 12px',
                        border: '1px solid #ccc',
                        borderRadius: '6px',
                        backgroundColor: '#f8f9fa',
                        cursor: 'pointer',
                        fontSize: '14px',
                        transition: 'all 0.2s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.backgroundColor = '#e9ecef';
                        e.target.style.borderColor = '#adb5bd';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.backgroundColor = '#f8f9fa';
                        e.target.style.borderColor = '#ccc';
                      }}
                      title={rankOrder === 'asc' ? 'Click to change to: High → Low (1st = highest)' : 'Click to change to: Low → High (1st = lowest)'}
                    >
                      {rankOrder === 'asc' ? (
                        <>
                          <FaSortAmountUpAlt style={{ color: '#28a745' }} />
                          <span>Low → High</span>
                        </>
                      ) : (
                        <>
                          <FaSortAmountDownAlt style={{ color: '#dc3545' }} />
                          <span>High → Low</span>
                        </>
                      )}
                    </button>
                  </Flex>
                )}
              </Flex>
            </Flex>
          </Flex>

          {multiDatasetLoading && (
            <div style={{ 
              padding: '12px', 
              backgroundColor: '#e8f5e8', 
              borderLeft: '4px solid #4caf50',
              borderRadius: '4px',
              color: '#2e7d32',
              marginBottom: '12px'
            }}>
              🔄 Calculating gene signature across multiple datasets...
            </div>
          )}

         
          
          {keyedDataMulti && keyedDataMulti.length > 0 && (
            <>
              <div style={{ height: "60vh", overflow: "auto" }}>
                <EnrichmentTable 
                  data={keyedDataMulti} 
                  columns={columnsMulti} 
                  onSortedDataChange={handleMultiDataChange}
                  key={`multi-table-${showRanks}-${rankOrder}`} // Force re-render when settings change
                />
              </div>
              <Spacer height={10} />
              {genelistsMulti && Object.keys(genelistsMulti).length > 0 && (
                <>
                  <Tabs
                    name="tabs-multi"
                    value={enrichmentTabMulti}
                    options={tabOptions}
                    onChange={(evt) => {
                      const { value, label } = evt.target;
                      setEnrichmentTabMulti({ value, label });
                    }}
                  />

                  {enrichmentTabMulti.value === "gsea" ? (
                    <GeneSetEnrichmentTable genesets={genelistsMulti} />
                  ) : (
                    <span> Will be available soon! </span>
                  )}
                </>
              )}
            </>
          )}
        </>
      )}

      {selectedView === 4 && (
        <>
          <Text muted style={{ marginBottom: '10px' }}>
            Genes that correlate with your signature across multiple whole-genome datasets. 
            {genesignatureSettings?.filter && 'Blacklisted sgRNAs are filtered based on sidebar settings.'}
          </Text>
          
          {/* Controls for ranks and ordering */}
          <Flex justifyContent="flex-start" alignItems="left" gap="10px" style={{ marginBottom: '10px' }}>
            <Flex justifyContent="flex-end" alignItems="center" gap="16px">
              <Flex alignItems="center" gap="10px">
                <Text size="small">Rank based average:</Text>
                <Toggle
                  checked={showRanks}
                  onChange={(e) => {
                    console.log('GeneSignature - Toggle changed:', e.target.checked);
                    setShowRanks(e.target.checked);
                  }}
                />
                {showRanks && (
                  <Flex alignItems="center" gap="8px">
                    <Text size="small">Rank order:</Text>
                    <button
                      onClick={() => setRankOrder(rankOrder === 'asc' ? 'desc' : 'asc')}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 12px',
                        border: '1px solid #ccc',
                        borderRadius: '6px',
                        backgroundColor: '#f8f9fa',
                        cursor: 'pointer',
                        fontSize: '14px',
                        transition: 'all 0.2s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.backgroundColor = '#e9ecef';
                        e.target.style.borderColor = '#adb5bd';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.backgroundColor = '#f8f9fa';
                        e.target.style.borderColor = '#ccc';
                      }}
                      title={rankOrder === 'asc' ? 'Click to change to: High → Low (1st = highest)' : 'Click to change to: Low → High (1st = lowest)'}
                    >
                      {rankOrder === 'asc' ? (
                        <>
                          <FaSortAmountUpAlt style={{ color: '#28a745' }} />
                          <span>Low → High</span>
                        </>
                      ) : (
                        <>
                          <FaSortAmountDownAlt style={{ color: '#dc3545' }} />
                          <span>High → Low</span>
                        </>
                      )}
                    </button>
                  </Flex>
                )}
              </Flex>
            </Flex>
          </Flex>

          {(multiDatasetSimilarLoading || similarLoading) && (
            <div style={{ 
              padding: '12px', 
              backgroundColor: '#e8f5e8', 
              borderLeft: '4px solid #4caf50',
              borderRadius: '4px',
              color: '#2e7d32',
              marginBottom: '12px'
            }}>
              🔄 Calculating gene signature correlations across multiple datasets...
            </div>
          )}

          {keyedDataMultiSimilar && keyedDataMultiSimilar.length > 0 && (
            <>
              <div style={{ height: "60vh", overflow: "auto" }}>
                <EnrichmentTable 
                  data={keyedDataMultiSimilar} 
                  columns={columnsMultiSimilar} 
                  onSortedDataChange={handleMultiSimilarDataChange}
                  key={`multi-similar-${showRanks}-${rankOrder}-${(similarData?.datasets || data?.datasets || []).length}`} 
                />
              </div>
              <Spacer height={10} />
              {genelistsMultiSimilar && Object.keys(genelistsMultiSimilar).length > 0 && (
                <>
                  <Tabs
                    name="tabs-multi-similar"
                    value={enrichmentTabMultiSimilar}
                    options={tabOptions}
                    onChange={(evt) => {
                      const { value, label } = evt.target;
                      setEnrichmentTabMultiSimilar({ value, label });
                    }}
                  />

                  {enrichmentTabMultiSimilar.value === "gsea" ? (
                    <GeneSetEnrichmentTable genesets={genelistsMultiSimilar} />
                  ) : (
                    <span> Will be available soon! </span>
                  )}
                </>
              )}
            </>
          )}
          
          {(!keyedDataMultiSimilar || keyedDataMultiSimilar.length === 0) && !multiDatasetSimilarLoading && data?.correlations && Object.keys(data.correlations).length > 0 && (
            <Text muted>No similar genes found after filtering. Try adjusting your gene signature or filter settings.</Text>
          )}
          
          {!data?.correlations && !multiDatasetSimilarLoading && selectedView === 4 && (
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <Text muted style={{ marginBottom: '10px' }}>
                Calculate gene signature correlations across multiple datasets to find similar genes.
              </Text>
              <button
                onClick={triggerMultiDatasetSimilarCalculation}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Calculate Similar Genes
              </button>
            </div>
          )}
        </>
      )}

      {selectedView === 0 && (
        <>
          <div style={{ 
            height: "350px", 
            width: "100%", 
            marginBottom: "0px",
            minHeight: "350px"
          }}>
            <ReactEChartsCore
              echarts={echarts}
              option={options}
              style={{ height: "100%", width: "100%" }}
              notMerge={false}
              lazyUpdate={true}
            />
          </div>
        </>
      )}
      <Spacer height={5} />

      {genelists && selectedView === 0 && (
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

const mapDispatchToProps = (dispatch) => ({
  dispatch,
});

const MainContainer = connect(mapStateToProps, mapDispatchToProps)(GeneSignature);

export { MainContainer as GeneSignature };

