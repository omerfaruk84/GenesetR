import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { toast } from "@oliasoft-open-source/react-ui-library";
import { safeJsonParse } from "../../utils/jsonUtils";
import {
  Spacer,
  Tabs,
  Card,
  Text,
  Badge,
  Toggle,
  Flex,
  Select,
  Field,
} from "@oliasoft-open-source/react-ui-library";
import { MaterialReactTable } from 'material-react-table';
import { FaSortAmountUpAlt, FaSortAmountDownAlt, FaDownload } from 'react-icons/fa';
import { getGeneInfo, formatGeneTooltip } from "../../utils/geneFunctionUtils";
import {
  buildTopBottomGeneLists,
  geneListsEqual,
  flattenColumns,
  csvCell,
} from "../../utils/geneListUtils";
import { GeneSetEnrichmentTable } from "../enrichment";
import { withErrorBoundary } from "../error-boundary";
import styles from "./multidataset-comparison.module.scss";

// Enrichment gene lists of the comparison table. Always derived from the
// "average" score column, never from the order the rows are displayed in.
const COMPARISON_LIST_OPTIONS = {
  geneKey: "gene",
  scoreKey: "average",
  allPositive: "All Positive",
  allNegative: "All Negative",
  topLabel: (n) => `Top ${n} Positive`,
  bottomLabel: (n) => `Bottom ${n} Negative`,
};

const MultiDatasetComparison = ({ data }) => {
  const [selectedMainTab, setSelectedMainTab] = useState({ value: 0, label: "Perturbation Effects (Downstream Effects)" });
  const [selectedSubTab, setSelectedSubTab] = useState({ value: 0, label: "Downstream Targets" });
  const [showRanks, setShowRanks] = useState(true);
  const [minDatasets, setMinDatasets] = useState(1); // Filter: minimum datasets per gene
  const [rankOrder, setRankOrder] = useState('asc'); // 'asc' = lowest values get rank 1, 'desc' = highest values get rank 1
  const [selectedDatasets, setSelectedDatasets] = useState(new Set()); // Selected datasets for filtering
  const [isDatasetDropdownOpen, setIsDatasetDropdownOpen] = useState(false); // Dropdown state
  
  // Enrichment tab state
  const [enrichmentTab, setEnrichmentTab] = useState({
    label: "Geneset Enrichment",
    value: "gsea",
  });
  
  // State for gene lists based on sorted table data
  const [currentGeneLists, setCurrentGeneLists] = useState({});
  
  // State for table sorting and filtering
  const [sorting, setSorting] = useState(showRanks ? [{ id: 'average_rank', desc: false }] : [{ id: 'average', desc: true }]);
  const [columnFilters, setColumnFilters] = useState([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const debounceTimerRef = useRef(null);
  
  // Use refs instead of state to avoid re-renders
  const currentTooltipRef = React.useRef(null);
  const tooltipTimeoutRef = React.useRef(null);
  const dropdownRef = React.useRef(null);
  // Incremented on every hover start/end so a slow gene-info lookup cannot
  // show a tooltip for a cell the pointer has already left.
  const hoverTokenRef = React.useRef(0);
  
  // Tab options for enrichment
  const tabOptions = [
    {
      label: "Geneset Enrichment",
      value: "gsea",
    },
  ];

  // Function to cleanup any existing tooltip
  const cleanupTooltip = () => {
    // Clear any pending timeout
    if (tooltipTimeoutRef.current) {
      clearTimeout(tooltipTimeoutRef.current);
      tooltipTimeoutRef.current = null;
    }
    
    // Remove current tooltip
    if (currentTooltipRef.current) {
      try {
        document.body.removeChild(currentTooltipRef.current);
      } catch (e) {
        // Element might already be removed
      }
      currentTooltipRef.current = null;
    }
    
    // Also cleanup any orphaned tooltips (safety net)
    const orphanedTooltips = document.querySelectorAll('[data-gene-tooltip]');
    orphanedTooltips.forEach(tooltip => {
      try {
        document.body.removeChild(tooltip);
      } catch (e) {
        // Element might already be removed
      }
    });
  };

  // Function to get gene info with caching
  // Gene info comes from the shared cache in utils (memory + localStorage), so
  // looking it up never re-renders this component. The returned HTML is escaped.
  const getGeneTooltip = async (geneSymbol) => {
    const info = await getGeneInfo(geneSymbol);
    return formatGeneTooltip(String(geneSymbol ?? ""), info);
  };

  // Cleanup tooltips when component unmounts
  React.useEffect(() => {
    return () => {
      cleanupTooltip();
    };
  }, []);

  // Cleanup tooltips only when major data changes
  React.useEffect(() => {
    cleanupTooltip();
  }, [selectedMainTab, selectedSubTab]);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDatasetDropdownOpen(false);
      }
    };

    if (isDatasetDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDatasetDropdownOpen]);

  // Reset sub-tab when main tab changes - MUST be before conditional returns
  React.useEffect(() => {
    // Get the appropriate sub-tab options for the selected main tab
    const newSubTabOptions = selectedMainTab.value === 0 
      ? [
          { value: 0, label: "Downstream Targets" },
          { value: 1, label: "Correlation (Similar Perturbations)" },
        ]
      : [
          { value: 0, label: "Upstream Regulators" },
          { value: 1, label: "Correlation (Similar Expressional Profile)" },
        ];
    
    setSelectedSubTab({ value: 0, label: newSubTabOptions[0].label });
  }, [selectedMainTab.value]);

  // Update rank order based on selected sub-tab
  React.useEffect(() => {
    if (selectedSubTab.value === 1) {
      // Correlation tabs - default to high to low (desc) for better correlation visibility
      setRankOrder('desc');
    } else {
      // Expression tabs - default to low to high (asc) for traditional ranking
      setRankOrder('asc');
    }
  }, [selectedSubTab.value]);

  // Parse the data
  const parsedData = useMemo(() => {
    if (!data) return null;
    try {
      return safeJsonParse(data);
    } catch (error) {
      return null;
    }
  }, [data]);

  // Initialize selected datasets when data changes
  React.useEffect(() => {
    if (parsedData && parsedData.datasets) {
      // Initialize with all datasets selected
      setSelectedDatasets(new Set(parsedData.datasets));
    }
  }, [parsedData]);

  // Helper function to check which datasets have data
  const getDatasetsWithData = (dataSection) => {
    const datasetsWithData = new Set();
    const allDatasets = parsedData?.datasets || [];
    
    allDatasets.forEach(dataset => {
      // Check if any gene has data for this dataset
      const hasData = Object.values(dataSection).some(values => {
        const value = values[dataset];
        return value !== undefined && value !== null && typeof value === 'number' && !isNaN(value);
      });
      
      if (hasData) {
        datasetsWithData.add(dataset);
      }
    });
    
    return datasetsWithData;
  };

  // Function to download table data as CSV
  const downloadTableData = () => {
    if (!tableData.data || tableData.data.length === 0) {
      toast({
        message: { type: "Info", icon: true, content: "There is no data to download yet" },
      });
      return;
    }

    // Get current date for filename
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const gene = parsedData?.gene || 'unknown';
    const mainTab = selectedMainTab.label.replace(/[^a-zA-Z0-9]/g, '_');
    const subTab = selectedSubTab.label.replace(/[^a-zA-Z0-9]/g, '_');
    
    // Create CSV content. The table uses grouped headers, so export the leaf
    // columns (the ones that actually have an accessorKey).
    const leafColumns = flattenColumns(tableData.columns).filter(
      (col) => typeof col?.accessorKey === "string"
    );
    const headers = leafColumns.map((col) => csvCell(col.header)).join(',');
    const rows = tableData.data.map((row) =>
      leafColumns.map((col) => csvCell(row[col.accessorKey])).join(',')
    );
    
    const csvContent = [headers, ...rows].join('\n');
    
    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${gene}_${mainTab}_${subTab}_${dateStr}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const mainTabOptions = [
    { value: 0, label: "Perturbation Effects (Downstream Effects)" },
    { value: 1, label: "Perturbed By (Upstream Regulators)" },
  ];

  // Get sub-tab options - different for each main tab to provide better context
  const getSubTabOptions = () => {
    if (selectedMainTab.value === 0) {
      // Perturbation Effects (Downstream Effects)
      return [
        { value: 0, label: "Downstream Targets" },
        { value: 1, label: "Correlation (Similar Perturbations)" },
      ];
    } else {
      // Perturbed By (Upstream Regulators)
      return [
        { value: 0, label: "Upstream Regulators" },
        { value: 1, label: "Correlation (Similar Expressional Profile)" },
      ];
    }
  };

  // Get dynamic sub-tab options
  const subTabOptions = getSubTabOptions();

  // Helper function to calculate ranks for a dataset column
  const calculateRanks = (dataSection, datasetColumns, order = 'desc') => {
    // Create a deep copy to avoid modifying the original data
    const rankedData = {};
    Object.entries(dataSection).forEach(([gene, values]) => {
      rankedData[gene] = { ...values }; // Shallow copy of each gene's data
    });
    
    // Calculate ranks for each dataset column
    datasetColumns.forEach(dataset => {
      // Get all valid values for this dataset
      const datasetValues = [];
      Object.entries(dataSection).forEach(([gene, values]) => {
        const value = values[dataset];
        if (typeof value === 'number' && !isNaN(value)) {
          datasetValues.push({ gene, value });
        }
      });
      
      // Sort based on rank order preference
      if (order === 'desc') {
        // Descending: highest value gets rank 1
        datasetValues.sort((a, b) => b.value - a.value);
      } else {
        // Ascending: lowest value gets rank 1
        datasetValues.sort((a, b) => a.value - b.value);
      }
      
      // Assign ranks
      datasetValues.forEach((item, index) => {
        const rank = index + 1;
        rankedData[item.gene][`${dataset}_rank`] = rank;
      });
    });
    
    // Calculate average ranks for each gene
    Object.keys(rankedData).forEach(gene => {
      const ranks = datasetColumns
        .map(dataset => rankedData[gene][`${dataset}_rank`])
        .filter(rank => typeof rank === 'number');
      
      if (ranks.length > 0) {
        rankedData[gene].average_rank = Math.round((ranks.reduce((sum, rank) => sum + rank, 0) / ranks.length) * 10) / 10;
      }
    });
    
    return rankedData;
  };


  // Helper function to create table data from the parsed results
  const createTableData = (dataSection) => {
    if (!dataSection || Object.keys(dataSection).length === 0) {
      return { columns: [], data: [] };
    }

    const entries = Object.entries(dataSection);
    if (entries.length === 0) return { columns: [], data: [] };

    // Get datasets that have data and are selected
    const datasetsWithData = getDatasetsWithData(dataSection);
    const availableDatasets = parsedData?.datasets || [];
    const datasetColumns = availableDatasets.filter(dataset => 
      selectedDatasets.has(dataset) && datasetsWithData.has(dataset)
    );
    
    // We always calculate averages now in frontend
    const hasAverage = true;

    // Filter genes by minimum dataset count and calculate averages
    const filteredData = {};
    Object.entries(dataSection).forEach(([gene, values]) => {
      // Check which selected datasets have valid data for this gene
      const validValues = datasetColumns
        .map(dataset => values[dataset])
        .filter(val => val !== undefined && val !== null && typeof val === 'number' && !isNaN(val));
      
      if (validValues.length >= minDatasets) {
        // Calculate average from valid values in selected datasets only
        const average = validValues.length > 0 
          ? Math.round((validValues.reduce((sum, val) => sum + val, 0) / validValues.length) * 1000) / 1000
          : null;
        
        // Create row with only selected dataset columns
        const rowData = {};
        datasetColumns.forEach(dataset => {
          rowData[dataset] = values[dataset]; // This might be undefined for some datasets
        });
        rowData.average = average;
        
        filteredData[gene] = rowData;
      }
    });

    // Calculate ranks if showing ranks
    const processedData = showRanks ? calculateRanks(filteredData, datasetColumns, rankOrder) : filteredData;

    // Material React Table column format - ensure Average column is always last
    const columns = [];
    
    // 1. Gene/Perturbation column (first) with tooltip - wrapped in parent column for consistency
    columns.push({
      id: "gene_group_comparison", // Required when using non-string header
      header: "", // Empty header for parent column
      columns: [{
        accessorKey: "gene", 
        header: "Gene/Perturbation",
        size: 150,
        enableColumnActions: false, // Disable three dots menu
      Cell: ({ cell }) => {
        const geneSymbol = cell.getValue();
        return (
          <div
            style={{ 
              cursor: 'help',
              textDecoration: 'underline dotted',
              color: '#1976d2'
            }}            
            onMouseEnter={async (e) => {
              try {
                // Clean up any existing tooltip first
                cleanupTooltip();

                // Capture the position now; the event target is not reliable
                // after the await.
                const rect = e.currentTarget.getBoundingClientRect();
                const hoverToken = ++hoverTokenRef.current;

                const tooltip = await getGeneTooltip(geneSymbol);

                // The pointer left (or moved to another gene) while loading.
                if (hoverTokenRef.current !== hoverToken) return;
                cleanupTooltip();

                // Create a temporary tooltip element
                const tooltipDiv = document.createElement('div');
                tooltipDiv.setAttribute('data-gene-tooltip', 'true'); // Mark for cleanup
                tooltipDiv.innerHTML = tooltip;
                tooltipDiv.style.cssText = `
                  position: fixed;
                  background: white;
                  border: 1px solid #ccc;
                  border-radius: 4px;
                  padding: 8px;
                  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                  z-index: 10000;
                  max-width: 300px;
                  font-size: 12px;
                  line-height: 1.4;
                  pointer-events: none;
                `;
                
                // Position tooltip (position: fixed => viewport coordinates)
                tooltipDiv.style.left = `${rect.right + 10}px`;
                tooltipDiv.style.top = `${rect.top}px`;
                
                // Add to body
                document.body.appendChild(tooltipDiv);
                
                // Store reference for cleanup (using ref, not state)
                currentTooltipRef.current = tooltipDiv;
                
                // Set a safety timeout to auto-cleanup after 10 seconds
                const timeout = setTimeout(() => {
                  if (tooltipDiv && tooltipDiv.parentNode) {
                    try {
                      document.body.removeChild(tooltipDiv);
                    } catch (e) {
                      // Already removed
                    }
                  }
                  currentTooltipRef.current = null;
                  tooltipTimeoutRef.current = null;
                }, 10000);
                
                tooltipTimeoutRef.current = timeout;
                
              } catch (error) {
                console.error('Error showing tooltip:', error);
              }
            }}
            onMouseLeave={() => {
              // Invalidate any lookup still in flight, then clean up
              hoverTokenRef.current += 1;
              cleanupTooltip();
            }}
          >
            {geneSymbol}
          </div>
        );
      },
      }],
    });
    
    // 2. Dataset columns (middle) - grouped under header
    const datasetCols = datasetColumns.map(dataset => {
      const datasetName = dataset === 'K562gwps' ? 'K562' : 
                         dataset === 'HCT116gwps' ? 'HCT116' : 
                         dataset === 'HEK293gwps' ? 'HEK293' : dataset;
      
      return {
        accessorKey: showRanks ? `${dataset}_display` : dataset,
        header: datasetName,
        size: showRanks ? 70 : 50, // Reduced width
        enableColumnActions: false, // Disable three dots menu
        Cell: ({ cell }) => {
          const value = cell.getValue();
          if (showRanks) {
            return value || '';
          } else {
            return typeof value === 'number' ? value.toFixed(2) : (value || '');
          }
        },
        sortingFn: (rowA, rowB, columnId) => {
          const aValue = rowA.getValue(columnId);
          const bValue = rowB.getValue(columnId);
          
          // Always put empty/null/undefined values at the end
          if ((aValue === null || aValue === undefined || aValue === '') && (bValue === null || bValue === undefined || bValue === '')) {
            return 0; // Both empty, maintain order
          }
          if (aValue === null || aValue === undefined || aValue === '') {
            return 1; // A is empty, put it after B
          }
          if (bValue === null || bValue === undefined || bValue === '') {
            return -1; // B is empty, put it after A
          }
          
          // For ranks (string format like "1 (0.123)")
          if (showRanks && typeof aValue === 'string' && typeof bValue === 'string') {
            const aRank = parseFloat(aValue.split(' ')[0]);
            const bRank = parseFloat(bValue.split(' ')[0]);
            return aRank - bRank;
          }
          
          // For numeric values
          const aNum = typeof aValue === 'number' ? aValue : parseFloat(aValue);
          const bNum = typeof bValue === 'number' ? bValue : parseFloat(bValue);
          
          if (isNaN(aNum) && isNaN(bNum)) return 0;
          if (isNaN(aNum)) return 1;
          if (isNaN(bNum)) return -1;
          
          return aNum - bNum;
        }
      };
    });
    
    // Add grouped header for dataset columns
    columns.push({
      header: showRanks ? "Rank (Score)" : "Score",
      columns: datasetCols,
      // Don't disable filters on the grouped header - filters should only appear on child columns
      // The grouped header itself doesn't need filter properties
    });
    
    // 3. Average column (always last) - wrapped in parent column for consistency
    if (hasAverage) {
      columns.push({
        id: "average_group_comparison", // Required when using non-string header
        header: "", // Empty header for parent column
        columns: [{
          accessorKey: showRanks ? "average_rank" : "average", 
          header: showRanks ? "Avg Rank" : "Average",
          size: 100,
          enableColumnActions: false, // Disable three dots menu
          Cell: ({ cell }) => {
            const value = cell.getValue();
            if (showRanks) {
              return typeof value === 'number' ? value.toFixed(1) : '';
            } else {
              return typeof value === 'number' ? value.toFixed(3) : '';
            }
          },
          sortingFn: (rowA, rowB, columnId) => {
            const aValue = rowA.getValue(columnId);
            const bValue = rowB.getValue(columnId);
            
            // Always put empty/null/undefined values at the end
            if ((aValue === null || aValue === undefined || aValue === '') && (bValue === null || bValue === undefined || bValue === '')) {
              return 0; // Both empty, maintain order
            }
            if (aValue === null || aValue === undefined || aValue === '') {
              return 1; // A is empty, put it after B
            }
            if (bValue === null || bValue === undefined || bValue === '') {
              return -1; // B is empty, put it after A
            }
            
            // For numeric values
            const aNum = typeof aValue === 'number' ? aValue : parseFloat(aValue);
            const bNum = typeof bValue === 'number' ? bValue : parseFloat(bValue);
            
            if (isNaN(aNum) && isNaN(bNum)) return 0;
            if (isNaN(aNum)) return 1;
            if (isNaN(bNum)) return -1;
            
            return aNum - bNum;
          }
        }],
      });
    }

    // Debug: log column order

    const data = Object.entries(processedData).map(([gene, values]) => {
      const row = { gene };
      
      datasetColumns.forEach(dataset => {
        if (showRanks) {
          const rank = values[`${dataset}_rank`];
          const value = values[dataset];
          if (rank !== undefined && value !== undefined) {
            row[`${dataset}_display`] = `${rank} (${typeof value === 'number' ? value.toFixed(3) : value})`;
          } else {
            row[`${dataset}_display`] = '';
          }
        } else {
          row[dataset] = values[dataset];
        }
      });
      
      if (hasAverage && values.average !== undefined) {
        row.average = values.average;
      }
      if (showRanks && values.average_rank !== undefined) {
        row.average_rank = values.average_rank;
      }
      
      return row;
    });

    return { columns, data };
  };

  // Get the appropriate data section based on selected tabs
  const getCurrentData = () => {
    if (!parsedData || !parsedData.datasets) {
      return {};
    }

    // Aggregate data from all datasets into comparison format
    const aggregatedData = {};
    const datasetIds = parsedData.datasets;

    datasetIds.forEach(datasetId => {
      const datasetData = parsedData[datasetId];
      if (!datasetData) return;

      let targetSection;
      if (selectedMainTab.value === 0) {
        // Perturbation Effects (Downstream Effects)
        if (selectedSubTab.value === 0) {
          // Downstream Targets - show genes affected by the perturbation
          targetSection = datasetData.perturbation_effects?.downstream;
        } else {
          // Correlation (Similar Perturbations) - show perturbations with similar effects
          targetSection = datasetData.perturbation_effects?.correlation;
        }
      } else {
        // Perturbed By (Upstream Regulators)
        if (selectedSubTab.value === 0) {
          // Upstream Regulators - show genes that regulate the target when perturbed
          targetSection = datasetData.perturbed_by?.upstream;
        } else {
          // Correlation (Similar Expressional Profile) - show genes with similar expression patterns
          targetSection = datasetData.perturbed_by?.correlation;
        }
      }

      // Aggregate the data
      if (targetSection) {
        Object.entries(targetSection).forEach(([gene, value]) => {
          if (!aggregatedData[gene]) {
            aggregatedData[gene] = {};
          }
          aggregatedData[gene][datasetId] = value;
        });
      } else {
      }
    });

    return aggregatedData;
  };

  // The aggregated data, table rows and column definitions are memoised: they
  // are expensive (all genes x datasets, plus ranks) and, more importantly,
  // their identity drives the effects below. Rebuilding them on every render
  // used to restart the debounce/enrichment cycle once per second.
  const currentData = useMemo(
    () => getCurrentData(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [parsedData, selectedMainTab.value, selectedSubTab.value]
  );
  const tableData = useMemo(
    () => createTableData(currentData),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentData, parsedData, selectedDatasets, minDatasets, showRanks, rankOrder]
  );
  const datasetsWithData = useMemo(
    () => getDatasetsWithData(currentData),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentData, parsedData]
  );
  const datasetFilterMax = Math.max(
    1,
    datasetsWithData.size || parsedData?.datasets?.length || 0
  );

  // Keep the table sorted by the column that exists in the current mode.
  useEffect(() => {
    setSorting(
      showRanks
        ? [{ id: 'average_rank', desc: false }]
        : [{ id: 'average', desc: true }]
    );
  }, [showRanks]);

  // Callback to handle filtered data changes from table. The lists are derived
  // from the "average" score, so the display order of the rows is irrelevant.
  const handleTableDataChange = useCallback((rows) => {
    const lists =
      !rows || rows.length === 0
        ? {}
        : buildTopBottomGeneLists(rows, COMPARISON_LIST_OPTIONS);
    // Keep the previous object when nothing changed so the enrichment panel
    // (and this component) do not re-render for identical lists.
    setCurrentGeneLists((prev) => (geneListsEqual(prev, lists) ? prev : lists));
  }, []);

  // Generate initial gene lists for enrichment
  const geneLists = useMemo(() => {
    if (!tableData.data || tableData.data.length === 0) return {};
    return buildTopBottomGeneLists(tableData.data, COMPARISON_LIST_OPTIONS);
  }, [tableData.data]);

  // Use current gene lists if available (from the filtered table), otherwise use initial
  const activeGeneLists = Object.keys(currentGeneLists).length > 0 ? currentGeneLists : geneLists;

  React.useEffect(() => {
    if (minDatasets > datasetFilterMax) {
      setMinDatasets(datasetFilterMax);
    }
  }, [datasetFilterMax, minDatasets]);
  
  // Debounced effect to update gene lists when table sorting/filtering changes
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    debounceTimerRef.current = setTimeout(() => {
      if (!tableData.data || tableData.data.length === 0) {
        handleTableDataChange([]);
        return;
      }

      // Apply filtering
      let filteredData = [...tableData.data];
      
      // Apply global filter
      if (globalFilter) {
        const lowerFilter = globalFilter.toLowerCase();
        filteredData = filteredData.filter(row => 
          Object.values(row).some(val => 
            String(val).toLowerCase().includes(lowerFilter)
          )
        );
      }
      
      // Apply column filters
      columnFilters.forEach(filter => {
        filteredData = filteredData.filter(row => {
          const cellValue = String(row[filter.id] || '').toLowerCase();
          const filterValue = String(filter.value || '').toLowerCase();
          return cellValue.includes(filterValue);
        });
      });
      
      // Generate gene lists from the filtered rows. Sorting is deliberately
      // ignored: Top/Bottom N always follow the score column.
      handleTableDataChange(filteredData);
    }, 1000);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [columnFilters, globalFilter, tableData.data, handleTableDataChange]);

  const minDatasetOptions = useMemo(
    () => Array.from({ length: datasetFilterMax }, (_, idx) => idx + 1),
    [datasetFilterMax]
  );

  if (!parsedData) {
    return <div>No data available</div>;
  }

  // Get description based on current selection
  const getDescription = () => {
    const gene = parsedData.gene;
    if (selectedMainTab.value === 0) {
      // Perturbation Effects (Downstream Effects)
      if (selectedSubTab.value === 0) {
        return `Genes regulated by ${gene} perturbation (downstream targets)`;
      } else {
        return `Which perturbations show similar effects to perturbation of ${gene}?`;
      }
    } else {
      // Perturbed By (Upstream Regulators)
      if (selectedSubTab.value === 0) {
        return `Genes that regulate ${gene} expression when perturbed (upstream regulators)`;
      } else {
        return `Expression of which genes show similar pattern to ${gene} expression upon perturbation of genome?`;
      }
    }
  };

  return (
    <div className={styles.container}>
     

      

      <Tabs
        name="mainTabs"
        value={selectedMainTab}
        options={mainTabOptions}
        onChange={(evt) => {
          const { value, label } = evt.target;
          setSelectedMainTab({ value, label });
        }}
      />

      <Card bordered style={{ paddingTop: '0px' }}>
        <Tabs
          name="subTabs"
          value={selectedSubTab}
          options={subTabOptions}
          onChange={(evt) => {
            const { value, label } = evt.target;
            setSelectedSubTab({ value, label });
          }}
        />

        

        <Text muted style={{ marginBottom: '5px' }}>
          {getDescription()}
        </Text>

        

        {/* Controls for ranks and filtering */}
        <Flex justifyContent="space-between" alignItems="center" style={{ marginBottom: '10px', flexWrap: 'wrap', gap: '16px' }}>
          {/* Dataset filter */}
          <Flex alignItems="center" gap="8px">
            <Text size="small">Show genes in at least</Text>
            <select
              value={minDatasets}
              onChange={(e) => {
                const newValue = Number(e.target.value);
                setMinDatasets(newValue);
              }}
              style={{ 
                minWidth: '60px', 
                width: '60px',
                padding: '4px 8px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            >
              {minDatasetOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select> datasets.
          </Flex>

          {/* Dataset Selection Controls */}
          <Flex alignItems="center" gap="8px">
            <Text size="small" style={{ whiteSpace: 'nowrap' }}>Datasets:</Text>
            <div className={styles.datasetDropdown} ref={dropdownRef}>
              <button
                type="button"
                className={styles.datasetDropdownButton}
                onClick={() => setIsDatasetDropdownOpen(!isDatasetDropdownOpen)}
              >
                <span>
                  {selectedDatasets.size === 0 
                    ? 'Select datasets...' 
                    : `${selectedDatasets.size} dataset${selectedDatasets.size > 1 ? 's' : ''} selected`
                  }
                </span>
                <span className={`${styles.dropdownArrow} ${isDatasetDropdownOpen ? styles.open : ''}`}>
                  ▼
                </span>
              </button>
              
              {isDatasetDropdownOpen && (
                <div className={styles.datasetDropdownContent}>
                  {parsedData?.datasets?.map(dataset => {
                    const hasData = datasetsWithData.has(dataset);
                    const isSelected = selectedDatasets.has(dataset);
                    const datasetName = dataset === 'K562gwps' ? 'K562' : 
                                       dataset === 'HCT116gwps' ? 'HCT116' : 
                                       dataset === 'HEK293gwps' ? 'HEK293' : dataset;
                    
                    return (
                      <label
                        key={dataset}
                        className={`${styles.datasetDropdownItem} ${!hasData ? styles.disabled : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          disabled={!hasData}
                          onChange={(e) => {
                            if (hasData) {
                              const newSelected = new Set(selectedDatasets);
                              if (e.target.checked) {
                                newSelected.add(dataset);
                              } else {
                                newSelected.delete(dataset);
                              }
                              setSelectedDatasets(newSelected);
                            }
                          }}
                          className={styles.checkbox}
                        />
                        <span className={`${styles.datasetLabel} ${!hasData ? styles.disabledText : ''}`}>
                          {datasetName}
                          {!hasData && ' (No Data)'}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          </Flex>
          
          {/* Toggle for showing ranks */}
          <Flex alignItems="center" gap="16px">
            <Flex alignItems="center" gap="8px">
              <Text size="small">Rank based average:</Text>
              <Toggle
                checked={showRanks}
                onChange={(e) => setShowRanks(e.target.checked)}
              />
            </Flex>
            
            {/* Rank order toggle - only show when ranks are enabled */}
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
                    '&:hover': {
                      backgroundColor: '#e9ecef',
                      borderColor: '#adb5bd'
                    }
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

          {/* Download button */}
          <Flex alignItems="center" gap="8px">
            <button
              onClick={downloadTableData}
              disabled={!tableData.data || tableData.data.length === 0}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 8px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                backgroundColor: '#f8f9fa',
                cursor: tableData.data && tableData.data.length > 0 ? 'pointer' : 'not-allowed',
                fontSize: '12px',
                transition: 'all 0.2s ease',
                opacity: tableData.data && tableData.data.length > 0 ? 1 : 0.6
              }}
              onMouseEnter={(e) => {
                if (tableData.data && tableData.data.length > 0) {
                  e.target.style.backgroundColor = '#e9ecef';
                  e.target.style.borderColor = '#adb5bd';
                }
              }}
              onMouseLeave={(e) => {
                if (tableData.data && tableData.data.length > 0) {
                  e.target.style.backgroundColor = '#f8f9fa';
                  e.target.style.borderColor = '#ccc';
                }
              }}
              title="Download table data as CSV"
            >
              <FaDownload style={{ color: '#28a745', fontSize: '12px' }} />
              <span>CSV</span>
            </button>
          </Flex>
        </Flex>

        {tableData.data.length > 0 ? (
          <>
            <div style={{ maxHeight: '50vh', overflow: 'auto' }}>
              <MaterialReactTable
                columns={tableData.columns}
                data={tableData.data}
                enableSorting
                enableFilters
                enablePagination={false}  // Disable pagination in favor of virtualization
                enableRowVirtualization={true}  // Enable row virtualization
                enableColumnOrdering={false}  // Disable column reordering to maintain our order
                enableColumnDragging={false}  // Disable column dragging
                enableColumnActions={false}  // Hide column actions
                state={{
                  sorting,
                  columnFilters,
                  globalFilter,
                }}
                onSortingChange={setSorting}
                onColumnFiltersChange={setColumnFilters}
                onGlobalFilterChange={setGlobalFilter}
                muiTableContainerProps={{
                  sx: { maxHeight: '50vh' }  // Set fixed height for virtualization
                }}
                initialState={{
                  showGlobalFilter: true,
                  sorting: showRanks ? [{ id: 'average_rank', desc: false }] : [{ id: 'average', desc: true }],
                }}
                muiTableProps={{
                  sx: {
                    '& .MuiTableCell-root': {
                      fontSize: '0.875rem',
                    },
                  },
                }}
              />
            </div>
            <Spacer height={10} />
            {activeGeneLists && Object.keys(activeGeneLists).length > 0 && (
              <>
                <Tabs
                  name="tabs-multidataset"
                  value={enrichmentTab}
                  options={tabOptions}
                  onChange={(evt) => {
                    const { value, label } = evt.target;
                    setEnrichmentTab({ value, label });
                  }}
                />

                {enrichmentTab.value === "gsea" ? (
                  <GeneSetEnrichmentTable genesets={activeGeneLists} />
                ) : (
                  <span> Will be available soon! </span>
                )}
              </>
            )}
          </>
        ) : (
          <div className={styles.noData}>
            <Text muted>No data available for this combination</Text>
          </div>
        )}
      </Card>

    
      
    </div>
  );
};

const SafeMultiDatasetComparison = withErrorBoundary(MultiDatasetComparison, {
  label: "Multi-dataset comparison",
  resetKeys: (props) => [props.data],
});

export { SafeMultiDatasetComparison as MultiDatasetComparison };
