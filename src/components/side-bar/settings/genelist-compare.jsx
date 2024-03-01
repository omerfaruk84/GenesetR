import React, { useEffect } from "react";
import { connect } from "react-redux";
import { FaTrash } from "react-icons/fa";
import { get, set } from "idb-keyval";

import {
  Field,
  Select,
  Slider,
  InputGroup,
  List,
  toast,
  Modal,
  CheckBox,
  Spacer,
} from "@oliasoft-open-source/react-ui-library";
import { useState } from "react";
import { genelistcompareSettingsChanged } from "../../../store/settings/genelist-compare-settings";
import { GenelistCompareSettingsTypes } from "./enums";
import styles from "./settings.module.scss";
import { Genelist } from "../../genelist";

const GenelistCompareSettings = ({
  genelistcompareSettings,
  genelistcompareSettingsChanged,
}) => {
  const [triggerScroll, setTriggerScroll] = useState(false);
  const onClickItem = (headingKey, itemIndex) => {
    //setTriggerScroll(true);
    const items = [...genelists];
    items.forEach((item, i) => {
      item.active = i === itemIndex;
    });
    setGeneLists(items);
    // will execute after stack is cleared
    //setTimeout(() => setTriggerScroll(false), 0);
  };
  const onAddItem = (headingKey) => {};
  const onDeleteItem = (headingKey, itemIndex, item) => {
    console.log(headingKey, itemIndex, item);
    const items = [...genelists.filter((obj) => obj.name !== item.name)];
    //draft[headingKey].items = items.filter(i => i); //remove empty slots
    setGeneLists(items);
  };

  const [genelists, setGeneLists] = useState(genelistcompareSettings.genelists);

  const [selectedGeneList, setSelectedGeneList] = useState(); //sets the currently selected gene list in the select box

  const arraymove = (arr, from, to) => {
    if ((from && isNaN(from)) || (to && isNaN(to)) || from === to) {
      return arr;
    }
    const copy = [...arr];
    if (typeof to === "number" && typeof from === "number") {
      copy.splice(to, 0, copy.splice(from, 1)[0]);
    }
    return copy;
  };

  const [newListVisible, setNewListVisible] = useState(false);
  const [geneListNames, setGeneListNames] = useState();
  const SetCombinationType = [
    "Intersection",
    "Union",
    "Composite",
    "Distinct Intersection",
  ];
  useEffect(() => {
    /*get("geneListNames").then((val) => {
      if (val) setGeneListNames(val);
    });*/
    refreshList();
  }, []);

  console.log("geneListNames", geneListNames);

  // Get all available genelists from the database
  const getAllGenelists = () => {
    return get("geneListNames");
  };

  const onListReorder = (reorderData) => {
    const { to, from } = reorderData;
    setGeneLists(arraymove(genelists, from, to));
  };

  const saveGeneListNames = () => {
    set("geneListNames", geneListNames);
  };

  //Retrieves local genelists from database
  const refreshList = () => {
    return new Promise((resolve, reject) => {
      getAllGenelists()
        .then((genelists) => {
          //console.log("refreshList", genelists);
          if (genelists) {
            setGeneListNames([...genelists]); //converts sets to array
            resolve();
          } else {
            return;
            //reject("No saved genelists were found!");
            //throw new Error("No saved genelists were found!")
          }
        })
        .catch((error) => {
          console.log(error);
          toast({
            message: {
              type: "Error",
              icon: true,
              heading: "Genelist Retrival",
              content: "Failed to get genelists." + error,
            },
            autoClose: 2000,
          });
          reject(error);
        });
    });
  };

  useEffect(() => {
    genelistcompareSettingsChanged({
      settingName: GenelistCompareSettingsTypes.GENELISTS,
      newValue: genelists,
    });
  }, [genelists]);

  const addtolist = (genelist) => {
    if (genelist && genelists?.length < 10) {
      // Check if a genelist with the same name already exists
      const exists = genelists.some((list) => list.name === genelist.name);
      if (exists) {
        alert("A genelist with the same name already exists.");
        return false; // Exit the function to prevent adding the duplicate
      }

      // If no duplicate was found, proceed to add the new genelist
      const temp = [...genelists];
      temp.push({
        name: genelist?.name,
        content: genelist.description,
        genes: genelist.genes.split("\n"),
      });
      setGeneLists(temp);
      return true;
    }
  };

  return (
    <>
      <List
        onListReorder={onListReorder}
        expanding
        draggable
        marginBottom={20}
        bordered
        drawer
        list={{
          actions: [
            {
              label: "More",
              subActions: [
                {
                  icon: "times",
                  disabled: genelists.length === 0,
                  label: "Remove All",
                  onClick: function Ba() {},
                },
              ],
            },
            {
              icon: "add",
              label: "Add",
              onClick: () => setNewListVisible(true),

              primary: true,
            },
          ],
          items:
            genelists.length > 0
              ? genelists?.map((item, itemIndex) => {
                  if (item?.type === "Heading") {
                    return {
                      ...item,
                      id: itemIndex,
                    };
                  }
                  if (item)
                    return {
                      ...item,
                      id: itemIndex,
                      onClick: () => onClickItem(genelists.key, itemIndex),
                      actions: [
                        {
                          label: "Delete",
                          icon: <FaTrash />,
                          onClick: () =>
                            onDeleteItem(genelists.key, itemIndex, item),
                        },
                      ],
                    };
                })
              : [],
          name:
            genelists.length === 0
              ? "Add a genelist ==> "
              : "Selected Gene Lists",
        }}
      />

      <Modal visible={newListVisible} centered={true}>
        <InputGroup width={400}>
          <Genelist
            textTooltip={"Please enter your genes"}
            listTitle={"New Gene List"}
            setPerturbationList={() => {}}
            isPerturbationList={false}
            exampleVisible={false}
            setVisible={setNewListVisible}
            closeButton={true}
            showSaveListCheckBox={true}
            showAddList={true}
            returnLists={(genelist) => {
              return addtolist(genelist);
            }}
          />
        </InputGroup>
      </Modal>

      <Field //MODE
        label="Mode"
        labelLeft
        labelWidth={150}
        helpText="Set mode of genelist comparison."
      >
        <Select
          small
          onChange={({ target: { value } }) =>
            genelistcompareSettingsChanged({
              settingName: GenelistCompareSettingsTypes.MODE,
              newValue: SetCombinationType.findIndex(
                (option) => option === value
              ),
            })
          }
          options={SetCombinationType}
          value={SetCombinationType[genelistcompareSettings?.mode]}
        />
      </Field>

      <CheckBox
        label="Comparison Graph"
        onChange={({ target: { checked } }) =>
          genelistcompareSettingsChanged({
            settingName: GenelistCompareSettingsTypes.SHOW,
            newValue: checked,
          })
        }
        checked={genelistcompareSettings?.showcomparison}
      />
      <Spacer width={20} />
      <CheckBox
        label="Venn Diagram"
        onChange={({ target: { checked } }) =>
          genelistcompareSettingsChanged({
            settingName: GenelistCompareSettingsTypes.SHOWVENN,
            newValue: checked,
          })
        }
        checked={genelistcompareSettings?.showvenn}
      />

      <Field //MINIMUM SET NUMBER
        label="Minimum number of set members"
        labelLeft
        labelWidth={150}
        helpText="Set the threshold for minimum number od"
      >
        <div className={styles.inputRange}>
          <Slider
            label={genelistcompareSettings?.minsetmember}
            max={50}
            min={0}
            value={genelistcompareSettings?.minsetmember}
            onChange={({ target: { value } }) =>
              genelistcompareSettingsChanged({
                settingName: GenelistCompareSettingsTypes.MINSETMEMBER,
                newValue: value,
              })
            }
          />
        </div>
      </Field>

      <Field //THEME
        label="Theme"
        labelLeft
        labelWidth={150}
        helpText="Set the color theme."
      >
        <Select
          small
          onChange={({ target: { value } }) =>
            genelistcompareSettingsChanged({
              settingName: GenelistCompareSettingsTypes.THEME,
              newValue: value,
            })
          }
          options={["Dark", "Light", "Vega", "Colorful"]}
          value={genelistcompareSettings?.theme}
        />
      </Field>

      <Field //BAR PADDING
        label="Bar Padding"
        labelLeft
        labelWidth={150}
        //helpText="Set the threshold for maximum number set members for the visibility of the set / intersection"
      >
        <div className={styles.inputRange}>
          <Slider
            label={genelistcompareSettings?.barpadding}
            max={99}
            min={0}
            value={genelistcompareSettings?.barpadding * 100}
            onChange={({ target: { value } }) =>
              genelistcompareSettingsChanged({
                settingName: GenelistCompareSettingsTypes.BARPADDING,
                newValue: value / 100,
              })
            }
          />
        </div>
      </Field>

      <Field //DOT PADDING
        label="Dot Padding"
        labelLeft
        labelWidth={150}
        //helpText="Set the threshold for maximum number set members for the visibility of the set / intersection"
      >
        <div className={styles.inputRange}>
          <Slider
            label={genelistcompareSettings?.dotpadding}
            max={99}
            min={0}
            value={genelistcompareSettings?.dotpadding * 100}
            onChange={({ target: { value } }) =>
              genelistcompareSettingsChanged({
                settingName: GenelistCompareSettingsTypes.DOTPADDING,
                newValue: value / 100,
              })
            }
          />
        </div>
      </Field>
      <Field //chartfontsize
        label="Chart Font Size"
        labelLeft
        labelWidth={150}
        helpText="Set the chart font size"
      >
        <div className={styles.inputRange}>
          <Slider
            label={genelistcompareSettings?.chartfontsize}
            max={100}
            min={5}
            value={genelistcompareSettings?.chartfontsize}
            onChange={({ target: { value } }) =>
              genelistcompareSettingsChanged({
                settingName: GenelistCompareSettingsTypes.CHARTFONTSIZE,
                newValue: value,
              })
            }
          />
        </div>
      </Field>

      <Field //labelfontsize
        label="Label Font Size"
        labelLeft
        labelWidth={150}
        helpText="Set label font size"
      >
        <div className={styles.inputRange}>
          <Slider
            label={genelistcompareSettings?.labelfontsize}
            max={100}
            min={5}
            value={genelistcompareSettings?.labelfontsize}
            onChange={({ target: { value } }) =>
              genelistcompareSettingsChanged({
                settingName: GenelistCompareSettingsTypes.LABELFONTSIZE,
                newValue: value,
              })
            }
          />
        </div>
      </Field>

      <Field //setheightratio
        label="Combination to Set Height Ratio"
        labelLeft
        labelWidth={150}
        helpText="Set the ratio of height of combination vs set portions of the graph."
      >
        <div className={styles.inputRange}>
          <Slider
            label={genelistcompareSettings?.setheightratio}
            max={100}
            min={5}
            value={genelistcompareSettings?.setheightratio * 100}
            onChange={({ target: { value } }) =>
              genelistcompareSettingsChanged({
                settingName: GenelistCompareSettingsTypes.SETHEIGHTRATIO,
                newValue: value / 100,
              })
            }
          />
        </div>
      </Field>

      <Field //setwidthtratio
        label="Combination to Set Width Ratio"
        labelLeft
        labelWidth={150}
        //helpText="Combination to Set Width Ratio"
      >
        <div className={styles.inputRange}>
          <Slider
            label={(
              1 -
              genelistcompareSettings?.widthRatios[0] -
              genelistcompareSettings?.widthRatios[1]
            ).toFixed(2)}
            max={100}
            min={1}
            step={5}
            value={
              (1 -
                genelistcompareSettings?.widthRatios[0] -
                genelistcompareSettings?.widthRatios[1]) *
              100
            }
            onChange={({ target: { value } }) => {
              const v = Number.parseFloat(value) / 100;
              const sum =
                genelistcompareSettings?.widthRatios[0] +
                genelistcompareSettings?.widthRatios[1];
              const v0 =
                ((1 - v) * genelistcompareSettings?.widthRatios[0]) / sum;
              const v1 =
                ((1 - v) * genelistcompareSettings?.widthRatios[1]) / sum;
              genelistcompareSettingsChanged({
                settingName: GenelistCompareSettingsTypes.WIDTHRATIOS,
                newValue: [v0, v1],
              });
            }}
          />
        </div>
      </Field>

      <Field //settolabel
        label="Set to Label Width Ratio"
        labelLeft
        labelWidth={150}
        //helpText="Set to Label Width Ratio"
      >
        <div className={styles.inputRange}>
          <Slider
            label={(
              genelistcompareSettings?.widthRatios[0] /
              (genelistcompareSettings?.widthRatios[0] +
                genelistcompareSettings?.widthRatios[1])
            ).toFixed(2)}
            max={100}
            min={1}
            step={5}
            value={
              (genelistcompareSettings?.widthRatios[0] /
                (genelistcompareSettings?.widthRatios[0] +
                  genelistcompareSettings?.widthRatios[1])) *
              100
            }
            onChange={({ target: { value } }) => {
              const v = Number.parseFloat(value) / 100;
              const sum =
                genelistcompareSettings?.widthRatios[0] +
                genelistcompareSettings?.widthRatios[1];
              const v0 = v * sum;
              const v1 = (1 - v) * sum;
              genelistcompareSettingsChanged({
                settingName: GenelistCompareSettingsTypes.WIDTHRATIOS,
                newValue: [v0, v1],
              });
            }}
          />
        </div>
      </Field>
    </>
  );
};

const mapStateToProps = ({ settings }) => ({
  genelistcompareSettings: settings?.genelistcompare ?? {},
});
const mapDispatchToProps = {
  genelistcompareSettingsChanged,
};

const MainContainer = connect(
  mapStateToProps,
  mapDispatchToProps
)(GenelistCompareSettings);
export { MainContainer as GenelistCompareSettings };
