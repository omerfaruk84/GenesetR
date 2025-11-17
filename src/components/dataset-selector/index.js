import { Tree } from "@oliasoft-open-source/react-ui-library";
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
import { CoreSettingsTypes } from "../side-bar/settings/enums";
import styles from "./AccordionMenu.scss";
import { ROUTES } from "../../common/routes";
import { useLocation } from "react-router-dom";
import { updateGeneLists, fetchDatasets } from "../../store/api";

const DatasetSelector = forwardRef(
  ({ coreSettingsChanged, coreSettings, wholeGenomeOnly = false }, ref, onlyMain) => {
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

    // Function to transform backend dataset to frontend format
    const transformDataset = useCallback((dataset) => ({
      ...dataset,
      onClick: () => updateActivityById(
        dataset.id, 
        dataset.perturbationCount, 
        dataset.geneCount, 
        dataset.isMixscape
      ),
      active: dataset.active || false
    }), [updateActivityById]);

    // Load datasets from backend
    useEffect(() => {
      const loadDatasets = async () => {
        try {
          setLoading(true);
          const datasets = await fetchDatasets();
          const transformedDatasets = datasets.map(transformDataset);
      
      // Filter for whole genome datasets if wholeGenomeOnly is true
      if (wholeGenomeOnly) {
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
    }, [wholeGenomeOnly, transformDataset]);

    const location = useLocation();  
  

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
      updateGeneLists(coreSettings.cellLine.id);
    }, [coreSettings.cellLine.id]);

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

    return (
      <>
        <div
          className={styles._itemHeader_1fhdv_401}
          style={{ border: "1px solid black", height: "250px", overflow: "auto", scrollbarWidth: "thin" }}
        >
          <Tree
            list={{
              items:
                location.pathname !== ROUTES.DR
                  ? datasetList.filter((x) => x.id.length < 17)
                  : datasetList,
              name: "Dataset Selection",
            }}
          />
        </div>
      </>
    );
  }
);

const mapStateToProps = ({ settings }) => ({
  coreSettings: settings?.core ?? {},
});

const mapDispatchToProps = { coreSettingsChanged };

const MainContainer = connect(mapStateToProps, mapDispatchToProps, null, {
  forwardRef: true,
})(DatasetSelector);

export { MainContainer as DatasetSelector };
