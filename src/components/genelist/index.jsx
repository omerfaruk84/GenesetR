import React from "react";
import { connect } from "react-redux";
//import { connect } from 'react-redux';

import {
  Heading,
  Card,
  Field,
  toast,
  Flex,
  Text,
  Popover,
  Input,
  Spacer,
  Select,
  TextArea,
  Button,
  Row,
  CheckBox,
  Divider,
} from "@oliasoft-open-source/react-ui-library";
import styles from "./main-view.module.scss";
import { FaTrash, FaSave, FaTimesCircle, FaPlusSquare } from "react-icons/fa";
import { useState, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { get, set, del } from "idb-keyval";
import GeneSymbolValidatorMessage from "../GeneSelectionBox/GeneSymbolValidatorMessage";
import { debounce } from "lodash";
import { coreSettingsChanged } from "../../store/settings/core-settings";
import GeneSignatureSearchPopup from "../genesigndb/genesignaturedb";
import { checkGenes } from "./helper";
import { fetchHugoGenes, updateGeneLists } from "../../store/api";

/*
let isLoaded = false;
var db;
const dbPromise = window.indexedDB.open("GeneListDB", 1);
*/

const Genelist = ({
  setPerturbationList,
  coreSettings,
  isPerturbationList,
  setVisible = () => {},
  returnLists = () => {},
  isGeneSignature = false,
  listTitle = "",
  textTooltip = "",
  exampleVisible = true,
  closeButton = false,
  showSaveListCheckBox = false,
  genes = "",
  showAddList = false,
  showSavedGeneLists = true,
  newListName = undefined,
}) => {
  const [currentGenes, setGenes] = useState(""); //sets the current genes in textarea
  const [currentGeneLists, setGeneLists] = useState([]); //sets the current gene lists in select box
  const [selectedGeneList, setSelectedGeneList] = useState(); //sets the currently selected gene list in the select box
  const [newGeneListName, setNewGeneListName] = useState(newListName);
  const [newGeneListDescription, setNewGeneListDescription] = useState();
  const [saveListChecked, setsaveListChecked] = useState(true);
  const [props, setProps] = useState({});
  const location = useLocation();
  const [isGeneSignaturePopupOpen, setGeneSignaturePopupOpen] = useState(false);
  const { pathname } = location;

  // Optimize geneListNames loading with useEffect
  const [geneListNames, setGeneListNames] = useState(new Set());

  useEffect(() => {
    let isMounted = true;
    get("geneListNames").then((val) => {
      if (isMounted) {
        setGeneListNames(val || new Set());
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const saveGeneListNames = useCallback(() => {
    set("geneListNames", geneListNames);
  }, [geneListNames]);

  // Get all available genelists from the database
  const getAllGenelists = () => {
    return get("geneListNames");
  };

  const replaceGene = useCallback(
    (oldSymbols, newSymbols) => {
      setGenes((currentGene) => {
        let result = currentGene.toUpperCase();
        if (
          Array.isArray(oldSymbols) &&
          Array.isArray(newSymbols) &&
          oldSymbols.length === newSymbols.length
        ) {
          oldSymbols.forEach((oldSymbol, index) => {
            const newSymbol = newSymbols[index];
            result = result.replace(
              new RegExp(`\\b${oldSymbol.toUpperCase()}\\b`, "g"),
              () =>
                newSymbol
                  .trim()
                  .replace(/^\s+|\s+$/g, "")
                  .replace(/[ +]+/g, " ")
                  .toUpperCase()
            );
          });
        } else {
          const geneSymbols = Array.isArray(oldSymbols)
            ? oldSymbols
            : [oldSymbols];
          geneSymbols.forEach((oldSymbol) => {
            const newSymbol =
              typeof newSymbols === "string" ? newSymbols : newSymbols[0];
            result = result.replace(
              new RegExp(`\\b${oldSymbol.toUpperCase()}\\b`, "g"),
              () =>
                newSymbol
                  .trim()
                  .replace(/^\s+|\s+$/g, "")
                  .replace(/[ +]+/g, " ")
                  .toUpperCase()
            );
          });
        }

        result = result.replace(/[ \t]+/g, "");
        if (!isGeneSignature)
          result = result.replace(/[\n]{2,}/g, "\n").trim("\n");
        else {
          while (/[+-]{2,}/.test(result)) {
            result = result.replace(
              /[+-]{2,}/g,
              (match) => match[match.length - 1]
            );
          }
          result = result.replace(/^[+-]|[+-]$/g, "");
        }

        console.log("currentGenes", currentGene, oldSymbols, newSymbols);
        return result;
      });
    },
    [isGeneSignature]
  );

  //Retrieves local genelists from database
  const refreshList = useCallback(() => {
    return new Promise((resolve, reject) => {
      getAllGenelists()
        .then((genelists) => {
          //console.log("refreshList", genelists);
          if (genelists) {
            setGeneLists([...genelists]); //converts sets to array
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
  }, []);

  const genesChanged = useCallback((value) => {
    value = value.toUpperCase();
    if (newGeneListName === selectedGeneList && !saveListChecked)
      setsaveListChecked(true);
    if (isGeneSignature)
      value = value
        ?.replaceAll(/\s+|,|\n+|;/g, "+")
        .replaceAll(/\++/g, "+")
        .replaceAll(/-+/g, "-")
        .trimStart("+");
    else console.log(value);
    value = value
      ?.toUpperCase()
      .replaceAll(/NON-TARGETING_\d+/g, "")
      .replaceAll(/\s+|,|;/g, "\n")
      .replaceAll(/\n+/g, "\n")
      .trimStart("\n")
      .split("\n")
      .map((v) => v.replaceAll(/_.+/g, "")) // Split into an array by newline
      .filter((v, i, a) => a.indexOf(v) === i) // Filter out duplicates
      .join("\n"); // Join back into a string separated by newlines

    setGenes(value, () => {
      setProps(() => ({
        validatingGenes: true,
        replaceGene: replaceGene,
        genes: {
          found: [],
          suggestions: [],
        },
        currentGenes: value,
      }));
    });
  }, [newGeneListName, selectedGeneList, saveListChecked, isGeneSignature, replaceGene]);

  // Get a genelist from the database based on ID
  const getGenelistById = (id) => {
    return get("genelist_" + id);
  };

  const debouncedChangeHandler = useCallback(
    debounce((genes) => {
      if (genes.length > 0)
        checkGenes(
          genes,
          isPerturbationList,
          coreSettings?.cellLine.id,
          isGeneSignature
        ).then((prop) => {
          prop["replaceGene"] = replaceGene;
          setProps(prop);
        });
    }, 1000),
    [
      checkGenes,
      isPerturbationList,
      coreSettings?.cellLine.id,
      isGeneSignature,
      replaceGene,
    ]
  );

  useEffect(() => {
    setPerturbationList(currentGenes);
    debouncedChangeHandler(currentGenes);
  }, [currentGenes, coreSettings.cellLine.id, setPerturbationList, debouncedChangeHandler]);

  useEffect(() => {
    //When page loaded refresh genelist
    refreshList();

    //check whether  all gene list exists if not download the all gene list
    fetchHugoGenes();

    //if gene and perturbation list was not downloaded before, download it.
    updateGeneLists(coreSettings?.cellLine.id);

    if (genes?.length > 1) genesChanged(genes);
  }, [coreSettings?.cellLine.id, genes, genesChanged, refreshList]);

  const numberOfGenesEntered = currentGenes
    ? currentGenes
        .trim()
        .replace(/\s+|,|;|[+-]|\n+/g, "\n")
        .split("\n")
        .reduce((prev, step) => (step.trim() ? prev + 1 : prev), 0)
    : 0;

  // Insert a new genelist into the database
  const addGenelist = (genelistID, geneList) => {
    console.log("We are in addgenelist", genelistID, geneList);
    if (genelistID && geneList)
      get("genelist_" + genelistID).then((val) => {
        if (val) {
          console.log("We are updating genelist", genelistID, geneList);
          set("genelist_" + genelistID, geneList).then(() => {
            toast({
              message: {
                type: "Success",
                icon: true,
                heading: "Genelist",
                content: "Genelist updated successfully",
              },
              autoClose: 2000,
            });
            refreshList().then(() => {
              setSelectedGeneList(genelistID);
              setGenes(geneList.genes);
            });
          });
        } else {
          console.log("We are creating genelist", genelistID, geneList);
          set("genelist_" + genelistID, geneList).then(() => {
            geneListNames.add(genelistID);
            saveGeneListNames();
            toast({
              message: {
                type: "Success",
                icon: true,
                heading: "Genelist",
                content: "Genelist saved successfully",
              },
              autoClose: 2000,
            });
            refreshList().then(() => {
              setSelectedGeneList(genelistID);

              setGenes(geneList.genes);
            });
          });
        }
      });
  };

  // Remove a genelist from the database based on ID
  const removeGenelistById = (id) => {
    del("genelist_" + id).then(() => {
      toast({
        message: {
          type: "Warning",
          icon: true,
          heading: "Genelist",
          content: "Genelist deleted successfully",
        },
        autoClose: 2000,
      });
      geneListNames.delete(id);
      saveGeneListNames();
      refreshList().then(() => {
        if (currentGeneLists.length > 0) {
          setSelectedGeneList(currentGeneLists[0]);

          getGenelistById(currentGeneLists[0])
            .then((result) => {
              setNewGeneListName(result.name);
              setGenes(result.genes);
              setNewGeneListDescription(result?.description);
            })
            .catch((error) => {
              console.error(error);
            });
        } else {
          setSelectedGeneList([]);
          setGenes("");
          setNewGeneListDescription(undefined);
          setNewGeneListName(undefined);
        }
      });
    });
  };

  return (
    <>
      <div className={styles.mainView}>
        <Card
          heading={
            <div style={{ width: "100%" }}>
              <Flex alignItems="center" justifyContent="space-between">
                <Heading>{listTitle}</Heading>
                {exampleVisible && (
                  <Button
                    label="Example"
                    small
                    colored="success"
                    onClick={async () => {
                      if (isGeneSignature)
                        genesChanged(
                          "HSPA5+DDIT3+EDEM1+PPP1R15A+HERPUD1+DNAJC3+DNAJB9+DNAJB11+MANF+HERPUD1+SDF2L1+HSP90B1+SELENOK+CDK2AP2+CALR-TUBB-SLC25A3-PTMA-PRDX1-PPIA-TUBB4B-HSPE1-CD59"
                        );
                      else {
                        let extension = "_perturb";
                        if (!isPerturbationList) extension = "_genes";
                        let genes = await get(
                          "geneList_" + coreSettings?.cellLine.id + extension
                        );

                        genes = [...genes];

                        var exampleGeneCount = 50;
                        if (
                          pathname === "/correlation" ||
                          pathname === "/dr" ||
                          pathname === "/heatmap"
                        ) {
                          exampleGeneCount =
                            Math.floor(Math.random() * 151) + 100;
                        } else if (pathname === "/pathfinder") {
                          exampleGeneCount =
                            Math.floor(Math.random() * 61) + 40;
                        }

                        var genelist = "";
                        if (exampleGeneCount >= genes.length) {
                          genelist = genes.join(",");
                        } else {
                          for (let i = 0; i < exampleGeneCount; i++) {
                            let randomIndex = Math.floor(
                              Math.random() * (genes.length - 1)
                            );
                            genelist += genes[randomIndex] + ",";
                          }
                        }
                        genesChanged(genelist);
                      }
                    }}
                  />
                )}
                {closeButton && (
                  <Button
                    small
                    round
                    styles={styles.buttonMargin}
                    colored
                    icon={<FaTimesCircle />}
                    onClick={() => setVisible(false)}
                  />
                )}
              </Flex>{" "}
            </div>
          }
        >
          {isGeneSignature && (
            <Row spacing={0} width="100%" height="15%">
              <Button
                width={"100%"}
                label="Search Online Gene Signatures"
                small
                styles={styles.buttonMargin}
                colored
                onClick={() => setGeneSignaturePopupOpen(true)}
              />
            </Row>
          )}

          {showSavedGeneLists && (
            <Row spacing={0} width="100%" height="15%">
              <div className={styles.subItems}>
                <Field
                  label={
                    "Saved " +
                    (isGeneSignature ? "gene signatures" : "genelists")
                  }
                  labelLeft
                  labelWidth="90px"
                  helpText={
                    "Your locally saved " +
                    (isGeneSignature ? "gene signatures" : "genelists")
                  }
                  className={styles.mainView}
                >
                  <Select
                    onChange={({ target: { value } }) => {
                      //console.log("value", value);
                      setSelectedGeneList(value);
                      setNewGeneListName(value);
                      setsaveListChecked(false);

                      getGenelistById(value)
                        .then((result) => {
                          //console.log(result);
                          setGenes(result.genes);
                          setNewGeneListDescription(result?.description);
                        })
                        .catch((error) => {
                          console.error(error);
                        });
                    }}
                    options={currentGeneLists}
                    value={selectedGeneList}
                  />
                </Field>
              </div>
            </Row>
          )}

          <Row spacing={0} width="100%" height="70%">
            <div className={styles.subItems}>
              <TextArea
                width="100%"
                placeholder={textTooltip}
                tooltip={textTooltip}
                rows={8}
                resize="vertical"
                value={currentGenes}
                onChange={({ target: { value } }) => genesChanged(value)}
              />
              <Spacer height={3} />
              {currentGenes.length > 0 && (
                <GeneSymbolValidatorMessage {...props} />
              )}

              <Spacer height={3} />
              <Text>
                {numberOfGenesEntered +
                  (isGeneSignature
                    ? " genes in the signature"
                    : isPerturbationList
                      ? " perturbations"
                      : " genes")}
              </Text>
            </div>
          </Row>
          {showAddList && (
            <>
              <Divider margin={10} />
              <Field
                label={"Name"}
                labelLeft
                labelWidth="90px"
                className={styles.mainView}
              >
                <Input
                  value={newGeneListName}
                  small
                  onChange={({ target: { value } }) => {
                    setNewGeneListName(value);
                  }}
                  placeholder="Please enter a name for the list (required)"
                />
              </Field>
              <Field
                label={"Description"}
                labelLeft
                labelWidth="90px"
                className={styles.mainView}
              >
                <Input
                  small
                  value={newGeneListDescription}
                  onChange={({ target: { value } }) =>
                    setNewGeneListDescription(value)
                  }
                  placeholder={"Enter a description for the list."}
                />
              </Field>
              <Divider margin={10} />
            </>
          )}
          <Row spacing={0} width="100%" height="15%">
            <div className={styles.subItems}>
              <Flex
                alignItems="center"
                justifyContent="space-between"
                //className={styles.mainView}
                //  style={{width: "100%"}}
              >
                <Button
                  small
                  colored="danger"
                  disabled={
                    selectedGeneList === undefined ||
                    currentGeneLists.length === 0 ||
                    newGeneListName !== selectedGeneList
                  }
                  icon={<FaTrash />}
                  label="DELETE"
                  onClick={() => {
                    console.log("Deleting", selectedGeneList);
                    removeGenelistById(selectedGeneList);
                  }}
                />
                {showSaveListCheckBox && (
                  <CheckBox
                    label={
                      newGeneListName === selectedGeneList
                        ? "Update the list"
                        : "Add to my genelists"
                    }
                    onChange={() => setsaveListChecked(!saveListChecked)}
                    checked={saveListChecked}
                  />
                )}

                {showAddList && (
                  <Button
                    small
                    colored
                    label="ADD LIST"
                    icon={<FaPlusSquare />}
                    disabled={
                      numberOfGenesEntered === 0 ||
                      newGeneListName?.length < 5 ||
                      !newGeneListName
                    }
                    onClick={() => {
                      if (saveListChecked) {
                        addGenelist(newGeneListName, {
                          label: newGeneListName,
                          timestamp: Date.now(),
                          value: newGeneListName,
                          genes: currentGenes,
                          description: newGeneListDescription,
                        });
                      }
                      if (
                        returnLists({
                          name: newGeneListName,
                          description: newGeneListDescription,
                          genes: currentGenes,
                        })
                      )
                        setVisible(false);
                    }}
                  />
                )}

                {!showAddList && (
                  <Popover
                    showCloseButton
                    disabled={numberOfGenesEntered === 0}
                    content={
                      <>
                        <Field
                          label={"Name"}
                          labelLeft
                          labelWidth="70px"
                          className={styles.mainView}
                        >
                          <Input
                            width={250}
                            value={newGeneListName}
                            placeholder="Please enter a name for the list (required)"
                            small
                            onChange={({ target: { value } }) =>
                              setNewGeneListName(value)
                            }
                          />
                        </Field>
                        <Field
                          label={"Description"}
                          labelLeft
                          labelWidth="70px"
                        >
                          <Input
                            small
                            value={newGeneListDescription}
                            onChange={({ target: { value } }) =>
                              setNewGeneListDescription(value)
                            }
                            placeholder={"Enter a description for the list."}
                          />
                        </Field>
                        <Flex justifyContent={"flex-end"}>
                          <Button
                            colored="success"
                            small
                            label="Save"
                            icon={<FaSave />}
                            disabled={
                              currentGeneLists.length === 0 ||
                              newGeneListName?.length < 3
                            }
                            onClick={() => {
                              addGenelist(newGeneListName, {
                                label: newGeneListName,
                                timestamp: Date.now(),
                                value: newGeneListName,
                                genes: currentGenes,
                                description: newGeneListDescription,
                              });
                              //set genelist to current one
                              document.body.click();
                            }}
                          />
                        </Flex>
                      </>
                    }
                  >
                    <Button
                      small
                      colored
                      label="SAVE LIST"
                      icon={<FaSave />}
                      disabled={numberOfGenesEntered === 0}
                    />
                  </Popover>
                )}
              </Flex>
            </div>
          </Row>
        </Card>
      </div>
      <GeneSignatureSearchPopup
        open={isGeneSignaturePopupOpen}
        onClose={() => setGeneSignaturePopupOpen(false)}
        onGeneListSelect={(geneList) => genesChanged(geneList)}
      />
    </>
  );
};

const mapStateToProps = ({ settings }) => ({
  coreSettings: settings?.core ?? {},
});

const mapDispatchToProps = {
  coreSettingsChanged,
};

const MainContainer = connect(mapStateToProps, mapDispatchToProps)(Genelist);

export { MainContainer as Genelist };
