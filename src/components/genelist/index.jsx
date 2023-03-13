import React from "react";
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
  InputGroup,
  Spacer,
  Select,
  TextArea,
  Button,
  Modal,
  Row,
} from "@oliasoft-open-source/react-ui-library";
import styles from "./main-view.module.scss";
import { FaTrash, FaSave, FaWindowClose } from "react-icons/fa";
import { useState, useEffect } from "react";
import { get, set, del, update } from "idb-keyval";
import GeneSymbolValidatorMessage, {
  GeneSymbolValidatorMessageProps,
} from "../GeneSelectionBox/GeneSymbolValidatorMessage";
import { debounce } from "lodash";

let isLoaded = false;
var db;
const dbPromise = window.indexedDB.open("GeneListDB", 1);

const Genelist = ({ setPerturbationList }) => {
  //Connect to indexdb and get genelists

  const [currentGenes, setGenes] = useState(""); //sets the current genes in textarea
  const [currentGeneLists, setGeneLists] = useState([]); //sets the current gene lists in select box
  const [selectedGeneList, setSelectedGeneList] = useState(); //sets the currently selected gene list in the select box
  const [newGeneListName, setNewGeneListName] = useState();
  const [props, setProps] = useState({});


  function replaceGene(oldSymbol, newSymbol) {
    console.log("In replace Gene");
    setGenes(
      currentGenes
        .toUpperCase()
        .replace(new RegExp(`\\b${oldSymbol.toUpperCase()}\\b`, "g"), () =>
          newSymbol
            .trim()
            .replace(/^\s+|\s+$/g, "")
            .replace(/[ \+]+/g, " ")
            .toUpperCase()
        )
    );
  }
  let geneListNames = new Set();
  get("geneListNames").then((val) => {
    if (val) geneListNames = val;
    else geneListNames = new Set();
  });

  useEffect(() => {
    refreshList();
    console.log("currentGeneLists", currentGeneLists);

    


  }, []);

  const numberOfGenesEntered = currentGenes
    ?.trim()
    ?.replaceAll(/\s+|,|;/g, "\n")
    .replaceAll(/\n+/g, "\n")
    ?.split("\n")
    ?.reduce((prev, step) => (step?.trim()?.length > 0 ? prev + 1 : prev), 0);

  const saveGeneListNames = () => {
    set("geneListNames", geneListNames);
  };

  const refreshList = () => {
    return new Promise((resolve, reject) => {
      getAllGenelists()
        .then((genelists) => {
          console.log("refreshList", genelists);
          setGeneLists([...genelists]); //converts sets to array
          resolve();
        })
        .catch((error) => {
          toast({
            message: {
              type: "Error",
              icon: true,
              heading: "Genelist Retrival",
              content: "Failed to get genelists.",
            },
            autoClose: 2000,
          });
          reject();
        });
    });
  };

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

  // Get all available genelists from the database
  const getAllGenelists = () => {
    return get("geneListNames");
  };

  // Remove a genelist from the database based on ID
  const removeGenelistById = (id) => {
    console.log("id", id);
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
              console.log(result);
              setGenes(result.genes);
            })
            .catch((error) => {
              console.error(error);
            });
        } else {
          setSelectedGeneList([]);
          setGenes("");
        }
      });
    });
  };

  // Get a genelist from the database based on ID
  const getGenelistById = (id) => {
    return get("genelist_" + id);
  };

  useEffect(() => {
    setPerturbationList(currentGenes);
  }, [setPerturbationList, currentGenes]);
  const dictionary = new Set("AKT1", "AKT2", "AKT3");


 
function genesChanged(value) {    
    setGenes(value?.replaceAll(/\s+|,|;/g, '\n').replaceAll(/\n+/g, '\n').trimStart('\n')) 
    console.log("Here we are in genesChangedsd")    
}

useEffect(() => {
  updateQueryToBeValidateDebounce();
}, [currentGenes]);

const updateQueryToBeValidateDebounce = debounce(() => {
  
  //this.queryToBeValidated = this.currentTextAreaValue;
 // this.skipGenesValidation = false;
  console.log("Here we are in Debounce")
  setProps ({
    oql: {
      query: [
        { gene: "AAA", alterations: false },
        { gene: "BBB", alterations: false },
    
      ],
    },
    validatingGenes: false,
    replaceGene: replaceGene,
    wrapTheContent: false,
    genes: {
      found: [],
      suggestions: [
        {
          alias: "AAA",
          genes: [
            {
              entrezGeneId: 351,
              hugoGeneSymbol: "APP",
              type: "protein-coding",
            },
          ],
        },
        {
          alias: "BBB",
          genes: [
            {
              geneticEntityId: 296,
              entrezGeneId: 351,
              hugoGeneSymbol: "APaP",
              type: "protein-coding",
            },
          ],
        },
      ],
    },
  });


  // When the text is empty, it will be skipped from oql and further no validation will be done.
  // Need to set the geneQuery here
  if (currentGenes === '') {
      
    /*this.geneQuery = '';
      if (this.props.callback) {
          this.props.callback(
              getOQL(''),
              getEmptyGeneValidationResult(),
              this.geneQuery
          );
      }
    */
  };
}, 500);

 
  return (
    <div className={styles.mainView}>
      <Card heading={<Heading>Genelist</Heading>}>
        <Row spacing={0} width="100%" height="15%">
          <div className={styles.subItems}>
            <Field
              label="Saved Lists"
              labelLeft
              labelWidth="80px"
              helpText="Your locally saved genelists"
              className={styles.mainView}
            >
              <Select
                onChange={({ target: { value } }) => {
                  console.log("value", value);
                  setSelectedGeneList(value);

                  getGenelistById(value)
                    .then((result) => {
                      console.log(result);
                      setGenes(result.genes);
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

        <Row spacing={0} width="100%" height="70%">
        <div className={styles.subItems}>  
        <TextArea
            width="100%" 
            placeholder='Please enter target list seperated by comma, new line, space, or semicolon!'
            tooltip='Please enter gene list seperated by comma, new line, space, or semicolon!'
            rows={8}
            resize='vertical'
            value={currentGenes}
            onChange={({ target: { value } }) =>genesChanged(value)}
        />
          <Spacer height={3} />
          <Text>{numberOfGenesEntered}</Text>
      

            <Spacer height={30} />
            <GeneSymbolValidatorMessage {...props} />
            <Spacer height={3} />
            <Text>{numberOfGenesEntered}</Text>
          </div>
        </Row>

        <Row spacing={0} width="100%" height="15%">
          <div className={styles.subItems}>
            <Flex
              alignItems="center"
              justifyContent="space-between"
              //className={styles.mainView}
              //  style={{width: "100%"}}
            >
              <Button
                colored="danger"
                disabled={
                  selectedGeneList === undefined ||
                  currentGeneLists.length === 0
                }
                icon={<FaTrash />}
                label="DELETE"
                onClick={() => {
                  console.log("Deleting", selectedGeneList);
                  removeGenelistById(selectedGeneList);
                }}
              />

              <Popover
                disabled={numberOfGenesEntered === 0}
                content={
                  <InputGroup>
                    <Input
                      value={newGeneListName ?? "New Gene List"}
                      width="150px"
                      onChange={({ target: { value } }) =>
                        setNewGeneListName(value)
                      }
                    />
                    <Button
                      colored="success"
                      label="Save"
                      icon={<FaSave />}
                      disabled={false}
                      onClick={() => {
                        addGenelist(newGeneListName, {
                          label: newGeneListName,
                          timestamp: Date.now(),
                          value: newGeneListName,
                          genes: currentGenes,
                        });
                        //set genelist to current one
                      }}
                    />
                    <Button
                      label="Cancel"
                      icon={<FaWindowClose />}
                      onClick={function Tl() {}}
                    />
                  </InputGroup>
                }
              >
                <Button
                  colored
                  label="SAVE LIST"
                  icon={<FaSave />}
                  disabled={numberOfGenesEntered === 0}
                />
              </Popover>
            </Flex>
          </div>
        </Row>
      </Card>
    </div>
  );
};

export default Genelist;
