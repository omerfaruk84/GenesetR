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
import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "react-router-dom";
import { get, set, del } from "../../store/safeIdb";
import GeneSymbolValidatorMessage from "../GeneSelectionBox/GeneSymbolValidatorMessage";
import { debounce } from "lodash";
import { coreSettingsChanged } from "../../store/settings/core-settings";
import GeneSignatureSearchPopup from "../genesigndb/genesignaturedb";
import { checkGenes } from "./helper";
import { fetchHugoGenes, updateGeneLists } from "../../store/api";
import { runCalculation } from "../../store/results/index";
import { ROUTES } from "../../common/routes";
import { SendToMenu } from "../send-to";

/*
let isLoaded = false;
var db;
const dbPromise = window.indexedDB.open("GeneListDB", 1);
*/

// ---------------------------------------------------------------------------
// Text normalisation
// ---------------------------------------------------------------------------

/**
 * Gene signature ("A+B-C"). White space, commas, semicolons and new lines act
 * as "+", but never next to a minus sign: "A - B" stays "A-B" (B is
 * subtracted) instead of becoming "A+-+B", which the backend reads as "+B".
 */
const normalizeSignatureText = (value) =>
  (value || "")
    .toString()
    .toUpperCase()
    .replaceAll(/NON-TARGETING_\d+/g, "")
    .replace(/[\s,;]+/g, "+")
    .replace(/\++/g, "+")
    .replace(/-+/g, "-")
    .replace(/\+?-\+?/g, "-")
    .replace(/-+/g, "-")
    .replace(/^\+/, "");

/**
 * Plain gene list: one symbol per line. Separators are white space, commas,
 * semicolons and "+". A hyphen is part of the symbol (HLA-A, MT-CO1, NKX2-1)
 * unless the text is known to be a signature (`fromSignature`).
 * Duplicates are only removed when `dedupe` is set (paste / blur / load), never
 * while typing - otherwise "RPS3A" could not be typed after "RPS3".
 */
const normalizeListText = (value, { dedupe = false, fromSignature = false } = {}) => {
  const separators = fromSignature ? /[\s,;+-]+/g : /[\s,;+]+/g;
  let lines = (value || "")
    .toString()
    .toUpperCase()
    .replaceAll(/NON-TARGETING_\d+/g, "")
    .replace(separators, "\n")
    .replace(/^\n+/, "")
    .split("\n")
    .map((v) => v.replace(/_.+/g, ""));

  if (dedupe) {
    const seen = new Set();
    const lastIndex = lines.length - 1;
    lines = lines.filter((v, i) => {
      if (v === "") return i === lastIndex; // keep a trailing new line only
      if (seen.has(v)) return false;
      seen.add(v);
      return true;
    });
  }
  return lines.join("\n");
};

/** Bring a value that comes from outside (Redux, saved list) into the form of the current mode. */
const toModeText = (value, isGeneSignature) => {
  const text = (value || "").toString();
  if (isGeneSignature) return normalizeSignatureText(text);
  // A "+" can only come from a gene signature: split its operators as well
  return normalizeListText(text, { dedupe: true, fromSignature: text.includes("+") });
};

const comparableText = (value) => (value || "").trim().replace(/\s+/g, "\n");

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
  // Redux core-settings field this list is bound to ("peturbationList" or
  // "targetGeneList"). Independent of `isPerturbationList`, which only says
  // what kind of symbols the list holds (used for validation and labels).
  field = undefined,
  runCalculation,
}) => {
  // Lists used in "add list" dialogs are not bound to Redux
  const boundField = showAddList
    ? null
    : field || (isPerturbationList ? "peturbationList" : "targetGeneList");

  // Current text of the textarea. A bound list starts with the value Redux
  // already holds, so mounting the sidebar never wipes the user's lists.
  const [currentGenes, setGenes] = useState(() =>
    boundField && !genes
      ? toModeText(coreSettings?.[boundField] || "", isGeneSignature)
      : ""
  );
  const [currentGeneLists, setGeneLists] = useState([]); //sets the current gene lists in select box
  const [selectedGeneList, setSelectedGeneList] = useState(); //sets the currently selected gene list in the select box
  const [newGeneListName, setNewGeneListName] = useState(newListName);
  const [newGeneListDescription, setNewGeneListDescription] = useState();
  const [saveListChecked, setsaveListChecked] = useState(true);
  const [props, setProps] = useState({});
  const location = useLocation();
  const [isGeneSignaturePopupOpen, setGeneSignaturePopupOpen] = useState(false);
  const { pathname } = location;
  const currentGenesRef = useRef(currentGenes); // latest text, for callbacks
  currentGenesRef.current = currentGenes;
  const lastSyncedRef = useRef(null); // last value exchanged with Redux (read or written)
  const isFirstWriteRef = useRef(true); // the first write effect must not overwrite Redux
  const prevIsGeneSignatureRef = useRef(isGeneSignature);
  const modeTextRef = useRef({}); // text last used per mode ("signature" / "list")

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

  // The name index is shared by every gene list box (and browser tab): always
  // read the stored set right before changing it, never write a stale copy.
  const updateGeneListNames = useCallback(async (mutate) => {
    const stored = await get("geneListNames");
    const names = new Set(stored ? [...stored] : []);
    mutate(names);
    await set("geneListNames", names);
    setGeneListNames(names);
    return names;
  }, []);

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

  //Retrieves local genelists from database (resolves with the list of names)
  const refreshList = useCallback(() => {
    return getAllGenelists()
      .then((genelists) => {
        const names = genelists ? [...genelists] : []; //converts sets to array
        setGeneLists(names);
        return names;
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
        throw error;
      });
  }, []);

  const genesChanged = useCallback(
    (value, options = {}) => {
      if (newGeneListName === selectedGeneList && !saveListChecked)
        setsaveListChecked(true);

      const raw = (value || "").toString();
      let normalizedValue;
      if (isGeneSignature) {
        normalizedValue = normalizeSignatureText(raw);
      } else {
        // Typing changes the text one character at a time. Anything bigger
        // (paste, example, loaded list) is de-duplicated right away; typed
        // text is de-duplicated when the field loses focus.
        const previous = currentGenesRef.current || "";
        const isBulkChange =
          options.dedupe === true || Math.abs(raw.length - previous.length) > 1;
        normalizedValue = normalizeListText(raw, { dedupe: isBulkChange });
      }

      setGenes(normalizedValue);
    },
    [newGeneListName, selectedGeneList, saveListChecked, isGeneSignature]
  );

  // Latest genesChanged for effects that must not re-run when it changes
  const genesChangedRef = useRef(genesChanged);
  genesChangedRef.current = genesChanged;

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

  const reduxValue = boundField ? coreSettings?.[boundField] ?? "" : null;

  // Redux -> textarea: only for changes made elsewhere (e.g. a gene list sent
  // from the enrichment table); values this component wrote itself are skipped.
  useEffect(() => {
    if (!boundField) return;
    if (reduxValue === lastSyncedRef.current) return;
    lastSyncedRef.current = reduxValue;

    const incoming = toModeText(reduxValue, isGeneSignature);
    setGenes((prevGenes) =>
      comparableText(prevGenes) === comparableText(incoming) ? prevGenes : incoming
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduxValue, boundField]);

  // The same box is used for plain gene lists and for gene signatures (Gene
  // Signature page). When the mode changes, remember the text of the mode that
  // is left and bring back the text last used in the new mode; without one the
  // current text is converted (list -> "A+B+C", signature -> one gene per line).
  useEffect(() => {
    if (prevIsGeneSignatureRef.current === isGeneSignature) return;
    const previousMode = prevIsGeneSignatureRef.current ? "signature" : "list";
    const nextMode = isGeneSignature ? "signature" : "list";
    prevIsGeneSignatureRef.current = isGeneSignature;

    const currentText = currentGenesRef.current || "";
    modeTextRef.current[previousMode] = currentText;

    const remembered = modeTextRef.current[nextMode];
    if (typeof remembered === "string" && remembered.trim().length > 0) {
      setGenes(remembered);
    } else if (isGeneSignature) {
      setGenes(normalizeSignatureText(currentText));
    } else {
      setGenes(normalizeListText(currentText, { dedupe: true, fromSignature: true }));
    }
  }, [isGeneSignature]);

  // Textarea -> owner (Redux for the sidebar lists)
  useEffect(() => {
    if (boundField && isFirstWriteRef.current) {
      isFirstWriteRef.current = false;
      // The state was initialised from Redux: only write back when
      // normalisation changed the text.
      if (currentGenes === (coreSettings?.[boundField] ?? "")) return;
    }
    isFirstWriteRef.current = false;
    if (boundField) lastSyncedRef.current = currentGenes;
    setPerturbationList(currentGenes);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentGenes, setPerturbationList]);

  // Validate the symbols (debounced) when the text or the dataset changes
  useEffect(() => {
    debouncedChangeHandler(currentGenes);
    return () => {
      if (typeof debouncedChangeHandler.cancel === "function") {
        debouncedChangeHandler.cancel();
      }
    };
  }, [currentGenes, debouncedChangeHandler]);

  useEffect(() => {
    //When page loaded refresh genelist
    refreshList().catch(() => {});

    //check whether  all gene list exists if not download the all gene list
    fetchHugoGenes();

    //if gene and perturbation list was not downloaded before, download it.
    updateGeneLists(coreSettings?.cellLine.id);
  }, [coreSettings?.cellLine.id, refreshList]);

  // Genes handed in by the parent (e.g. "add list" dialog). Applied only when
  // the prop itself changes, so typing a name does not undo edits to the text.
  useEffect(() => {
    if (genes?.length > 1) genesChangedRef.current(genes, { dedupe: true });
  }, [genes]);

  const numberOfGenesEntered = currentGenes
    ? currentGenes
        .trim()
        .replace(isGeneSignature ? /[\s,;+-]+/g : /[\s,;+]+/g, "\n")
        .split("\n")
        .reduce((prev, step) => (step.trim() ? prev + 1 : prev), 0)
    : 0;

  // Insert a new genelist into the database
  const addGenelist = (genelistID, geneList) => {
    if (!genelistID || !geneList) return;

    get("genelist_" + genelistID)
      .then(async (existing) => {
        await set("genelist_" + genelistID, geneList);
        // (Re-)register the name: also repairs an index that lost the entry
        await updateGeneListNames((names) => names.add(genelistID));

        toast({
          message: {
            type: "Success",
            icon: true,
            heading: "Genelist",
            content: existing
              ? "Genelist updated successfully"
              : "Genelist saved successfully",
          },
          autoClose: 2000,
        });

        await refreshList();
        setSelectedGeneList(genelistID);
        setGenes(geneList.genes);
      })
      .catch((error) => {
        console.error(error);
        toast({
          message: {
            type: "Error",
            icon: true,
            heading: "Genelist",
            content: "Failed to save the genelist. " + error,
          },
          autoClose: 3000,
        });
      });
  };

  // Remove a genelist from the database based on ID
  const removeGenelistById = (id) => {
    del("genelist_" + id)
      .then(async () => {
        await updateGeneListNames((names) => names.delete(id));

        toast({
          message: {
            type: "Warning",
            icon: true,
            heading: "Genelist",
            content: "Genelist deleted successfully",
          },
          autoClose: 2000,
        });

        // Continue with the lists that are left after the deletion
        const remaining = await refreshList();
        if (remaining.length > 0) {
          const next = remaining[0];
          setSelectedGeneList(next);
          const result = await getGenelistById(next);
          setNewGeneListName(result?.name ?? result?.value ?? next);
          setGenes(result?.genes || "");
          setNewGeneListDescription(result?.description);
        } else {
          setSelectedGeneList(undefined);
          setGenes("");
          setNewGeneListDescription(undefined);
          setNewGeneListName(undefined);
        }
      })
      .catch((error) => {
        console.error(error);
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
                {!isGeneSignature && numberOfGenesEntered > 0 && (
                  <SendToMenu
                    genes={() => currentGenes}
                    label="Send to"
                    style={{ height: 24, padding: "0 8px", fontSize: 12 }}
                  />
                )}
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

                        if (!genes || genes.size === 0) {
                          toast({
                            message: {
                              type: "Warning",
                              icon: true,
                              heading: "Example",
                              content:
                                "The gene list of the selected dataset is not available yet. Please try again in a moment.",
                            },
                            autoClose: 3000,
                          });
                          return;
                        }

                        genes = [...genes];

                        var exampleGeneCount = 50;
                        if (
                          pathname === ROUTES.CORRELATION ||
                          pathname === ROUTES.CORRELATION_WEBGL ||
                          pathname === ROUTES.CORRELATION_FAST ||
                          pathname === ROUTES.DR ||
                          pathname === ROUTES.HEATMAP
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
                        genesChanged(genelist, { dedupe: true });
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
                onBlur={() => {
                  // Remove duplicates once editing is finished
                  if (!isGeneSignature) {
                    setGenes((prevGenes) =>
                      normalizeListText(prevGenes, { dedupe: true })
                    );
                  }
                }}
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
                              !newGeneListName ||
                              newGeneListName.trim().length < 3 ||
                              numberOfGenesEntered === 0
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
