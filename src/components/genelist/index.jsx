import React from "react";
import { connect } from "react-redux";

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
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { get, set, del } from "idb-keyval";
import GeneSymbolValidatorMessage from "../GeneSelectionBox/GeneSymbolValidatorMessage";
import { debounce } from "lodash";
import { coreSettingsChanged } from "../../store/settings/core-settings";
import GeneSignatureSearchPopup from "../genesigndb/genesignaturedb";
import { checkGenes } from "./helper";
import { fetchHugoGenes, updateGeneLists } from "../../store/api";
import { runCalculation } from "../../store/results/index";
import { ROUTES } from "../../common/routes";

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
  runCalculation,
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
  const perturbationListInitializedRef = useRef(false); // Track if perturbation list has initialized
  const targetListInitializedRef = useRef(false); // Track if target list has initialized
  const prevPerturbationListRef = useRef(null); // Track previous perturbation list value
  const prevTargetListRef = useRef(null); // Track previous target list value

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
          if (genelists) {
            setGeneLists([...genelists]); //converts sets to array
            resolve();
          } else {
            return;
          }
        })
        .catch((error) => {
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
    if (isGeneSignature) {
      // For gene signatures, normalize separators to + but preserve + and - signs
      value = value
        ?.replaceAll(/\s+|,|\n+|;/g, "+")
        .replaceAll(/\++/g, "+")
        .replaceAll(/-+/g, "-")
        .trimStart("+");
      
      // Remove NON-TARGETING genes and clean up underscores, but preserve + and - signs
      value = value
        .replaceAll(/NON-TARGETING_\d+/g, "")
        .replaceAll(/[+-]NON-TARGETING_\d+/g, "") // Also remove with preceding sign
        .replaceAll(/NON-TARGETING_\d+[+-]/g, ""); // Also remove with following sign
      
      // Process each gene while preserving signs - split by + and - but keep them
      const parts = value.split(/([+-])/);
      const processedParts = [];
      const seenGenes = new Set();
      
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (part === "+" || part === "-") {
          // Always preserve signs - they're needed between genes and at the end for continued typing
          // Check if there's a following non-empty gene part
          const nextIndex = i + 1;
          const hasFollowingGene = nextIndex < parts.length && 
                                    parts[nextIndex] && 
                                    parts[nextIndex].trim().length > 0;
          
          // Add sign if: (1) there's a following gene, OR (2) it's at the end (trailing sign)
          // This preserves trailing signs so users can continue typing
          if (hasFollowingGene || nextIndex >= parts.length || 
              (parts[nextIndex] && parts[nextIndex].trim().length === 0)) {
            processedParts.push(part);
          }
        } else if (part && part.trim().length > 0) {
          // Clean up gene name (remove underscores and trailing parts)
          const cleanedGene = part.replaceAll(/_.+/g, "").trim();
          if (cleanedGene && !seenGenes.has(cleanedGene)) {
            seenGenes.add(cleanedGene);
            processedParts.push(cleanedGene);
          } else if (cleanedGene && seenGenes.has(cleanedGene)) {
            // Remove the preceding sign if gene is duplicate
            if (processedParts.length > 0 && 
                (processedParts[processedParts.length - 1] === "+" || 
                 processedParts[processedParts.length - 1] === "-")) {
              processedParts.pop();
            }
          }
        }
      }
      
      // Remove leading + if present (but keep -)
      if (processedParts.length > 0 && processedParts[0] === "+") {
        processedParts.shift();
      }
      
      value = processedParts.join("");
    } else {
      value = value
        ?.toUpperCase()
        .replaceAll(/NON-TARGETING_\d+/g, "")
        .replaceAll(/\s+|,|;|\+/g, "\n") // Also replace plus signs with newlines when not a gene signature box
        .replaceAll(/\n+/g, "\n")
        .trimStart("\n")
        .split("\n")
        .map((v) => v.replaceAll(/_.+/g, "")) // Split into an array by newline
        .filter((v, i, a) => a.indexOf(v) === i) // Filter out duplicates
        .join("\n"); // Join back into a string separated by newlines
    }

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

  // Create debounced function using useMemo to avoid recreating on every render
  const debouncedChangeHandler = useMemo(
    () =>
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
      isPerturbationList,
      coreSettings?.cellLine.id,
      isGeneSignature,
      replaceGene,
    ]
  );

  // Sync local state from Redux when Redux state changes (e.g., when opened from enrichment table)
  // Only sync from the field that this component is responsible for
  // Use separate effects to ensure only the correct field triggers updates
  
  // Sync from perturbation list when this is the perturbation list component
  // Skip syncing when used in modal/popup mode for adding new lists (showAddList=true)
  useEffect(() => {
    if (!isPerturbationList) return;
    if (showAddList) return; // Don't sync from Redux when adding a new list from enrichment
    
    const reduxGeneList = coreSettings?.peturbationList;
    
    // Skip if value hasn't changed
    if (prevPerturbationListRef.current === reduxGeneList) {
      return;
    }
    
    // On first render, initialize after a delay to let page component set values first
    if (!perturbationListInitializedRef.current) {
      const timer = setTimeout(() => {
        perturbationListInitializedRef.current = true;
        // Sync the current value after initialization
        const currentReduxList = coreSettings?.peturbationList;
        prevPerturbationListRef.current = currentReduxList;
        if (currentReduxList && currentReduxList.trim().length > 0) {
          setGenes(currentReduxList.trim());
        } else {
          // Clear if empty (including empty string)
          setGenes("");
        }
      }, 250); // Wait 250ms for page component to set values (longer than page's 100ms)
      return () => clearTimeout(timer);
    }
    
    // Update the ref to track this value
    prevPerturbationListRef.current = reduxGeneList;
    
    // After initialization, sync normally
    if (reduxGeneList && reduxGeneList.trim().length > 0) {
      // Only update if different from current local state to avoid infinite loops
      const normalizedRedux = reduxGeneList.trim().replace(/\s+/g, '\n');
      setGenes((prevGenes) => {
        const normalizedCurrent = prevGenes.trim().replace(/\s+/g, '\n');
        if (normalizedRedux !== normalizedCurrent) {
          return reduxGeneList.trim();
        }
        return prevGenes; // Return unchanged if same
      });
    } else {
      // If Redux is empty or cleared, clear local state
      setGenes((prevGenes) => {
        if (prevGenes.trim().length > 0) {
          return "";
        }
        return prevGenes; // Return unchanged if already empty
      });
    }
  }, [coreSettings?.peturbationList, isPerturbationList]);
  
  // Sync from target gene list when this is the target gene list component
  // Skip syncing when used in modal/popup mode for adding new lists (showAddList=true)
  useEffect(() => {
    if (isPerturbationList) return;
    if (showAddList) return; // Don't sync from Redux when adding a new list from enrichment
    
    const reduxGeneList = coreSettings?.targetGeneList;
    
    // Skip if value hasn't changed
    if (prevTargetListRef.current === reduxGeneList) {
      return;
    }
    
    // On first render, initialize after a delay to let page component set values first
    if (!targetListInitializedRef.current) {
      const timer = setTimeout(() => {
        targetListInitializedRef.current = true;
        // Sync the current value after initialization
        const currentReduxList = coreSettings?.targetGeneList;
        prevTargetListRef.current = currentReduxList;
        if (currentReduxList && currentReduxList.trim().length > 0) {
          setGenes(currentReduxList.trim());
        } else {
          // Clear if empty (including empty string)
          setGenes("");
        }
      }, 250); // Wait 250ms for page component to set values (longer than page's 100ms)
      return () => clearTimeout(timer);
    }
    
    // Update the ref to track this value
    prevTargetListRef.current = reduxGeneList;
    
    // After initialization, sync normally
    if (reduxGeneList && reduxGeneList.trim().length > 0) {
      // Only update if different from current local state to avoid infinite loops
      const normalizedRedux = reduxGeneList.trim().replace(/\s+/g, '\n');
      setGenes((prevGenes) => {
        const normalizedCurrent = prevGenes.trim().replace(/\s+/g, '\n');
        if (normalizedRedux !== normalizedCurrent) {
          return reduxGeneList.trim();
        }
        return prevGenes; // Return unchanged if same
      });
    } else {
      // If Redux is empty or cleared, clear local state
      setGenes((prevGenes) => {
        if (prevGenes.trim().length > 0) {
          return "";
        }
        return prevGenes; // Return unchanged if already empty
      });
    }
  }, [coreSettings?.targetGeneList, isPerturbationList]);

  // Initialize refs with current Redux values on mount to prevent initial sync issues
  useEffect(() => {
    if (isPerturbationList) {
      if (prevPerturbationListRef.current === null) {
        prevPerturbationListRef.current = coreSettings?.peturbationList;
      }
    } else {
      if (prevTargetListRef.current === null) {
        prevTargetListRef.current = coreSettings?.targetGeneList;
      }
    }
  }, [isPerturbationList]); // Only run when isPerturbationList changes (component type)

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
    if (genelistID && geneList)
      get("genelist_" + genelistID).then((val) => {
        if (val) {
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
            .catch(() => {
              // Handle error silently or with toast
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
                      setSelectedGeneList(value);
                      setNewGeneListName(value);
                      setsaveListChecked(false);

                      getGenelistById(value)
                        .then((result) => {
                          setGenes(result.genes);
                          setNewGeneListDescription(result?.description);
                        })
                        .catch(() => {
                          // Handle error silently or with toast
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
        onGeneListSelect={(geneList) => {
          genesChanged(geneList);
        }}
        onSelectAndCalculate={() => {
          // Auto-trigger calculation if we're on gene signature page
          if (isGeneSignature && pathname === ROUTES.GENESIGNATURE) {
            // Small delay to ensure the gene list is updated in Redux first
            setTimeout(() => {
              runCalculation(ROUTES.GENESIGNATURE);
            }, 200);
          }
        }}
      />
    </>
  );
};

const mapStateToProps = ({ settings }) => ({
  coreSettings: settings?.core ?? {},
});

const mapDispatchToProps = {
  coreSettingsChanged,
  runCalculation,
};

const MainContainer = connect(mapStateToProps, mapDispatchToProps)(Genelist);

export { MainContainer as Genelist };
