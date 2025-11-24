import { Tree, Field, Select } from "@oliasoft-open-source/react-ui-library";
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
import { CoreSettingsTypes } from "../side-bar/settings/enums";
import { CorrelationSettingsTypes } from "../side-bar/settings/enums";
import styles from "./AccordionMenu.scss";
import { ROUTES } from "../../common/routes";
import { useLocation } from "react-router-dom";
import { updateGeneLists, fetchDatasets } from "../../store/api";
import { Text } from "@oliasoft-open-source/react-ui-library";

const DatasetSelector = forwardRef(
  ({ coreSettingsChanged, correlationSettingsChanged, coreSettings, correlationSettings, wholeGenomeOnly = false }, ref, onlyMain) => {
    const location = useLocation();
    const isCorrelationModule = location.pathname === ROUTES.CORRELATION;
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

    // Function to handle checkbox change for correlation module
    const handleCheckboxChange = useCallback((datasetId, checked) => {
      if (!isCorrelationModule) return;
      
      const current = correlationSettings?.selectedDatasets || [];
      let newSelection;
      
      if (checked) {
        newSelection = [...current, datasetId];
      } else {
        newSelection = current.filter((ds) => ds !== datasetId);
      }
      
      correlationSettingsChanged({
        settingName: CorrelationSettingsTypes.SELECTED_DATASETS,
        newValue: newSelection,
      });
    }, [isCorrelationModule, correlationSettings?.selectedDatasets, correlationSettingsChanged]);

    // Function to transform backend dataset to frontend format
    const transformDataset = useCallback((dataset) => {
      const isActive = isCorrelationModule 
        ? false // Correlation module uses checkbox selection, not active state
        : dataset.id === coreSettings.cellLine?.id;
      
      return {
        ...dataset,
        onClick: isCorrelationModule 
          ? undefined // No onClick for correlation module (use checkboxes instead)
          : () => updateActivityById(
              dataset.id, 
              dataset.perturbationCount, 
              dataset.geneCount, 
              dataset.isMixscape
            ),
        active: isActive,
      };
    }, [updateActivityById, isCorrelationModule, coreSettings.cellLine?.id]);

    // Load datasets from backend
    useEffect(() => {
      const loadDatasets = async () => {
        try {
          setLoading(true);
          const datasets = await fetchDatasets();
          const transformedDatasets = datasets.map(transformDataset);
      
          // For correlation module, we don't auto-select datasets - user must select manually

          // Filter for whole genome datasets if wholeGenomeOnly is true (for non-correlation modules)
          if (wholeGenomeOnly && !isCorrelationModule) {
            const filteredDatasets = transformedDatasets.filter(dataset => dataset.isWholeGenome === true);
            // Ensure the first whole genome dataset is active if current selection is not in the filtered list
            const hasActiveDataset = filteredDatasets.some(dataset => dataset.active);
            if (!hasActiveDataset && filteredDatasets.length > 0) {
              filteredDatasets[0].active = true;
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
    }, [wholeGenomeOnly, transformDataset, isCorrelationModule]);

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
      if (!isCorrelationModule) {
        updateGeneLists(coreSettings.cellLine.id);
      } else if (correlationSettings?.selectedDatasets?.length > 0) {
        // For correlation module, use the first selected dataset for gene lists
        const firstSelectedId = correlationSettings.selectedDatasets[0];
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
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [coreSettings.cellLine.id, isCorrelationModule, correlationSettings?.selectedDatasets?.[0]]);

    // Sync active/checked state when settings change
    useEffect(() => {
      if (isCorrelationModule) {
        // For correlation module, sync checkbox state
        setDatasetList(prevList => 
          prevList.map(item => ({
            ...item,
            active: correlationSettings?.selectedDatasets?.includes(item.id) || false,
            checked: correlationSettings?.selectedDatasets?.includes(item.id) || false,
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
    }, [coreSettings.cellLine?.id, isCorrelationModule, correlationSettings?.selectedDatasets]);

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

    // For correlation module with checkboxes, render custom checkbox list
    if (isCorrelationModule) {
      const selectedCount = correlationSettings?.selectedDatasets?.length || 0;
      
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
                  const isSelected = correlationSettings?.selectedDatasets?.includes(dataset.id);
                  
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
                      ⚠️ No datasets selected. Select at least one dataset to calculate correlation.
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
          {selectedCount > 1 && (
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
              <Field
                label=""
                labelLeft={false}
                helpText="Method to combine correlation scores across datasets: Average takes the mean, Max takes the value with maximum absolute value."
              >
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
              </Field>
            </div>
          )}
        </>
      );
    }

    // Default view for other modules - improved styling without checkboxes
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
                const isActive = dataset.id === coreSettings.cellLine?.id;
                
                return (
                  <div
                    key={dataset.id}
                    onClick={dataset.onClick}
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
                      {dataset.name}
                    </Text>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </>
    );
  }
);

const mapStateToProps = ({ settings }) => ({
  coreSettings: settings?.core ?? {},
  correlationSettings: settings?.correlation ?? {},
});

const mapDispatchToProps = { 
  coreSettingsChanged,
  correlationSettingsChanged,
};

const MainContainer = connect(mapStateToProps, mapDispatchToProps, null, {
  forwardRef: true,
})(DatasetSelector);

export { MainContainer as DatasetSelector };
