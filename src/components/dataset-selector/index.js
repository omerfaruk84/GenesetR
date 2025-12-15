import { Field, Select } from "@oliasoft-open-source/react-ui-library";
import React, {
  useEffect, 
  useState,
  useImperativeHandle,
  forwardRef,
  useCallback,
} from "react";
import { connect } from "react-redux";
import { FaTrash } from "react-icons/fa";
import { coreSettingsChanged } from "../../store/settings/core-settings";
import { correlationSettingsChanged } from "../../store/settings/correlation-settings";
import { pathfinderSettingsChanged } from "../../store/settings/pathfinder-settings";
import { deregulatedGenesSettingsChanged } from "../../store/settings/deregulated-genes-settings";
import { CoreSettingsTypes, CorrelationSettingsTypes, DeregulatedGenesSettingsTypes, PathFinderSettingsTypes } from "../side-bar/settings/enums";
import styles from "./AccordionMenu.scss";
import { ROUTES } from "../../common/routes";
import { useLocation } from "react-router-dom";
import { updateGeneLists, fetchDatasets } from "../../store/api";
import { Text } from "@oliasoft-open-source/react-ui-library";

const DatasetTreeItem = ({ item, level = 0, activeId }) => {
  const isActive = item.id === activeId;
  const hasChildren = item.children && item.children.length > 0;
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div style={{ marginLeft: level > 0 ? "12px" : "0", borderLeft: level > 0 ? "1px solid #eee" : "none" }}>
      <div 
        style={{ 
          display: "flex", 
          alignItems: "center", 
          marginBottom: "2px",
          paddingLeft: level > 0 ? "8px" : "0"
        }}
      >
        {hasChildren ? (
          <span 
            onClick={(e) => { 
              e.stopPropagation(); 
              setIsExpanded(!isExpanded); 
            }}
            style={{ 
              cursor: "pointer", 
              marginRight: "4px", 
              width: "14px", 
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#666",
              fontSize: "10px"
            }}
          >
            {isExpanded ? "▼" : "▶"}
          </span>
        ) : (
          <span style={{ width: "18px" }}></span>
        )}
        
        <div
          onClick={item.onClick}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            cursor: "pointer",
            padding: "4px 8px",
            borderRadius: "4px",
            backgroundColor: isActive ? "#e3f2fd" : "transparent",
            border: isActive ? "1px solid #90caf9" : "1px solid transparent",
            transition: "all 0.2s ease",
            flex: 1,
            minHeight: "28px",
          }}
          onMouseEnter={(e) => {
            if (!isActive) {
              e.currentTarget.style.backgroundColor = "#f5f5f5";
            }
          }}
          onMouseLeave={(e) => {
            if (!isActive) {
              e.currentTarget.style.backgroundColor = "transparent";
            }
          }}
        >
          <Text size="small" style={{
            color: isActive ? "#1976d2" : "#333",
            fontWeight: isActive ? "500" : "normal",
            flex: 1,
            lineHeight: "1.3",
          }}>
            {item.name} {item.id.toString().length > 17 ? "(DR Result)" : ""}
          </Text>
        </div>
      </div>
      
      {hasChildren && isExpanded && (
        <div style={{ marginTop: "2px" }}>
          {item.children.map(child => (
            <DatasetTreeItem 
              key={child.id} 
              item={child} 
              level={level + 1} 
              activeId={activeId}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const DatasetSelector = forwardRef(
  ({ coreSettingsChanged, correlationSettingsChanged, pathfinderSettingsChanged, deregulatedGenesSettingsChanged, coreSettings, correlationSettings, pathfinderSettings, deregulatedGenesSettings, wholeGenomeOnly = false }, ref, onlyMain) => {
    const location = useLocation();
    const isCorrelationModule = location.pathname === ROUTES.CORRELATION;
    const isPathFinderModule = location.pathname === ROUTES.PATHFINDER;
    const isDeregulatedModule = location.pathname === ROUTES.DEREGULATED_GENES;
    const isMultiSelectMode = isCorrelationModule || isPathFinderModule || isDeregulatedModule;

    const updateActivityById = useCallback((id, perturbationCount, geneCount, isMixscape) => {
      setDatasetList(prevList => 
        prevList.map(item => ({
          ...item,
          active: item.id === id
        }))
      );
      coreSettingsChanged({
        settingName: CoreSettingsTypes.CELL_LINE,
        newValue: {
          id,
          perturbationCount,
          geneCount,
          isMixscape,
        },
      });
    }, [coreSettingsChanged]);

    const [datasetList, setDatasetList] = useState([]);
    const [loading, setLoading] = useState(true);

    // Function to handle checkbox change for correlation or pathfinder module
    const handleCheckboxChange = useCallback((datasetId, checked) => {
      if (!isMultiSelectMode) return;
      
      let current = [];
      let settingName = "";
      let changeHandler = null;

      if (isCorrelationModule) {
        current = correlationSettings?.selectedDatasets || [];
        settingName = CorrelationSettingsTypes.SELECTED_DATASETS;
        changeHandler = correlationSettingsChanged;
      } else if (isPathFinderModule) {
        current = pathfinderSettings?.selectedDatasets || [];
        settingName = PathFinderSettingsTypes.SELECTED_DATASETS;
        changeHandler = pathfinderSettingsChanged;
      } else if (isDeregulatedModule) {
        current = deregulatedGenesSettings?.selectedDatasets || [];
        settingName = DeregulatedGenesSettingsTypes.SELECTED_DATASETS;
        changeHandler = deregulatedGenesSettingsChanged;
      } else {
        return;
      }

      let newSelection;
      
      if (checked) {
        newSelection = [...current, datasetId];
      } else {
        newSelection = current.filter((ds) => ds !== datasetId);
      }
      
      changeHandler({
        settingName: settingName,
        newValue: newSelection,
      });
    }, [isMultiSelectMode, isCorrelationModule, isPathFinderModule, isDeregulatedModule, correlationSettings?.selectedDatasets, pathfinderSettings?.selectedDatasets, deregulatedGenesSettings?.selectedDatasets, correlationSettingsChanged, pathfinderSettingsChanged, deregulatedGenesSettingsChanged]);

    // Function to transform backend dataset to frontend format
    // NOTE: We removed coreSettings.cellLine?.id from dependencies to prevent
    // re-running this and the main useEffect when only the selection changes.
    // The active state is now handled during render via activeId prop.
    const transformDataset = useCallback((dataset) => {
      return {
        ...dataset,
        onClick: isMultiSelectMode 
          ? undefined // No onClick for multi-select (use checkboxes instead)
          : () => updateActivityById(
              dataset.id, 
              dataset.perturbationCount, 
              dataset.geneCount, 
              dataset.isMixscape
            ),
        // active property is no longer used for state updates, handled in render
      };
    }, [updateActivityById, isMultiSelectMode]);

    // Load datasets from backend
    useEffect(() => {
      const loadDatasets = async () => {
        try {
          setLoading(true);
          const datasets = await fetchDatasets();
          const transformedDatasets = datasets.map(transformDataset);
      
          // For multi-select modules, we don't auto-select datasets - user must select manually

          // Filter for whole genome datasets if wholeGenomeOnly is true (for non-correlation modules)
          if (wholeGenomeOnly && !isCorrelationModule) {
            const filteredDatasets = transformedDatasets.filter(dataset => dataset.isWholeGenome === true);
            // Ensure the first whole genome dataset is active if current selection is not in the filtered list
            // Note: We check against coreSettings.cellLine.id directly here since datasets don't have active prop anymore
            const hasActiveDataset = filteredDatasets.some(dataset => dataset.id === coreSettings.cellLine?.id);
            if (!hasActiveDataset && filteredDatasets.length > 0 && !isMultiSelectMode && !coreSettings.cellLine?.id) {
               // Only auto-select if nothing is selected
               // We can't set active state on the object, but we can trigger the update
               const first = filteredDatasets[0];
               updateActivityById(first.id, first.perturbationCount, first.geneCount, first.isMixscape);
            }
            setDatasetList(filteredDatasets);
          } else {
            setDatasetList(transformedDatasets);
          }
        } catch (error) {
          console.error("Failed to load datasets:", error);
          setDatasetList([]);
        } finally {
          setLoading(false);
        }
      };

      loadDatasets();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [wholeGenomeOnly, transformDataset, isCorrelationModule, isMultiSelectMode, isDeregulatedModule]);

    const deleteItemAndChildren = (id) => {
      let parent = "";

      datasetList.forEach((item, index) => {
        if (item.id.toString() === id) {
          parent =   {id: item.id, 
            perturbationCount: item.perturbationCount,
        geneCount: item.geneCount,
        isMixscape:  item.isMixscape,
        };
        }
      });

      let arr = deleteItemAndChildrenHelper(id);

      setDatasetList(arr);

      coreSettingsChanged({
        settingName: CoreSettingsTypes.CELL_LINE,
        newValue: parent,
      });
    };

    function deleteItemAndChildrenHelper(id, ds = datasetList) {
      let arr = [...ds];

      arr.forEach((item, index) => {
        if (item.id.toString() === id) {
          arr.splice(index, 1); // remove the item
          // recursively delete its children
          arr
            .filter((child) => child.parent.toString() === id)
            .forEach((child) =>
              deleteItemAndChildrenHelper(child.id.toString(), arr)
            );
        }
      });
      return arr;
    }

    useImperativeHandle(ref, () => ({
      saveDataset: (newID, name, parentID, dataShape, dataType) => {
        console.log("saveDataset called with:", { newID, name, parentID, dataShape, dataType });
        setDatasetList((prevDatasetList) => {
          let arr = [];
          var isParentMixscape = false;

          for (var e in prevDatasetList) {
            var itemx = prevDatasetList[e];
            if (itemx.id === newID) continue;

            var actionsNew = [];
            if (itemx?.actions && itemx.id.toString().length > 17) {
              actionsNew = [
                {
                  icon: <FaTrash />,
                  label: "Delete",
                  onClick: (
                    (id) => () =>
                      deleteItemAndChildren(id)
                  )(itemx.id),
                },
              ];
            }
            if(itemx.id === parentID) isParentMixscape = itemx.isMixscape;
            var newItem = {
              resultShape: itemx?.resultShape,
              perturbationCount: itemx?.perturbationCount || itemx?.resultShape?.split(" ")[0],
              geneCount: itemx?.geneCount || itemx?.resultShape?.split(" ")[1],
              isMixscape: itemx.isMixscape,              
              droppable: false,
              isOpen: itemx.id === parentID,
              id: itemx.id,
              dataType: itemx?.dataType,
              name: itemx?.name,
              parent: itemx?.parent,
              onClick: (
                (id, perturbationCount, geneCount, isMixscape) => () =>
                  updateActivityById(id, perturbationCount, geneCount, isMixscape)
              )(itemx.id, itemx.perturbationCount, itemx.geneCount, itemx.isMixscape),
              actions: actionsNew,
              active: false,
            };
            arr.push(newItem);
          }

          var newItem = {
            resultShape: dataShape,
            perturbationCount: dataShape.split(" ")[0],
            geneCount:  dataShape.split(" ")[1],
            isMixscape: isParentMixscape,
            dataType: dataType,
            droppable: false,
            isOpen: true,
            id: newID,
            name: name,
            parent: parentID,
            onClick: (
              (id, perturbationCount, geneCount, isMixscape) => () =>
                updateActivityById(id, perturbationCount, geneCount, isMixscape)
            )(newID, dataShape.split(" ")[0], dataShape.split(" ")[1], isParentMixscape),
            actions: [
              {
                icon: <FaTrash />,
                label: "Delete",
                onClick: (
                  (id) => () =>
                    deleteItemAndChildren(id)
                )(newID),
              },
            ],
            active: true,
          };
          arr.push(newItem);
          //Save the settings
          coreSettingsChanged({
            settingName: CoreSettingsTypes.CELL_LINE,
            newValue:   {id: newItem.id, 
            perturbationCount: newItem.perturbationCount,
        geneCount: newItem.geneCount,
        isMixscape:  newItem.isMixscape,
        },
          });

          return arr;
        });
      },
    }));

    useEffect(() => {
      //console.log(coreSettings.cellLine
      if (!isMultiSelectMode) {
        updateGeneLists(coreSettings.cellLine.id);
      } else {
        // For multi-select modules, use the first selected dataset for gene lists
        let selectedDatasets = [];
        if (isCorrelationModule) selectedDatasets = correlationSettings?.selectedDatasets || [];
        else if (isPathFinderModule) selectedDatasets = pathfinderSettings?.selectedDatasets || [];
        else if (isDeregulatedModule) selectedDatasets = deregulatedGenesSettings?.selectedDatasets || [];
        else if (isDeregulatedModule) selectedDatasets = deregulatedGenesSettings?.selectedDatasets || [];

        if (selectedDatasets.length > 0) {
          const firstSelectedId = selectedDatasets[0];
          updateGeneLists(firstSelectedId);
          
          // Also update core settings cellLine to the first selected dataset for compatibility
          const firstDataset = datasetList.find(d => d.id === firstSelectedId);
          if (firstDataset && coreSettings.cellLine?.id !== firstSelectedId) {
            updateActivityById(
              firstSelectedId,
              firstDataset.perturbationCount,
              firstDataset.geneCount,
              firstDataset.isMixscape
            );
          }
        }
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [coreSettings.cellLine.id, isMultiSelectMode, isCorrelationModule, isPathFinderModule, isDeregulatedModule, correlationSettings?.selectedDatasets?.[0], pathfinderSettings?.selectedDatasets?.[0], deregulatedGenesSettings?.selectedDatasets?.[0]]);

    // Sync active/checked state when settings change
    useEffect(() => {
      if (isMultiSelectMode) {
        let selectedDatasets = [];
        if (isCorrelationModule) selectedDatasets = correlationSettings?.selectedDatasets || [];
        else if (isPathFinderModule) selectedDatasets = pathfinderSettings?.selectedDatasets || [];

        // For multi-select modules, sync checkbox state
        setDatasetList(prevList => 
          prevList.map(item => ({
            ...item,
            active: selectedDatasets.includes(item.id) || false,
            checked: selectedDatasets.includes(item.id) || false,
          }))
        );
      } else if (coreSettings.cellLine?.id) {
        // For other modules, sync active state
        setDatasetList(prevList => 
          prevList.map(item => ({
            ...item,
            active: item.id === coreSettings.cellLine.id
          }))
        );
      }
    }, [coreSettings.cellLine?.id, isMultiSelectMode, isCorrelationModule, isPathFinderModule, isDeregulatedModule, correlationSettings?.selectedDatasets, pathfinderSettings?.selectedDatasets, deregulatedGenesSettings?.selectedDatasets]);

    useEffect(() => {
      if (
        location.pathname === ROUTES.CORRELATION ||
        location.pathname === ROUTES.HEATMAP ||
        location.pathname === ROUTES.GENE_REGULATION||
        location.pathname === ROUTES.EXPRESSIONANALYZER || 
        location.pathname === ROUTES.GENESIGNATURE
      ) {
        if (coreSettings.cellLine.id.length > 17)
          updateActivityById("K562gwps", 11258, 8248, false);
      }
    }, [location.pathname]);

    if (loading) {
      return (
        <div
          className={styles._itemHeader_1fhdv_401}
          style={{ border: "1px solid black", height: "250px", overflow: "auto", scrollbarWidth: "thin" }}
        >
          <div style={{ padding: "20px", textAlign: "center" }}>
            Loading datasets...
          </div>
        </div>
      );
    }

    // Filter datasets based on route
    const filteredDatasets = location.pathname !== ROUTES.DR
      ? datasetList.filter((x) => x.id.length < 17)
      : datasetList;

    // For multi-select modules with checkboxes, render custom checkbox list
    if (isMultiSelectMode) {
      let selectedCount = 0;
      let changeHandler = null;
      if (isCorrelationModule) {
        selectedCount = correlationSettings?.selectedDatasets?.length || 0;
        changeHandler = correlationSettingsChanged;
      } else if (isPathFinderModule) {
        selectedCount = pathfinderSettings?.selectedDatasets?.length || 0;
        changeHandler = pathfinderSettingsChanged;
      } else if (isDeregulatedModule) {
        selectedCount = deregulatedGenesSettings?.selectedDatasets?.length || 0;
        changeHandler = deregulatedGenesSettingsChanged;
      }
      
      return (
        <>
          <div
            className={styles._itemHeader_1fhdv_401}
            style={{ 
              border: "1px solid #e0e0e0", 
              borderRadius: "8px",
              height: "250px", 
              overflow: "auto", 
              scrollbarWidth: "thin",
              scrollbarColor: "#c0c0c0 #f5f5f5",
              padding: "12px",
              backgroundColor: "#fafafa",
              boxShadow: "0 2px 4px rgba(0,0,0,0.05)"
            }}
          >
            <div style={{ 
              marginBottom: "12px", 
              fontWeight: "600", 
              fontSize: "14px",
              color: "#333",
              paddingBottom: "8px",
              borderBottom: "1px solid #e0e0e0"
            }}>
              Dataset Selection
              {selectedCount > 0 && (
                <span style={{ 
                  marginLeft: "8px", 
                  fontSize: "12px", 
                  fontWeight: "normal", 
                  color: "#666" 
                }}>
                  ({selectedCount} selected)
                </span>
              )}
            </div>
            {filteredDatasets.length === 0 ? (
              <div style={{ 
                padding: "20px", 
                textAlign: "center",
                color: "#999",
                fontStyle: "italic"
              }}>
                No datasets are available.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                {filteredDatasets.map((dataset) => {
                  let isSelected = false;
                  if (isCorrelationModule) isSelected = correlationSettings?.selectedDatasets?.includes(dataset.id);
                  else if (isPathFinderModule) isSelected = pathfinderSettings?.selectedDatasets?.includes(dataset.id);
                  else if (isDeregulatedModule) isSelected = deregulatedGenesSettings?.selectedDatasets?.includes(dataset.id);
                  
                  return (
                    <label
                      key={dataset.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        cursor: "pointer",
                        padding: "4px 8px",
                        borderRadius: "4px",
                        backgroundColor: isSelected ? "#e3f2fd" : "transparent",
                        border: isSelected ? "1px solid #90caf9" : "1px solid transparent",
                        transition: "all 0.2s ease",
                        minHeight: "28px",
                        width: "100%",
                        boxSizing: "border-box"
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.backgroundColor = "#f5f5f5";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.backgroundColor = "transparent";
                        }
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          handleCheckboxChange(dataset.id, e.target.checked);
                        }}
                        style={{
                          cursor: "pointer",
                          width: "14px",
                          height: "14px",
                          accentColor: "#1976d2",
                          flexShrink: 0,
                        }}
                      />
                      <Text size="small" style={{ 
                        color: isSelected ? "#1976d2" : "#333",
                        fontWeight: isSelected ? "500" : "normal",
                        flex: 1,
                        lineHeight: "1.3",
                      }}>
                        {dataset.name}
                      </Text>
                    </label>
                  );
                })}
                {selectedCount === 0 && (
                  <div style={{ 
                    marginTop: "8px",
                    padding: "8px",
                    backgroundColor: "#fff3cd",
                    borderRadius: "4px",
                    border: "1px solid #ffc107"
                  }}>
                    <Text size="small" style={{ color: "#856404", fontStyle: "italic" }}>
                      No datasets selected. Select at least one dataset to calculate.
                    </Text>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Selected count badge/notification */}
          {selectedCount > 0 && (
            <div style={{
              marginTop: "12px",
              padding: "10px 12px",
              backgroundColor: selectedCount > 1 ? "#e3f2fd" : "#f5f5f5",
              borderRadius: "6px",
              border: selectedCount > 1 ? "1px solid #90caf9" : "1px solid #e0e0e0",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minWidth: "24px",
                  height: "24px",
                  padding: "0 8px",
                  backgroundColor: selectedCount > 1 ? "#1976d2" : "#757575",
                  color: "white",
                  borderRadius: "12px",
                  fontSize: "12px",
                  fontWeight: "600"
                }}>
                  {selectedCount}
                </span>
                <Text size="small" style={{ 
                  color: selectedCount > 1 ? "#1976d2" : "#666",
                  fontWeight: "500"
                }}>
                  {selectedCount === 1 ? "dataset selected" : "datasets selected"}
                </Text>
              </div>
            </div>
          )}

          {/* Combine Method setting - shown when multiple datasets are selected */}
          {isCorrelationModule && selectedCount > 1 && (
            <div style={{ 
              marginTop: "12px",
              padding: "12px",
              backgroundColor: "#fff3e0",
              borderRadius: "6px",
              border: "2px solid #ff9800",
              boxShadow: "0 2px 4px rgba(255, 152, 0, 0.15)"
            }}>
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "8px"
              }}>
                <span style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "20px",
                  height: "20px",
                  backgroundColor: "#ff9800",
                  color: "white",
                  borderRadius: "50%",
                  fontSize: "12px",
                  fontWeight: "bold"
                }}>
                  ⚙
                </span>
                <Text size="small" style={{ 
                  color: "#e65100",
                  fontWeight: "600",
                  fontSize: "13px"
                }}>
                  Combine Method for Multiple Datasets
                </Text>
              </div>
              <div style={{ marginBottom: "8px" }}>
                <Select
                  small
                  onChange={({ target: { value } }) =>
                    correlationSettingsChanged({
                      settingName: CorrelationSettingsTypes.COMBINE_METHOD,
                      newValue: value,
                    })
                  }
                  options={[
                    { label: "Average", value: "average" },
                    { label: "Max", value: "max" },
                  ]}
                  value={correlationSettings?.combineMethod || "average"}
                />
              </div>
              <Text size="small" style={{ 
                color: "#856404",
                fontSize: "11px",
                lineHeight: "1.4",
                marginTop: "8px",
                padding: "8px",
                backgroundColor: "#fffbf0",
                borderRadius: "4px",
                border: "1px solid #ffd54f"
              }}>
                <strong>Help:</strong> Method to combine correlation scores across multiple datasets. <strong>'Average'</strong> calculates the mean correlation value across all selected datasets, providing a balanced representation. <strong>'Max'</strong> selects the correlation value with the maximum absolute magnitude, emphasizing the strongest relationship found in any dataset. Use Average for more conservative, consensus-based results, or Max to highlight the strongest correlations.
              </Text>
            </div>
          )}

          {/* Combination Strategy setting for PathFinder - shown when multiple datasets are selected */}
          {isPathFinderModule && selectedCount > 1 && (
            <div style={{ 
              marginTop: "12px",
              padding: "12px",
              backgroundColor: "#e8f5e9",
              borderRadius: "6px",
              border: "2px solid #4caf50",
              boxShadow: "0 2px 4px rgba(76, 175, 80, 0.15)"
            }}>
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "8px"
              }}>
                <span style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "20px",
                  height: "20px",
                  backgroundColor: "#4caf50",
                  color: "white",
                  borderRadius: "50%",
                  fontSize: "12px",
                  fontWeight: "bold"
                }}>
                  ⚙
                </span>
                <Text size="small" style={{ 
                  color: "#2e7d32",
                  fontWeight: "600",
                  fontSize: "13px"
                }}>
                  Combination Strategy for Multiple Datasets
                </Text>
              </div>
              <div style={{ marginBottom: "8px" }}>
                <Select
                  small
                  onChange={({ target: { value } }) =>
                    pathfinderSettingsChanged({
                      settingName: PathFinderSettingsTypes.COMBINATION_STRATEGY,
                      newValue: value,
                    })
                  }
                  options={[
                    { label: "Strict Intersection (AND)", value: "intersection" },
                    { label: "Union (OR)", value: "union" },
                  ]}
                  value={pathfinderSettings?.combinationStrategy || "intersection"}
                />
              </div>
              <Text size="small" style={{ 
                color: "#2e7d32",
                fontSize: "11px",
                lineHeight: "1.4",
                marginTop: "8px",
                padding: "8px",
                backgroundColor: "#f1f8f4",
                borderRadius: "4px",
                border: "1px solid #81c784"
              }}>
                <strong>Help:</strong> Strategy to combine network edges and nodes across multiple datasets. <strong>'Strict Intersection (AND)'</strong> keeps only edges and nodes that appear in ALL selected datasets, providing high-confidence results with reduced false positives but potentially fewer findings. <strong>'Union (OR)'</strong> includes edges and nodes found in ANY selected dataset, providing more comprehensive networks but may include dataset-specific artifacts. Use Intersection for conservative, highly reliable networks, or Union for exploratory analysis with broader coverage.
              </Text>
            </div>
          )}
        </>
      );
    }

    // Default view for other modules - improved styling with DR chaining support (Tree Structure)
    
    // Helper to build tree hierarchy
    // We can assume this runs fast enough to not require memoization for small dataset lists
    const buildTree = (items) => {
      const itemMap = {};
      const roots = [];
      
      // Deep copy and create map
      items.forEach(item => {
        itemMap[item.id] = { ...item, children: [] };
      });
      
      // Build hierarchy
      items.forEach(item => {
        if (item.parent && itemMap[item.parent]) {
          itemMap[item.parent].children.push(itemMap[item.id]);
        } else {
          roots.push(itemMap[item.id]);
        }
      });
      
      return roots;
    };

    const treeRoots = buildTree(filteredDatasets);

    return (
      <>
        <div
          className={styles._itemHeader_1fhdv_401}
          style={{
            border: "1px solid #e0e0e0",
            borderRadius: "8px",
            height: "250px",
            overflow: "auto",
            scrollbarWidth: "thin",
            scrollbarColor: "#c0c0c0 #f5f5f5",
            padding: "12px",
            backgroundColor: "#fafafa",
            boxShadow: "0 2px 4px rgba(0,0,0,0.05)"
          }}
        >
          <div style={{
            marginBottom: "12px",
            fontWeight: "600",
            fontSize: "14px",
            color: "#333",
            paddingBottom: "8px",
            borderBottom: "1px solid #e0e0e0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}>
            <span>Dataset Selection</span>
            <div 
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: "18px",
                height: "18px",
                borderRadius: "50%",
                backgroundColor: "#e0e0e0",
                color: "#666",
                fontSize: "11px",
                cursor: "help",
                marginLeft: "8px"
              }}
              title="Select a dataset to analyze. Expand datasets to see and select previous DR results for chaining (e.g. run UMAP on PCA result)."
            >
              ?
            </div>
          </div>
          {filteredDatasets.length === 0 ? (
            <div style={{
              padding: "20px",
              textAlign: "center",
              color: "#999",
              fontStyle: "italic"
            }}>
              No datasets are available.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
              {treeRoots.map(root => (
                <DatasetTreeItem 
                  key={root.id} 
                  item={root} 
                  activeId={coreSettings.cellLine?.id}
                />
              ))}
            </div>
          )}
        </div>

        {/* For DR module, show chaining hint when DR results are available */}
        {location.pathname === ROUTES.DR && filteredDatasets.some(d => d.id.toString().length > 17) && (
          <div style={{
            marginTop: "12px",
            padding: "10px 12px",
            backgroundColor: "#fff3cd",
            borderRadius: "6px",
            border: "1px solid #ffc107",
            fontSize: "12px",
            color: "#856404"
          }}>
            💡 <strong>DR Chaining:</strong> Select a previous DR result (child node) above to run another DR method on it.
          </div>
        )}
      </>
    );
  }
);

const mapStateToProps = ({ settings }) => ({
  coreSettings: settings?.core ?? {},
  correlationSettings: settings?.correlation ?? {},
  pathfinderSettings: settings?.pathfinder ?? {},
  deregulatedGenesSettings: settings?.deregulatedGenes ?? {},
});

const mapDispatchToProps = { 
  coreSettingsChanged,
  correlationSettingsChanged,
  pathfinderSettingsChanged,
  deregulatedGenesSettingsChanged,
};

const MainContainer = connect(mapStateToProps, mapDispatchToProps, null, {
  forwardRef: true,
})(DatasetSelector);

export { MainContainer as DatasetSelector };
