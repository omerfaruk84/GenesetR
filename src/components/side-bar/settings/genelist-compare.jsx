import React, { useEffect, useState } from "react";
import { connect } from "react-redux";
import { FaTrash } from "react-icons/fa";
import { get, set } from "idb-keyval";

import {
  Field,
  Select,
  Slider,
  InputGroup,
  // List,
  toast,
  Modal,
  CheckBox,
  Spacer,
} from "@oliasoft-open-source/react-ui-library";
import { genelistcompareSettingsChanged } from "../../../store/settings/genelist-compare-settings";
import { GenelistCompareSettingsTypes } from "./enums";
import styles from "./settings.module.scss";
import { Genelist } from "../../genelist";
import {
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Checkbox,
  IconButton,
  Button,
  Paper,
  Box,
} from "@mui/material";
import {
  Delete as DeleteIcon,
  DragHandle as DragHandleIcon,
  Add as AddIcon,
} from "@mui/icons-material";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";

const reorder = (list, startIndex, endIndex) => {
  console.log("reorder", list, startIndex, endIndex);
  const result = Array.from(list);
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);
  return result;
};

const GenelistCompareSettings = ({
  genelistcompareSettings,
  genelistcompareSettingsChanged,
}) => {
  const [genelists, setGeneLists] = useState(genelistcompareSettings.genelists);

  const handleToggle = (name) => {
    setGeneLists((prevLists) =>
      prevLists.map((item) =>
        item.name === name ? { ...item, checked: !item.checked } : item
      )
    );
    refreshList();
  };

  const handleDragEnd = (result) => {
    // Dropped outside the list
    if (!result.destination) return;
    const newItems = reorder(
      genelists,
      result.source.index,
      result.destination.index
    );
    setGeneLists(newItems);
  };

  const onDeleteItem = (headingKey, itemIndex, item) => {
    console.log(headingKey, itemIndex, item);
    const items = [...genelists.filter((obj) => obj.name !== item.name)];
    //draft[headingKey].items = items.filter(i => i); //remove empty slots
    setGeneLists(items);
  };

  const [newListVisible, setNewListVisible] = useState(false);
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

  // Get all available genelists from the database
  const getAllGenelists = () => {
    return get("geneListNames");
  };

  //Retrieves local genelists from database
  const refreshList = () => {
    return new Promise((resolve, reject) => {
      getAllGenelists()
        .then((genelists) => {
          //console.log("refreshList", genelists);
          if (genelists) {
            //setGeneListNames([...genelists]); //converts sets to array
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
    console.log("genelists changed", genelists);
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
        checked: true,
        content: genelist.description,
        genes: genelist.genes.split("\n"),
      });
      setGeneLists(temp);
      return true;
    }
  };

  return (
    <>
      <Paper sx={{ p: 2, borderRadius: 2, boxShadow: 3 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
          <Button
            variant="contained"
            color="success"
            startIcon={<AddIcon />}
            onClick={() => setNewListVisible(true)}
          >
            Add List
          </Button>
          <Button
            variant="outlined"
            color="secondary"
            disabled={genelists.length === 0}
            onClick={() => setGeneLists([])}
          >
            Remove All
          </Button>
        </Box>
        {genelists.length === 0 ? (
          <Box sx={{ p: 2, textAlign: "center", color: "text.secondary" }}>
            No gene lists added yet. Please add at least two gene lists to
            compare.
          </Box>
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="droppable-list">
              {(provided) => (
                <List
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  component={Paper}
                  sx={{
                    p: 0,
                    bgcolor: "background.paper",
                    borderRadius: 2,
                    boxShadow: 1,
                  }}
                >
                  {genelists.map((item, index) => (
                    <Draggable
                      key={item.name}
                      draggableId={`draggable-${item.name}`}
                      index={index}
                    >
                      {(provided, snapshot) => (
                        <ListItem
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          style={{
                            ...provided.draggableProps.style,
                            height: "40px",
                          }}
                          divider
                          secondaryAction={
                            <IconButton
                              edge="end"
                              onClick={() =>
                                onDeleteItem(genelists.key, index, item)
                              }
                            >
                              <DeleteIcon />
                            </IconButton>
                          }
                          sx={{
                            py: 0.5, // reduce vertical padding
                            transition: "background-color 0.3s",
                            bgcolor: snapshot.isDragging
                              ? "action.hover"
                              : "transparent",
                            "&:hover": {
                              bgcolor: "action.hover", // lighter color on hover
                            },
                          }}
                        >
                          {/* Drag handle area */}
                          <ListItemIcon
                            {...provided.dragHandleProps}
                            sx={{ minWidth: "auto", pr: 1, ml: -1 }} // reduce space if needed
                          >
                            <DragHandleIcon
                              color="primary"
                              style={{ cursor: "grab" }}
                            />
                          </ListItemIcon>

                          {/* Checkbox */}
                          <ListItemIcon sx={{ minWidth: "auto", pr: 1 }}>
                            <Checkbox
                              edge="start"
                              checked={item.checked}
                              tabIndex={-1}
                              disableRipple
                              onClick={() => handleToggle(item.name)}
                              sx={{
                                p: 0.5, // adjust size of checkbox area
                              }}
                            />
                          </ListItemIcon>

                          {/* Two-line text */}
                          <ListItemText
                            primary={item.name}
                            secondary={`${item.genes.length} genes`}
                            sx={{
                              "& .MuiListItemText-primary": {
                                fontSize: "0.9rem",
                                fontWeight: 500,
                              },
                              "& .MuiListItemText-secondary": {
                                fontSize: "0.75rem",
                                color: "text.secondary",
                              },
                            }}
                          />
                        </ListItem>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </List>
              )}
            </Droppable>
          </DragDropContext>
        )}
      </Paper>

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
      <Spacer height={20} />

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
        helpText="Display a comparison graph showing relationships between gene lists."
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
        helpText="Display a Venn diagram showing overlaps between gene lists (works best with 2-3 lists)."
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
        helpText="Set the threshold for minimum number of genes required in an intersection to be displayed in the comparison."
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
        helpText="Set the color theme for the comparison visualization."
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
        helpText="Adjust spacing between bars in the comparison chart. Higher values create more space between elements."
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

      <Field //setlabelfontsize
        label="Set Label Font Size"
        labelLeft
        labelWidth={150}
        helpText="Set font size for set labels specifically"
      >
        <div className={styles.inputRange}>
          <Slider
            label={genelistcompareSettings?.setlabelfontsize}
            max={100}
            min={5}
            value={genelistcompareSettings?.setlabelfontsize}
            onChange={({ target: { value } }) =>
              genelistcompareSettingsChanged({
                settingName: GenelistCompareSettingsTypes.SETLABELFONTSIZE,
                newValue: value,
              })
            }
          />
        </div>
      </Field>

      <Field //venndiagramfontsize
        label="Venn Diagram Font Size"
        labelLeft
        labelWidth={150}
        helpText="Set font size for Venn diagram text"
      >
        <div className={styles.inputRange}>
          <Slider
            label={genelistcompareSettings?.venndiagramfontsize}
            max={100}
            min={5}
            value={genelistcompareSettings?.venndiagramfontsize}
            onChange={({ target: { value } }) =>
              genelistcompareSettingsChanged({
                settingName: GenelistCompareSettingsTypes.VENNDIAGRAMFONTSIZE,
                newValue: value,
              })
            }
          />
        </div>
      </Field>

      <Field //fontfamily
        label="Font Family"
        labelLeft
        labelWidth={150}
        helpText="Set the font family for all text elements"
      >
        <Select
          small
          onChange={({ target: { value } }) =>
            genelistcompareSettingsChanged({
              settingName: GenelistCompareSettingsTypes.FONTFAMILY,
              newValue: value,
            })
          }
          options={[
            "Arial, sans-serif",
            "Helvetica, sans-serif", 
            "Times New Roman, serif",
            "Georgia, serif",
            "Verdana, sans-serif",
            "Tahoma, sans-serif",
            "Trebuchet MS, sans-serif",
            "Courier New, monospace",
            "Lucida Console, monospace",
            "Impact, sans-serif"
          ]}
          value={genelistcompareSettings?.fontfamily}
        />
      </Field>

      <Field //fontweight
        label="Font Weight"
        labelLeft
        labelWidth={150}
        helpText="Set the font weight for text elements"
      >
        <Select
          small
          onChange={({ target: { value } }) =>
            genelistcompareSettingsChanged({
              settingName: GenelistCompareSettingsTypes.FONTWEIGHT,
              newValue: value,
            })
          }
          options={[
            "normal",
            "bold",
            "bolder",
            "lighter",
            "100",
            "200", 
            "300",
            "400",
            "500",
            "600",
            "700",
            "800",
            "900"
          ]}
          value={genelistcompareSettings?.fontweight}
        />
      </Field>

      <Field //fontstyle
        label="Font Style"
        labelLeft
        labelWidth={150}
        helpText="Set the font style for text elements"
      >
        <Select
          small
          onChange={({ target: { value } }) =>
            genelistcompareSettingsChanged({
              settingName: GenelistCompareSettingsTypes.FONTSTYLE,
              newValue: value,
            })
          }
          options={[
            "normal",
            "italic",
            "oblique"
          ]}
          value={genelistcompareSettings?.fontstyle}
        />
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
