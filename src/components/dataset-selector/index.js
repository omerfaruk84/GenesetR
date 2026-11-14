import { Field, Select, toast } from "@oliasoft-open-source/react-ui-library";
import React, {
  useEffect,
  useState,
  useImperativeHandle,
  forwardRef,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { connect } from "react-redux";
import { FaTrash, FaUser } from "react-icons/fa";
import {
  coreSettingsChanged,
  removeUserDataset,
  addDrResultDataset,
  fetchDatasetsFromBackend,
} from "../../store/settings/core-settings";
import { correlationSettingsChanged } from "../../store/settings/correlation-settings";
import { pathfinderSettingsChanged } from "../../store/settings/pathfinder-settings";
import { deregulatedGenesSettingsChanged } from "../../store/settings/deregulated-genes-settings";
import { genesignatureSettingsChanged } from "../../store/settings/gene-signature-settings";
import {
  CoreSettingsTypes,
  CorrelationSettingsTypes,
  DeregulatedGenesSettingsTypes,
  GeneSignatureSettingsTypes,
  PathFinderSettingsTypes,
} from "../side-bar/settings/enums";
import styles from "./AccordionMenu.scss";
import { Link } from "react-router-dom";
import { DATASET_KINDS, datasetMatches } from "../../utils/datasetFilters";
import { ROUTES } from "../../common/routes";
import { useLocation } from "react-router-dom";
import { updateGeneLists, deleteUserDataset as deleteUserDatasetAPI } from "../../store/api";
import { Text } from "@oliasoft-open-source/react-ui-library";

const DatasetTreeItem = ({ item, level = 0, activeId, onDeleteDataset }) => {
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
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}>
            {item.name} {item.isDrResult === true ? "(DR Result)" : ""}
            {item.isUserUploaded && (
              <FaUser
                style={{
                  color: "#1976d2",
                  fontSize: "10px",
                  flexShrink: 0,
                }}
                title="User uploaded dataset"
              />
            )}
          </Text>
        </div>

        {item.isUserUploaded && onDeleteDataset && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDeleteDataset(item.id, e);
            }}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: "4px",
              display: "flex",
              alignItems: "center",
              color: "#d32f2f",
              opacity: 0.7,
              transition: "opacity 0.2s",
              marginLeft: "4px",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = "1";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = "0.7";
            }}
            title="Delete dataset"
          >
            <FaTrash style={{ fontSize: "12px" }} />
          </button>
        )}
      </div>
      
      {hasChildren && isExpanded && (
        <div style={{ marginTop: "2px" }}>
          {item.children.map(child => (
            <DatasetTreeItem
              key={child.id}
              item={child}
              level={level + 1}
              activeId={activeId}
              onDeleteDataset={onDeleteDataset}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const DatasetSelector = forwardRef(
  ({
    coreSettingsChanged,
    correlationSettingsChanged,
    pathfinderSettingsChanged,
    deregulatedGenesSettingsChanged,
    genesignatureSettingsChanged,
    coreSettings,
    correlationSettings,
    pathfinderSettings,
    deregulatedGenesSettings,
    genesignatureSettings,
    sessionId,
    drResultDatasets,
    removeUserDataset,
    addDrResultDataset,
    fetchDatasetsFromBackend,
    wholeGenomeOnly = false,
  }, ref) => {
    const location = useLocation();
    const isCorrelationModule =
      location.pathname === ROUTES.CORRELATION ||
      location.pathname === ROUTES.CORRELATION_WEBGL ||
      location.pathname === ROUTES.CORRELATION_FAST;
    const isPathFinderModule = location.pathname === ROUTES.PATHFINDER;
    const isDeregulatedModule = location.pathname === ROUTES.DEREGULATED_GENES;
    const isGeneSignatureModule = location.pathname === ROUTES.GENESIGNATURE;
    const isMultiSelectMode = isCorrelationModule || isPathFinderModule || isDeregulatedModule || isGeneSignatureModule;

    // `meta` is the dataset the selection comes from; its flags travel with the
    // active dataset so other code never has to guess the dataset kind from its id.
    const updateActivityById = useCallback((id, perturbationCount, geneCount, isMixscape, meta = {}) => {
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
          ...(meta?.name !== undefined ? { name: meta.name } : {}),
          isWholeGenome: meta?.isWholeGenome === true,
          isUserUploaded: meta?.isUserUploaded === true,
          isDrResult: meta?.isDrResult === true,
        },
      });
    }, [coreSettingsChanged]);

    const selectDataset = useCallback((dataset) => {
      if (!dataset) return;
      updateActivityById(
        dataset.id,
        dataset.perturbationCount,
        dataset.geneCount,
        dataset.isMixscape,
        dataset
      );
    }, [updateActivityById]);

    const [datasetList, setDatasetList] = useState([]);
    const [loading, setLoading] = useState(true);
    // Narrow the list by free text and by kind (genome-wide / focused / own uploads)
    const [filterText, setFilterText] = useState("");
    const [filterKind, setFilterKind] = useState("all");

    // Function to handle user dataset deletion
    const handleDeleteUserDataset = useCallback(async (datasetId, event) => {
      if (event) {
        event.stopPropagation();
      }

      if (!window.confirm('Are you sure you want to delete this dataset? This cannot be undone.')) {
        return;
      }

      try {
        await deleteUserDatasetAPI(datasetId, sessionId);

        // Remove from Redux
        removeUserDataset(datasetId);

        // A deleted dataset must not stay selected in any multi-select module
        [
          [correlationSettings, correlationSettingsChanged, CorrelationSettingsTypes.SELECTED_DATASETS],
          [pathfinderSettings, pathfinderSettingsChanged, PathFinderSettingsTypes.SELECTED_DATASETS],
          [deregulatedGenesSettings, deregulatedGenesSettingsChanged, DeregulatedGenesSettingsTypes.SELECTED_DATASETS],
          [genesignatureSettings, genesignatureSettingsChanged, GeneSignatureSettingsTypes.SELECTED_DATASETS],
        ].forEach(([moduleSettings, changeHandler, settingName]) => {
          const selected = moduleSettings?.selectedDatasets || [];
          if (selected.includes(datasetId)) {
            changeHandler({
              settingName,
              newValue: selected.filter((ds) => ds !== datasetId),
            });
          }
        });

        // Remove from local state
        setDatasetList(prevList => prevList.filter(d => d.id !== datasetId));

        // If deleted dataset was selected, switch to first available dataset
        if (coreSettings.cellLine?.id === datasetId) {
          const remainingDatasets = datasetList.filter(d => d.id !== datasetId && !d.isUserUploaded);
          if (remainingDatasets.length > 0) {
            selectDataset(remainingDatasets[0]);
          }
        }
      } catch (error) {
        console.error('Failed to delete dataset:', error);
        toast({
          message: {
            type: "Error",
            icon: true,
            content: "The dataset could not be deleted",
            details: error?.message || "Please try again.",
          },
        });
      }
    }, [
      sessionId,
      removeUserDataset,
      coreSettings.cellLine?.id,
      datasetList,
      selectDataset,
      correlationSettings?.selectedDatasets,
      pathfinderSettings?.selectedDatasets,
      deregulatedGenesSettings?.selectedDatasets,
      genesignatureSettings?.selectedDatasets,
      correlationSettingsChanged,
      pathfinderSettingsChanged,
      deregulatedGenesSettingsChanged,
      genesignatureSettingsChanged,
    ]);

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
      } else if (isGeneSignatureModule) {
        current = genesignatureSettings?.selectedDatasets || [];
        settingName = GeneSignatureSettingsTypes.SELECTED_DATASETS;
        changeHandler = genesignatureSettingsChanged;
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
    }, [
      isMultiSelectMode,
      isCorrelationModule,
      isPathFinderModule,
      isDeregulatedModule,
      isGeneSignatureModule,
      correlationSettings?.selectedDatasets,
      pathfinderSettings?.selectedDatasets,
      deregulatedGenesSettings?.selectedDatasets,
      genesignatureSettings?.selectedDatasets,
      correlationSettingsChanged,
      pathfinderSettingsChanged,
      deregulatedGenesSettingsChanged,
      genesignatureSettingsChanged,
    ]);

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
              dataset.isMixscape,
              dataset
            ),
        // active property is no longer used for state updates, handled in render
      };
    }, [updateActivityById, isMultiSelectMode]);

    // Load datasets from backend
    // The dataset list lives in Redux (loaded once at application start and
    // refreshed after uploads); it is not fetched again on every page change.
    const reduxDatasets = coreSettings?.datasetList;
    const datasetsLoading = coreSettings?.datasetsLoading === true;
    const datasetRetryRef = useRef(false);

    // Retry once if the initial load left Redux without datasets (e.g. the
    // backend was unreachable when the application started).
    useEffect(() => {
      if (
        sessionId &&
        !datasetsLoading &&
        (!reduxDatasets || reduxDatasets.length === 0) &&
        !datasetRetryRef.current
      ) {
        datasetRetryRef.current = true;
        fetchDatasetsFromBackend(sessionId);
      }
    }, [sessionId, datasetsLoading, reduxDatasets, fetchDatasetsFromBackend]);

    useEffect(() => {
      const transformedDatasets = (reduxDatasets || [])
        .filter((dataset) => dataset.isDrResult !== true)
        .map(transformDataset);

      // For multi-select modules, we don't auto-select datasets - user must select manually

      // Filter for whole genome datasets if wholeGenomeOnly is true (for non-correlation modules)
      if (wholeGenomeOnly && !isCorrelationModule) {
        const filteredDatasets = transformedDatasets.filter(dataset => dataset.isWholeGenome === true);
        const hasActiveDataset = filteredDatasets.some(dataset => dataset.id === coreSettings.cellLine?.id);
        if (!hasActiveDataset && filteredDatasets.length > 0) {
          // The active dataset is not offered on this page (it is not a whole
          // genome dataset): switch to the first one that is, so requests never
          // run on a dataset the list does not show.
          selectDataset(filteredDatasets[0]);
        }
        setDatasetList(filteredDatasets);
      } else {
        setDatasetList(transformedDatasets);
      }
      setLoading(datasetsLoading && transformedDatasets.length === 0);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [reduxDatasets, datasetsLoading, wholeGenomeOnly, transformDataset, isCorrelationModule]);

    useImperativeHandle(ref, () => ({
      // Adds a dimensionality-reduction result as a dataset (DR chaining). The
      // result is kept in Redux and flagged with `isDrResult`, so it survives
      // dataset reloads and is never confused with backend datasets.
      saveDataset: (newID, name, parentID, dataShape, dataType) => {
        const shape = String(dataShape || "").trim().split(/\s+/);
        const toCount = (value) => {
          const parsed = Number(value);
          return Number.isFinite(parsed) && value !== undefined && value !== "" ? parsed : value;
        };
        const parent = [...datasetList, ...(drResultDatasets || [])].find(
          (item) => item.id === parentID
        );
        const newItem = {
          id: newID,
          name: name,
          parent: parentID,
          resultShape: dataShape,
          perturbationCount: toCount(shape[0]),
          geneCount: toCount(shape[1]),
          isMixscape: parent?.isMixscape === true,
          dataType: dataType,
          isDrResult: true,
        };
        addDrResultDataset(newItem);
        selectDataset(newItem);
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
        else if (isGeneSignatureModule) selectedDatasets = genesignatureSettings?.selectedDatasets || [];

        if (selectedDatasets.length > 0) {
          const firstSelectedId = selectedDatasets[0];
          updateGeneLists(firstSelectedId);
          
          // Also update core settings cellLine to the first selected dataset for compatibility
          const firstDataset = datasetList.find(d => d.id === firstSelectedId);
          if (firstDataset && coreSettings.cellLine?.id !== firstSelectedId) {
            selectDataset(firstDataset);
          }
        }
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
      coreSettings.cellLine.id,
      isMultiSelectMode,
      isCorrelationModule,
      isPathFinderModule,
      isDeregulatedModule,
      isGeneSignatureModule,
      correlationSettings?.selectedDatasets?.[0],
      pathfinderSettings?.selectedDatasets?.[0],
      deregulatedGenesSettings?.selectedDatasets?.[0],
      genesignatureSettings?.selectedDatasets?.[0],
    ]);

    // Sync active/checked state when settings change
    useEffect(() => {
      if (isMultiSelectMode) {
        let selectedDatasets = [];
        if (isCorrelationModule) selectedDatasets = correlationSettings?.selectedDatasets || [];
        else if (isPathFinderModule) selectedDatasets = pathfinderSettings?.selectedDatasets || [];
        else if (isDeregulatedModule) selectedDatasets = deregulatedGenesSettings?.selectedDatasets || [];
        else if (isGeneSignatureModule) selectedDatasets = genesignatureSettings?.selectedDatasets || [];

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
    }, [
      coreSettings.cellLine?.id,
      isMultiSelectMode,
      isCorrelationModule,
      isPathFinderModule,
      isDeregulatedModule,
      isGeneSignatureModule,
      correlationSettings?.selectedDatasets,
      pathfinderSettings?.selectedDatasets,
      deregulatedGenesSettings?.selectedDatasets,
      genesignatureSettings?.selectedDatasets,
    ]);

    useEffect(() => {
      // A dimensionality-reduction result can only be analysed on the DR page.
      // (User-uploaded datasets are regular datasets and stay selected.)
      if (location.pathname !== ROUTES.DR && coreSettings.cellLine?.isDrResult === true) {
        const fallback =
          datasetList.find((d) => d.id === "K562gwps") ||
          datasetList.find((d) => d.isDrResult !== true && d.isUserUploaded !== true);
        if (fallback) {
          selectDataset(fallback);
        } else {
          updateActivityById("K562gwps", 11258, 8248, false, {
            name: "K562 Whole Genome",
            isWholeGenome: true,
          });
        }
      }
    }, [location.pathname]);

    // DR results (kept in Redux) are offered on the DR page only
    const drResultItems = useMemo(
      () => (drResultDatasets || []).map(transformDataset),
      [drResultDatasets, transformDataset]
    );

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

    // The dataset list could not be loaded: say so and offer a retry instead
    // of showing an empty list that looks like "no datasets exist".
    if (coreSettings?.datasetsError && datasetList.length === 0) {
      return (
        <div
          role="alert"
          style={{
            border: "1px solid #f0b4b4",
            borderRadius: "8px",
            background: "#fff5f5",
            padding: "16px",
            textAlign: "center",
            fontSize: "13px",
            color: "#7a1f1f",
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: "6px" }}>
            The dataset list could not be loaded
          </div>
          <div style={{ marginBottom: "12px", color: "#555" }}>
            The server did not answer. Check your connection and try again.
          </div>
          <button
            type="button"
            onClick={() => fetchDatasetsFromBackend(sessionId)}
            style={{
              padding: "6px 16px",
              border: "1px solid #1976d2",
              borderRadius: "4px",
              background: "#1976d2",
              color: "#fff",
              cursor: "pointer",
              fontSize: "13px",
            }}
          >
            Retry
          </button>
        </div>
      );
    }

    // Filter datasets based on route
    // DR results are flagged explicitly; user-uploaded datasets are regular datasets
    const allBackendDatasets = datasetList.filter((x) => x.isDrResult !== true);
    const backendDatasets = allBackendDatasets.filter((x) =>
      datasetMatches(x, { text: filterText, kind: filterKind })
    );
    const hasOwnUploads = allBackendDatasets.some((x) => x.isUserUploaded === true);

    const filterBar = (
      <div style={{ marginBottom: "6px" }} data-tour="datasets">
        <input
          type="search"
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          placeholder="Filter datasets (name, cell line, CRISPRi...)"
          aria-label="Filter datasets"
          style={{
            width: "100%",
            boxSizing: "border-box",
            height: "26px",
            padding: "0 8px",
            border: "1px solid #c4c9d0",
            borderRadius: "4px",
            fontSize: "12px",
          }}
        />
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "4px", marginTop: "4px" }}>
          {DATASET_KINDS.filter((kind) => kind.id !== "mine" || hasOwnUploads).map((kind) => (
            <button
              key={kind.id}
              type="button"
              aria-pressed={filterKind === kind.id}
              onClick={() => setFilterKind(kind.id)}
              style={{
                padding: "1px 8px",
                border: "1px solid " + (filterKind === kind.id ? "#a63648" : "#c4c9d0"),
                borderRadius: "999px",
                background: filterKind === kind.id ? "#a63648" : "#fff",
                color: filterKind === kind.id ? "#fff" : "#333",
                fontSize: "11px",
                cursor: "pointer",
              }}
            >
              {kind.label}
            </button>
          ))}
          <Link
            to={ROUTES.DATASETS}
            style={{ marginLeft: "auto", fontSize: "11px", color: "#1565c0" }}
            title="Descriptions, sizes, citations and licences of all datasets"
          >
            About the datasets
          </Link>
        </div>
      </div>
    );
    const filteredDatasets = location.pathname !== ROUTES.DR
      ? backendDatasets
      : [...backendDatasets, ...drResultItems];

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
      } else if (isGeneSignatureModule) {
        selectedCount = genesignatureSettings?.selectedDatasets?.length || 0;
        changeHandler = genesignatureSettingsChanged;
      }
      
      return (
        <>
          {filterBar}
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
                No datasets match.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                {filteredDatasets.map((dataset) => {
                  let isSelected = false;
                  if (isCorrelationModule) isSelected = correlationSettings?.selectedDatasets?.includes(dataset.id);
                  else if (isPathFinderModule) isSelected = pathfinderSettings?.selectedDatasets?.includes(dataset.id);
                  else if (isDeregulatedModule) isSelected = deregulatedGenesSettings?.selectedDatasets?.includes(dataset.id);
                  else if (isGeneSignatureModule) isSelected = genesignatureSettings?.selectedDatasets?.includes(dataset.id);
                  
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
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}>
                        {dataset.name}
                        {dataset.isUserUploaded && (
                          <FaUser
                            style={{
                              color: "#1976d2",
                              fontSize: "10px",
                              flexShrink: 0,
                            }}
                            title="User uploaded dataset"
                          />
                        )}
                      </Text>
                      {dataset.isUserUploaded && (
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleDeleteUserDataset(dataset.id, e);
                          }}
                          style={{
                            background: "transparent",
                            border: "none",
                            cursor: "pointer",
                            padding: "4px",
                            display: "flex",
                            alignItems: "center",
                            color: "#d32f2f",
                            opacity: 0.7,
                            transition: "opacity 0.2s",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.opacity = "1";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.opacity = "0.7";
                          }}
                          title="Delete dataset"
                        >
                          <FaTrash style={{ fontSize: "12px" }} />
                        </button>
                      )}
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
        {filterBar}
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
              No datasets match.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
              {treeRoots.map(root => (
                <DatasetTreeItem
                  key={root.id}
                  item={root}
                  activeId={coreSettings.cellLine?.id}
                  onDeleteDataset={handleDeleteUserDataset}
                />
              ))}
            </div>
          )}
        </div>

        {/* For DR module, show chaining hint when DR results are available */}
        {location.pathname === ROUTES.DR && filteredDatasets.some(d => d.isDrResult === true) && (
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
  genesignatureSettings: settings?.genesignature ?? {},
  sessionId: settings?.core?.sessionId,
  drResultDatasets: settings?.core?.drResultDatasets,
});

const mapDispatchToProps = { 
  coreSettingsChanged,
  correlationSettingsChanged,
  pathfinderSettingsChanged,
  deregulatedGenesSettingsChanged,
  genesignatureSettingsChanged,
  removeUserDataset,
  addDrResultDataset,
  fetchDatasetsFromBackend,
};

const MainContainer = connect(mapStateToProps, mapDispatchToProps, null, {
  forwardRef: true,
})(DatasetSelector);

export { MainContainer as DatasetSelector };
