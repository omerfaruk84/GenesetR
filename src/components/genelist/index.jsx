import React from "react";
import { connect } from 'react-redux';
//import { connect } from 'react-redux';
import Axios from  'axios';
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
import { useState, useEffect, useCallback } from "react";
import { get, set, del} from "idb-keyval";
import GeneSymbolValidatorMessage from "../GeneSelectionBox/GeneSymbolValidatorMessage";
import { debounce } from "lodash";
import { coreSettingsChanged } from '../../store/settings/core-settings'
import { CoreSettingsTypes } from '../side-bar/settings/enums';
import {getAliasesForGeneList, checkGenes} from './helper'

/*
let isLoaded = false;
var db;
const dbPromise = window.indexedDB.open("GeneListDB", 1);
*/

const Genelist = ({ setPerturbationList, coreSettings ,isPerturbationList}) => {
  
  useEffect(() => {
    //When page loaded refresh genelist
    refreshList();
    console.log("currentGeneLists", currentGeneLists);
    
    //When page loaded check whether  all gene list exists if not download the all gene list
    get("allHugoGenes").then((val) => {
      //console.log("val", val) 
      if (!val || val.size===0)
      {
        Axios.post("https://29d3-2001-700-100-400a-00-f-f95c.eu.ngrok.io/getData", 
        {
          body: JSON.stringify({            
            request: 'getHugoGenes'
          }),
        })
          .then(response => 
            {            
            if(response && response.data) { 
              console.log(response.data)          
              set("allHugoGenes", new Set(response.data.result));              
            }
            });      
    }});

//if perturbation list was nt downloaded before, download it.
    get("geneList_" + coreSettings?.cellLine + "_genes").then((val) => {
      //console.log("val", val) 
      if (!val || val.size===0){

        coreSettingsChanged({
          settingName: CoreSettingsTypes.CELL_LINE,
          newValue:  coreSettings?.cellLine
        })
      }
    
    });

  }, []);


  //Connect to indexdb and get genelists
  const [currentGenes, setGenes] = useState(""); //sets the current genes in textarea
  const [currentGeneLists, setGeneLists] = useState([]); //sets the current gene lists in select box
  const [selectedGeneList, setSelectedGeneList] = useState(); //sets the currently selected gene list in the select box
  const [newGeneListName, setNewGeneListName] = useState();
  const [props, setProps] = useState({});

  

  const replaceGene = useCallback((oldSymbols, newSymbol) => {
    console.log("In replace Gene",oldSymbols);
    let result = currentGenes.toUpperCase();
    if (oldSymbols instanceof Array){   
      oldSymbols.forEach((oldSymbol) => {
        result = result.replace(new RegExp(`\\b${oldSymbol.toUpperCase()}\\b`, "g"), () =>
        newSymbol
        .trim()
        .replace(/^\s+|\s+$/g, "")
        .replace(/[ \+]+/g, " ")
        .toUpperCase()
        );
      });

    }else{
      result= result
        .toUpperCase()
        .replace(new RegExp(`\\b${oldSymbols.toUpperCase()}\\b`, "g"), () =>
          newSymbol
            .trim()
            .replace(/^\s+|\s+$/g, "")
            .replace(/[ \+]+/g, " ")
            .toUpperCase());
    }

    result = result.replace(/[\n]{2,}/g, "\n").trim("\n");

    setGenes(result)
   
  }, [currentGenes, setGenes]);

  let geneListNames = new Set();
  get("geneListNames").then((val) => {
    if (val) geneListNames = val;
    else geneListNames = new Set();
  });


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
          if(genelists){
              setGeneLists([...genelists]); //converts sets to array
              resolve();
            }else
            {
              return;
              //reject("No saved genelists were found!");
              //throw new Error("No saved genelists were found!")
            }          
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
          reject(error);
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
  }, [currentGenes]);
  
 
function genesChanged(value) { 
  setProps ({
    oql: {
      query: { gene: "", alterations: false },
    },
    validatingGenes: true,
    replaceGene: replaceGene,
    wrapTheContent: false,
    genes: {
      found: [],
      suggestions: [],
    },
  });   
    setGenes(value?.replaceAll(/\s+|,|;/g, '\n').replaceAll(/\n+/g, '\n').trimStart('\n')) 
    //console.log("Here we are in genesChangedsd") 
    //updateQueryToBeValidateDebounce();   
}


useEffect(() => {
  updateQueryToBeValidateDebounce();
}, [currentGenes]);


/*
function myFunction() {
  console.log('Function executed');
}

const debouncedFunction = debounce(myFunction, 1000);
console.log('Waht about this');
// Call the debounced function
debouncedFunction();

// Call the debounced function again within the 1 second delay
debouncedFunction();

// Wait for 1 second and then call the debounced function again
setTimeout(() => {
  debouncedFunction();
}, 1000);

*/

const updateQueryToBeValidateDebounce = debounce(() => {

  checkGenes(currentGenes, isPerturbationList , coreSettings?.cellLine).then(
    (prop) => {
      console.log(prop)
      prop.replaceGene= replaceGene;
      setProps(prop);
    }
  )
}, 2000);

 
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

const mapStateToProps = ({ settings}) => ({
  coreSettings: settings?.core ?? {}, 
});

const mapDispatchToProps = {
  coreSettingsChanged,
};

const MainContainer = connect(mapStateToProps, mapDispatchToProps)(Genelist);

export { MainContainer as Genelist };



