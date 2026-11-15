import { Select, toast } from "@oliasoft-open-source/react-ui-library";
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
import styles from "./dataset-selector.module.scss";
import { Link } from "react-router-dom";
import { DATASET_KINDS, datasetMatches } from "../../utils/datasetFilters";
import { ROUTES } from "../../common/routes";
import { useLocation } from "react-router-dom";
import { updateGeneLists, deleteUserDataset as deleteUserDatasetAPI } from "../../store/api";
import { datasetKindMeta, firstGeneticDataset, isDrugChildTable, isDrugDataset } from "../../utils/perturbationKind";

const cx = (...names) => names.filter(Boolean).join(" ");

// A dataset with more child tables than this starts collapsed (the drug
// collection has one table per cell line); DR results stay expanded.
const COLLAPSE_CHILDREN_ABOVE = 6;

const hasDescendant = (item, id) =>
  (item.children || []).some((child) => child.id === id || hasDescendant(child, id));

const DatasetTreeItem = ({ item, level = 0, activeId, onDeleteDataset, expandAll = false }) => {
  const isActive = item.id === activeId;
  const hasChildren = item.children && item.children.length > 0;
  // Large groups start closed unless a filter is typed or the active dataset is inside
  const holdsActive = hasChildren && hasDescendant(item, activeId);
  const [isExpanded, setIsExpanded] = useState(
    () => expandAll || !hasChildren || item.children.length <= COLLAPSE_CHILDREN_ABOVE || holdsActive
  );
  // A table selected from elsewhere (a link, a new DR result) must be visible
  useEffect(() => {
    if (holdsActive) setIsExpanded(true);
  }, [holdsActive]);

  return (
    <div className={level > 0 ? styles.treeNodeNested : styles.treeNode}>
      <div className={cx(styles.treeLine, level > 0 && styles.treeLineNested)}>
        {hasChildren ? (
          <span
            className={styles.treeToggle}
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
          >
            {isExpanded ? "\u25BC" : "\u25B6"}
          </span>
        ) : (
          <span className={styles.treeSpacer}></span>
        )}

        <div onClick={item.onClick} className={cx(styles.row, isActive && styles.rowActive)}>
          <span className={styles.rowName}>
            {item.name} {item.isDrResult === true ? "(DR Result)" : ""}
            {hasChildren && !isExpanded && (
              <span className={styles.rowExtra}>+{item.children.length} tables</span>
            )}
            {item.isUserUploaded && (
              <FaUser className={styles.userIcon} title="User uploaded dataset" />
            )}
          </span>
        </div>

        {item.isUserUploaded && onDeleteDataset && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDeleteDataset(item.id, e);
            }}
            className={styles.deleteButton}
            title="Delete dataset"
          >
            <FaTrash />
          </button>
        )}
      </div>

      {hasChildren && isExpanded && (
        <div className={styles.treeChildren}>
          {item.children.map(child => (
            <DatasetTreeItem
              key={child.id}
              item={child}
              level={level + 1}
              activeId={activeId}
              onDeleteDataset={onDeleteDataset}
              expandAll={expandAll}
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
    geneticOnly = false,
  }, ref) => {
    const location = useLocation();
    const isCorrelationModule =
      location.pathname === ROUTES.CORRELATION;
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
          // genetic or chemical, and what the drug table holds
          ...datasetKindMeta(meta),
          ...(meta?.labelsFrom ? { labelsFrom: meta.labelsFrom } : {}),
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
    // Shown when the page switched away from a drug dataset it cannot analyse
    const [switchNote, setSwitchNote] = useState("");
    // Drug collections whose dose and cell-line tables are listed (checkbox list)
    const [openGroups, setOpenGroups] = useState(() => new Set());

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
          const next = firstGeneticDataset(remainingDatasets) || remainingDatasets[0];
          if (next) {
            selectDataset(next);
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

      // Filter for whole genome datasets if wholeGenomeOnly is true (for non-correlation modules).
      // Drug datasets measure the whole transcriptome and stay, unless the
      // module only makes sense for gene perturbations (geneticOnly).
      const restrictToGenome = wholeGenomeOnly && !isCorrelationModule;
      if (restrictToGenome || geneticOnly) {
        const filteredDatasets = transformedDatasets.filter(
          (dataset) =>
            (!restrictToGenome || dataset.isWholeGenome === true || isDrugDataset(dataset)) &&
            (!geneticOnly || !isDrugDataset(dataset))
        );
        const active = coreSettings.cellLine;
        const hasActiveDataset = filteredDatasets.some(dataset => dataset.id === active?.id);
        if (!hasActiveDataset && filteredDatasets.length > 0) {
          // The active dataset is not offered on this page (it is not a whole
          // genome dataset, or it is a drug dataset): switch to the first one
          // that is, so requests never run on a dataset the list does not show.
          const fallback = firstGeneticDataset(filteredDatasets) || filteredDatasets[0];
          selectDataset(fallback);
          if (geneticOnly && isDrugDataset(active)) {
            setSwitchNote(
              `This module needs gene perturbations, so the dataset was switched from ${active.name || active.id} (drug treatments) to ${fallback.name || fallback.id}.`
            );
          }
        }
        if (geneticOnly && isPathFinderModule) {
          // A ticked drug dataset must not stay selected behind the list
          const ticked = pathfinderSettings?.selectedDatasets || [];
          const drugIds = new Set(transformedDatasets.filter(isDrugDataset).map((dataset) => dataset.id));
          if (ticked.some((id) => drugIds.has(id))) {
            pathfinderSettingsChanged({
              settingName: PathFinderSettingsTypes.SELECTED_DATASETS,
              newValue: ticked.filter((id) => !drugIds.has(id)),
            });
            setSwitchNote("This module needs gene perturbations, so the drug datasets were removed from the selection.");
          }
        }
        setDatasetList(filteredDatasets);
      } else {
        setDatasetList(transformedDatasets);
      }
      setLoading(datasetsLoading && transformedDatasets.length === 0);
      // eslint-disable-next-line react-hooks/exhaustive-deps
      // The selected dataset is a dependency too: a dataset that arrives later
      // (from the address, "Send to", a permalink) is checked like any other.
    }, [reduxDatasets, datasetsLoading, wholeGenomeOnly, geneticOnly, transformDataset, isCorrelationModule, coreSettings.cellLine?.id]);

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
          // A result of a drug dataset still holds drugs (labels, wording, links)
          ...(isDrugDataset(parent)
            ? {
                perturbationKind: parent.perturbationKind,
                collection: parent.collection,
                drugTable: parent.drugTable,
                doses: parent.doses,
                labelsFrom: parent.labelsFrom || parent.id,
              }
            : {}),
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
          firstGeneticDataset(datasetList) ||
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
        <div className={styles.box}>
          <div className={styles.status}>Loading datasets...</div>
        </div>
      );
    }

    // The dataset list could not be loaded: say so and offer a retry instead
    // of showing an empty list that looks like "no datasets exist".
    if (coreSettings?.datasetsError && datasetList.length === 0) {
      return (
        <div role="alert" className={styles.error}>
          <div className={styles.errorTitle}>The dataset list could not be loaded</div>
          <div className={styles.errorText}>
            The server did not answer. Check your connection and try again.
          </div>
          <button type="button" className={styles.retry} onClick={() => fetchDatasetsFromBackend(sessionId)}>
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
    const hasDrugDatasets = allBackendDatasets.some(isDrugDataset);
    const isFiltering = filterText.trim().length > 0;

    const filterBar = (
      <div className={styles.filterBar} data-tour="datasets">
        <input
          type="search"
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          placeholder="Filter datasets (name, cell line, organ, CRISPRi...)"
          aria-label="Filter datasets"
          className={styles.filterInput}
        />
        <div className={styles.kinds}>
          {DATASET_KINDS.filter(
            (kind) =>
              (kind.id !== "mine" || hasOwnUploads) &&
              ((kind.id !== "genetic" && kind.id !== "chemical") || hasDrugDatasets)
          ).map((kind) => (
            <button
              key={kind.id}
              type="button"
              aria-pressed={filterKind === kind.id}
              onClick={() => setFilterKind(kind.id)}
              className={cx(styles.kind, filterKind === kind.id && styles.kindActive)}
            >
              {kind.label}
            </button>
          ))}
          <Link
            to={ROUTES.DATASETS}
            className={styles.aboutLink}
            title="Descriptions, sizes, citations and licences of all datasets"
          >
            About the datasets
          </Link>
        </div>
        {switchNote && (
          <div role="status" className={cx(styles.note, styles.noteWarning)}>
            {switchNote}
          </div>
        )}
      </div>
    );
    const filteredDatasets = location.pathname !== ROUTES.DR
      ? backendDatasets
      : [...backendDatasets, ...drResultItems];

    // Main table of a drug collection -> number of its child tables in the list
    const groupParents = new Map();
    const listedIds = new Set(filteredDatasets.map((d) => d.id));
    filteredDatasets.forEach((d) => {
      if (isDrugChildTable(d) && listedIds.has(d.parent)) {
        groupParents.set(d.parent, (groupParents.get(d.parent) || 0) + 1);
      }
    });

    // For multi-select modules with checkboxes, render custom checkbox list
    if (isMultiSelectMode) {
      let selectedCount = 0;
      if (isCorrelationModule) {
        selectedCount = correlationSettings?.selectedDatasets?.length || 0;
      } else if (isPathFinderModule) {
        selectedCount = pathfinderSettings?.selectedDatasets?.length || 0;
      } else if (isDeregulatedModule) {
        selectedCount = deregulatedGenesSettings?.selectedDatasets?.length || 0;
      } else if (isGeneSignatureModule) {
        selectedCount = genesignatureSettings?.selectedDatasets?.length || 0;
      }

      return (
        <>
          {filterBar}
          <div className={styles.box}>
            <div className={styles.boxHeader}>
              <span>
                Dataset Selection
                {selectedCount > 0 && (
                  <span className={styles.boxCount}>({selectedCount} selected)</span>
                )}
              </span>
            </div>
            {filteredDatasets.length === 0 ? (
              <div className={styles.status}>No datasets match.</div>
            ) : (
              <div className={styles.list}>
                {filteredDatasets.map((dataset) => {
                  let isSelected = false;
                  if (isCorrelationModule) isSelected = correlationSettings?.selectedDatasets?.includes(dataset.id);
                  else if (isPathFinderModule) isSelected = pathfinderSettings?.selectedDatasets?.includes(dataset.id);
                  else if (isDeregulatedModule) isSelected = deregulatedGenesSettings?.selectedDatasets?.includes(dataset.id);
                  else if (isGeneSignatureModule) isSelected = genesignatureSettings?.selectedDatasets?.includes(dataset.id);

                  // The dose and cell-line tables of a drug collection are
                  // listed under its main table, closed until asked for (a
                  // filter text or a ticked table shows them anyway).
                  const isChild = isDrugChildTable(dataset) && groupParents.has(dataset.parent);
                  if (isChild && !isSelected && !isFiltering && !openGroups.has(dataset.parent)) return null;
                  const childCount = groupParents.get(dataset.id) || 0;
                  const groupOpen = openGroups.has(dataset.id);

                  return (
                    <React.Fragment key={dataset.id}>
                    <label
                      className={cx(styles.row, isSelected && styles.rowActive, isChild && styles.rowChild)}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          handleCheckboxChange(dataset.id, e.target.checked);
                        }}
                        className={styles.checkbox}
                      />
                      <span className={styles.rowName}>
                        {dataset.name}
                        {dataset.isUserUploaded && (
                          <FaUser className={styles.userIcon} title="User uploaded dataset" />
                        )}
                      </span>
                      {dataset.isUserUploaded && (
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleDeleteUserDataset(dataset.id, e);
                          }}
                          className={styles.deleteButton}
                          title="Delete dataset"
                        >
                          <FaTrash />
                        </button>
                      )}
                    </label>
                    {childCount > 0 && !isFiltering && (
                      <button
                        type="button"
                        aria-expanded={groupOpen}
                        onClick={() =>
                          setOpenGroups((previous) => {
                            const next = new Set(previous);
                            if (next.has(dataset.id)) next.delete(dataset.id);
                            else next.add(dataset.id);
                            return next;
                          })
                        }
                        className={styles.groupToggle}
                      >
                        {groupOpen ? "Hide" : "Show"} {childCount} dose and cell-line tables
                      </button>
                    )}
                    </React.Fragment>
                  );
                })}
                {selectedCount === 0 && (
                  <div className={cx(styles.note, styles.noteWarning)}>
                    No datasets selected. Select at least one dataset to calculate.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Selected count */}
          {selectedCount > 0 && (
            <div className={styles.summary}>
              <span className={styles.count}>{selectedCount}</span>
              {selectedCount === 1 ? "dataset selected" : "datasets selected"}
            </div>
          )}

          {/* Combine Method setting - shown when multiple datasets are selected */}
          {isCorrelationModule && selectedCount > 1 && (
            <div className={styles.option}>
              <div className={styles.optionTitle}>Combine Method for Multiple Datasets</div>
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
              <div className={styles.optionHelp}>
                Method to combine correlation scores across multiple datasets. <strong>'Average'</strong> calculates the mean correlation value across all selected datasets, providing a balanced representation. <strong>'Max'</strong> selects the correlation value with the maximum absolute magnitude, emphasizing the strongest relationship found in any dataset. Use Average for more conservative, consensus-based results, or Max to highlight the strongest correlations.
              </div>
            </div>
          )}

          {/* Combination Strategy setting for PathFinder - shown when multiple datasets are selected */}
          {isPathFinderModule && selectedCount > 1 && (
            <div className={styles.option}>
              <div className={styles.optionTitle}>Combination Strategy for Multiple Datasets</div>
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
              <div className={styles.optionHelp}>
                Strategy to combine network edges and nodes across multiple datasets. <strong>'Strict Intersection (AND)'</strong> keeps only edges and nodes that appear in ALL selected datasets, providing high-confidence results with reduced false positives but potentially fewer findings. <strong>'Union (OR)'</strong> includes edges and nodes found in ANY selected dataset, providing more comprehensive networks but may include dataset-specific artifacts. Use Intersection for conservative, highly reliable networks, or Union for exploratory analysis with broader coverage.
              </div>
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
        <div className={styles.box}>
          <div className={styles.boxHeader}>
            <span>Dataset Selection</span>
            <span
              className={styles.helpDot}
              title="Select a dataset to analyze. Expand a dataset to see its tables (doses and cell lines of a drug collection) or previous DR results for chaining (e.g. run UMAP on PCA result)."
            >
              ?
            </span>
          </div>
          {filteredDatasets.length === 0 ? (
            <div className={styles.status}>No datasets match.</div>
          ) : (
            <div className={styles.list}>
              {treeRoots.map(root => (
                <DatasetTreeItem
                  key={isFiltering ? `${root.id}:filtered` : root.id}
                  item={root}
                  activeId={coreSettings.cellLine?.id}
                  onDeleteDataset={handleDeleteUserDataset}
                  expandAll={isFiltering}
                />
              ))}
            </div>
          )}
        </div>

        {/* For DR module, show chaining hint when DR results are available */}
        {location.pathname === ROUTES.DR && filteredDatasets.some(d => d.isDrResult === true) && (
          <div className={styles.note}>
            <strong>DR Chaining:</strong> Select a previous DR result (child node) above to run another DR method on it.
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
