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
import { updateGeneLists } from "../../store/api";

const DatasetSelector = forwardRef(
  ({ coreSettingsChanged, coreSettings }, ref, onlyMain) => {
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

    const [datasetList, setDatasetList] = useState(() => [
      {
        droppable: true,
        id: "K562gwps",
        name: "K562 Whole Genome",
        onClick: () => updateActivityById("K562gwps", 11258, 8248, false),
        parent: 0,
        active: true,
        resultShape: "11258 8248",
        perturbationCount: 11258,
        geneCount: 8248,
        isMixscape: false
      },
      {
        droppable: true,
        id: "K562essential",
        name: "K562 Essential",
        onClick: () => updateActivityById("K562essential", 2285, 8563, false),
        parent: 0,
        active: false,
        resultShape: "2285 8563",
        perturbationCount: 2285,
        geneCount: 8563,
        isMixscape: false
      },
      {
        droppable: true,
        id: "SC00003",
        name: "K562 Essential-mixscape",       
        onClick: () => updateActivityById("SC00003", 3300, 8425, true),
        parent: 0,
        active: false,
        resultShape: "3300 8425",
        perturbationCount: 3300,
        geneCount: 8425,
        isMixscape: true
      },
      {
        droppable: true,
        id: "RPE1essential",
        name: "RPE1 Essential",
        onClick: () => updateActivityById("RPE1essential", 2679, 8749, false),
        parent: 0,
        active: false,
        resultShape: "2679 8749",
        perturbationCount: 2679,
        geneCount: 8749,
        isMixscape: false
      },
      {
        droppable: true,
        id: "SC00004",
        name: "RPE1 Essential-mixscape",
        onClick: () => updateActivityById("SC00004", 3939, 8688, true),
        parent: 0,
        active: false,
        resultShape: "3939 8688",
        perturbationCount: 3939,
        geneCount: 8688,
        isMixscape: true
      },
      {
        droppable: true,
        id: "SC00065",
        name: "HepG2 Essential",
        onClick: () => updateActivityById("SC00065", 3667, 9503, true),
        parent: 0,
        active: false,
        resultShape: "3667 9503",  //Cols vs Rows Perturbations vs Genes Need to fix
        perturbationCount: 3667,
        geneCount: 9503,
        isMixscape: true
      },
       {
        droppable: true,
        id: "SC00066",
        name: "Jurkat Essential",
        onClick: () => updateActivityById("SC00066", 1514, 8811, true),
        parent: 0,
        active: false,
        resultShape: "1514 8811",  //Cols vs Rows Perturbations vs Genes
        perturbationCount: 1514,
        geneCount: 8811,
        isMixscape: true
      }, 
      /*
      {
        droppable: true,
        id: "TFAtlas",
        name: "Transcription Factor Atlas",
        onClick: () => updateActivityById("TFAtlas", 3367, 19603, false),
        parent: 0,
        active: false,
        resultShape: "3367 19603",
        perturbationCount: 3367,
        geneCount: 19603,
        isMixscape: false
      }, */
       {
        droppable: true, //Crispra
        id: "SC00048",
        name: "Transcription Factor Atlas - MixScape",
        onClick: () => updateActivityById("SC00048", 142, 11796, true),
        parent: 0,
        active: false,
        resultShape: "142 11796",  //Cols vs Rows Perturbations vs Genes
        perturbationCount: 142,
        geneCount: 11796,
        isMixscape: true
      },
      {
        droppable: true, //Crispra
        id: "SC00047",
        name: "Transcription Factor Atlas - ShareSeq",
        onClick: () => updateActivityById("SC00047", 185, 12221, true),
        parent: 0,
        active: false,
        resultShape: "185 12221",  //Cols vs Rows Perturbations vs Genes
        perturbationCount: 185,
        geneCount: 12221,
        isMixscape: true
      },           
      {
        droppable: true,
        id: "SC00001",
        name: "THP1 - regulators of immune check points",
        onClick: () => updateActivityById("SC00001", 36, 9873, true),
        parent: 0,
        active: false,
        resultShape: "36 9873",  //Cols vs Rows Perturbations vs Genes
        perturbationCount: 36,
        geneCount: 9873,
        isMixscape: true
      }, 
      {
        droppable: true,
        id: "SC00015",
        name: "Calu-3 SARS-CoV-2 host factors",
        onClick: () => updateActivityById("SC00015", 175, 11486, true),
        parent: 0,
        active: false,
        resultShape: "175 11486",  //Cols vs Rows Perturbations vs Genes
        perturbationCount: 175,
        geneCount: 11486,
        isMixscape: true
      }      ,   
      {
        droppable: true,
        id: "SC00039",
        name: "THP1 - immune response to LPS CRISPRi",
        onClick: () => updateActivityById("SC00039", 623, 11690, true),
        parent: 0,
        active: false,
        resultShape: "623 11690",  //Cols vs Rows Perturbations vs Genes
        perturbationCount: 623,
        geneCount: 11690,
        isMixscape: true
      },  
      {
        droppable: true,
        id: "SC00038",
        name: "THP1 - immune response to LPS CRISPR-KO",
        onClick: () => updateActivityById("SC00038", 634, 10930, true),
        parent: 0,
        active: false,
        resultShape: "634 10930",  //Cols vs Rows Perturbations vs Genes
        perturbationCount: 634,
        geneCount: 10930,
        isMixscape: true
      },      
      {
        droppable: true, //Crispra
        id: "SC00016",
        name: "iPSC induced neurons-CRISPRa",
        onClick: () => updateActivityById("SC00016", 100, 10634, true),
        parent: 0,
        active: false,
        resultShape: "100 10634",  //Cols vs Rows Perturbations vs Genes
        perturbationCount: 100,
        geneCount: 10634,
        isMixscape: true
      },   
      {
        droppable: true, //Crispra
        id: "sc00017",
        name: "iPSC induced neurons-CRISPRi",
        onClick: () => updateActivityById("sc00017", 186, 11401, true),
        parent: 0,
        active: false,
        resultShape: "186 11401",  //Cols vs Rows Perturbations vs Genes
        perturbationCount: 186,
        geneCount: 11401,
        isMixscape: true
      },          
         
      {
        droppable: true, 
        id: "SC00037",
        name: "HEK293-idCas9",
        onClick: () => updateActivityById("SC00037", 237, 9410, true),
        parent: 0,
        active: false,
        resultShape: "237 9410",  //Cols vs Rows Perturbations vs Genes
        perturbationCount: 237,
        geneCount: 9410,
        isMixscape: true
      },     
      {
        droppable: true, 
        id: "SC00063",
        name: "Jurkat - TCR signaling",
        onClick: () => updateActivityById("SC00063", 32, 9949, true),
        parent: 0,
        active: false,
        resultShape: "32 9949",  //Cols vs Rows Perturbations vs Genes
        perturbationCount: 32,
        geneCount: 9949,
        isMixscape: true
      },         
      
    ]);

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
              perturbationCount: itemx?.resultShape.split(" ")[0],
              geneCount:  itemx?.resultShape.split(" ")[1],
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
              )(itemx.id),
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
            )(newID),
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

    return (
      <>
        <div
          className={styles._itemHeader_1fhdv_401}
          style={{ border: "1px solid black",height: "250px", overflow: "auto", scrollbarWidth: "thin" }}
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
