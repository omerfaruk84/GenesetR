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
  Row,
} from "@oliasoft-open-source/react-ui-library";
import styles from "./main-view.module.scss";
import { FaTrash, FaSave, FaWindowClose } from "react-icons/fa";
import { useState, useEffect, useCallback} from "react";
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

const Genelist = ({ setPerturbationList, coreSettings ,isPerturbationList, isGeneSignature = false, listTitle =""}) => {
  
  if(listTitle === "" && isPerturbationList) listTitle = "Perturbations"
  else if(listTitle === "" && isGeneSignature === true) listTitle = "Gene Signature"
  else if (listTitle === "") listTitle = "Genes"


  useEffect(() => {
    //When page loaded refresh genelist
    refreshList();
    //console.log("currentGeneLists", currentGeneLists);
    
    //When page loaded check whether  all gene list exists if not download the all gene list
    get("allHugoGenes").then((val) => {
      //console.log("val", val) 
      if (!val || val.size===0)
      {
        Axios.post("https://genesetr.uio.no/api/getData", 
        //Axios.post("https://localhost:8443/getData", 
        {
          headers: {
            'ngrok-skip-browser-warning': '69420',
          },
          body: JSON.stringify({            
            request: 'getHugoGenes'
          }),
        })
          .then(response => 
            {            
            if(response && response.data) { 
              //console.log(response.data)          
              set("allHugoGenes", new Set(response.data.result));              
            }
            });      
    }});

    //if perturbation list was not downloaded before, download it.
    get("geneList_" + coreSettings?.cellLine[0] + "_genes").then((val) => {
      //console.log("val", val) 
      if (!val || val.size===0){

        // WHAT IS THIS FOR????
        //coreSettingsChanged({
        //  settingName: CoreSettingsTypes.CELL_LINE,
        //  newValue:  coreSettings?.cellLine
        //})
      }
    
    });

  }, []);


  const [currentGenes, setGenes] = useState(""); //sets the current genes in textarea
  const [currentGeneLists, setGeneLists] = useState([]); //sets the current gene lists in select box
  const [selectedGeneList, setSelectedGeneList] = useState(); //sets the currently selected gene list in the select box
  const [newGeneListName, setNewGeneListName] = useState();
  const [props, setProps] = useState({});



  const replaceGene = useCallback((oldSymbols, newSymbols) => {  
    setGenes((currentGene) => {
      let result = currentGene.toUpperCase();
      if (Array.isArray(oldSymbols) && Array.isArray(newSymbols) && oldSymbols.length === newSymbols.length) {
        oldSymbols.forEach((oldSymbol, index) => {
          const newSymbol = newSymbols[index];
          result = result.replace(new RegExp(`\\b${oldSymbol.toUpperCase()}\\b`, "g"), () =>
            newSymbol
            .trim()
            .replace(/^\s+|\s+$/g, "")
            .replace(/[ \+]+/g, " ")
            .toUpperCase()
          );
        });
      } else {
        const geneSymbols = Array.isArray(oldSymbols) ? oldSymbols : [oldSymbols];
        geneSymbols.forEach((oldSymbol) => {
          const newSymbol = typeof newSymbols === 'string' ? newSymbols : newSymbols[0];
          result = result.replace(new RegExp(`\\b${oldSymbol.toUpperCase()}\\b`, "g"), () =>
            newSymbol
            .trim()
            .replace(/^\s+|\s+$/g, "")
            .replace(/[ \+]+/g, " ")
            .toUpperCase()
          );
        });
      }
  
      result = result.replace(/[ \t]+/g, "");
      if (!isGeneSignature) result = result.replace(/[\n]{2,}/g, "\n").trim("\n");
      else {          
        while (/[+-]{2,}/.test(result)) {
          result = result.replace(/[+-]{2,}/g, match => match[match.length - 1]);
        }
        result = result.replace(/^[+-]|[+-]$/g, "");
      }
  
      console.log("currentGenes", currentGene, oldSymbols, newSymbols)
      return result;
    });
  }, [isGeneSignature]);
  let geneListNames = new Set();
  get("geneListNames").then((val) => {
    if (val) geneListNames = val;
    else geneListNames = new Set();
  });


const numberOfGenesEntered = currentGenes
    ? currentGenes
          .trim()
          .replace(/\s+|,|;|\n+/g, "\n")
          .split("\n")
          .reduce((prev, step) => (step.trim() ? prev + 1 : prev), 0)
    : 0;


  const saveGeneListNames = () => {
    set("geneListNames", geneListNames);
  };

  

  //Retrieves local genelists from database
  const refreshList = () => {
    return new Promise((resolve, reject) => {
      getAllGenelists()
        .then((genelists) => {
          //console.log("refreshList", genelists);
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
    //console.log("Prosps before setgenes", props)
    debouncedChangeHandler(currentGenes);
    //console.log("Prosps after setgenes", props)
      
  }, [currentGenes, coreSettings.cellLine]);
  
 
  function genesChanged(value) { 
    const cleanedValue = value?.replaceAll(/\s+|,|;/g, '\n').replaceAll(/\n+/g, '\n').trimStart('\n');
  
    setGenes(cleanedValue, () => {
      setProps (() => ({
        oql: {
          query: { gene: "", alterations: false },
        },
        validatingGenes: true,
        replaceGene: replaceGene,        
        genes: {
          found: [],
          suggestions: [],
        },
        currentGenes: cleanedValue,
      }));
    });
  }

const debouncedChangeHandler = useCallback(
  debounce((genes) => {
    checkGenes(genes, isPerturbationList , coreSettings?.cellLine[0], isGeneSignature).then(
      (prop) => {        
        prop["replaceGene"] = replaceGene      
        setProps(prop);          
      }

    )
  }, 1000), [props,checkGenes, isPerturbationList , coreSettings?.cellLine[0], isGeneSignature]);


  return (
    <div className={styles.mainView}>
      <Card heading={ <div style={{width:'100%'}}><Flex alignItems="center"   justifyContent="space-between">
        <Heading>{listTitle}</Heading> <Button
                      label="Example"
                      small
                      colored="success"
                      onClick={()=>{
                        if(isGeneSignature)
                        genesChanged("HSPA5+DDIT3+EDEM1+PPP1R15A+HERPUD1+DNAJC3+DNAJB9+DNAJB11+MANF+HERPUD1+SDF2L1+HSP90B1+SELENOK+CDK2AP2+CALR-TUBB-SLC25A3-PTMA-PRDX1-PPIA-TUBB4B-HSPE1-CD59")
                        else
                        genesChanged("IER3IP1,YIPF5,SEC61B,HSPA5,TMEM167A,SPCS3,SEL1L,INTS8,SMG5,MANF,SEC61A1,UFL1,UPF2,CNOT3,SLC35B1,SRP19,EIF2B3,SSR1,SLC39A7,TTI1,SCYL1,DDRGK1,SEC61G,SEC63,TMED2,SYVN1,BTAF1,SSR2,MED12,SMG7,TMED10,OXA1L,MRPS9,HYOU1,HSD17B12,MTHFD1,EPRS1,PSMA4,MED21,DNAJB9,ATP5F1B,VPS29,XPO1,UMPS,INTS10,DNAJC19,UROD,ATF6,TELO2,PRELID3B,SRPRB,UPF1,IDH3A,KANSL3,HSD17B10,DHX30,ASCC3,MNAT1,SAMM50,HSP90B1,INTS15,POLR3A,MRPL22,P4HB,TARS2,SLC33A1,EIF2B5,EMC2,PPP1R10,MED30,AARS1,SMC1A,PSMD4,INTS2,THRAP3,MRPS33,FAF2,AFG3L2,FECH,MED19,UQCRB,COX6C,MRPL17,SRP72,CLNS1A,OGT,TSEN2,DDX39B,PSMA7,MRPL18,PMPCB,SARS1,MED22,PSMD6,GTF2H1,PRRC2A,NDUFA8,SPCS2,ORC5,CDK6,PNISR,RNGTT,MRPS14,PSMB2,PHB1,PSMD12,ATP5ME,XRN1,MRPL43,MED23,TIMM44,ZFX,YTHDC1,MRPL34,GTF3C2,FLCN,SSR3,CCAR1,GAB2,MRPS18A,FARSB,TCF3,MRPL19,SSBP1,MRPS27,SAE1,CTPS1,GRSF1,SHOC2,SMNDC1,COX4I1,EEF1A1,VPS16,MED1,MRPS21,DAD1,METTL17,PFDN2,INPPL1,ZEB2,NDUFS1,EP400,GNPNAT1,MRPL13,MARS2,LONP1,PDIA6,SOCS1,TLK2,TPR,TARS1,CHCHD4,NSD1,ILF2,MCM6,EIF5,KDM5C,MRPS5,VARS1,PUM1,GBF1,HBS1L,SLC7A1,ZNF236,MRPL10,MRPL33,HARS1,NEDD8,SLC39A9,CALU,CSNK1A1,TTI2,MRPL55,SAP18,TRMT10C,IPO13,PSMB7,INTS14,PTCD3,MRPS23,PGD,MRPS12,RPN1,MED17,CBLL1,ALYREF,DNAJA3,HEATR1,GMPPB,PRPF39,SMC3,MED27,MRPL58,GADD45GIP1,ATP5MJ,SDHC,PSMD11,ATP5PD,CNOT2,MED6,NUP54,MED18,SNRNP70,MTPAP,MED14,DDOST,DARS1,CAD,ALG9,LAMTOR1,NDUFA9,SUPT6H,BRIP1,SLC25A51,COX10,FNIP1,GFM1,CDK7,MRPS10,PTDSS1,SUGT1,PSMD13,DTYMK,PSMD14,MRPL16,CCNH,MCM3,EIF2B4,IARS2,MRPL9,PPP2R1A,PET117,POLR2L,LRPPRC,GINS4,SEM1,UBA6,HCCS,UQCRC1,KANSL2,ZNF687,DHX15,RPL41,MRPS35,CHMP6,ALG12,DERL2,COX7C,PRKCSH,MED10,VPS4A,COPB1,EIF2S1,PSMB5,BRD8,DMAP1,MED24,SMARCA5,MRPL37,MED31,MRPS17,LYL1,NRDE2,CENPI,NCAPD2,ELL,EIF2B2,SRSF3,RPN2,MRPL27,PSMC6,MED20,RARS2,ZFR,RANBP3,COQ2,ORC2,GTF2E1,ZEB1,PNPT1,EMC4,MRPL51,POLR3B,PPRC1,MRPL32,COPG1,CARM1,PSMB1,CCDC174,CCND3,PTCD1,MRPL39,RARS1,POLG2,LAMTOR5,MRPS16,ZBTB14,ALG13,MCM2,PSMA2,FUBP3,TIAL1,MRPL36,FOXN3,MRPS18B,CHERP,TRRAP,VPS39,LAMTOR4,SMN2,UBE4B,MRPS31,MYC,BCR,MRPL35,PHB2,MARS1,THOC2,HSPA13,DMAC1,ARHGAP22,ERCC2,PABPC4,GTF2H3,MRPL20,MED16,TMCO1,CPNE1,MRPL42,SRP68,TAPT1,MCM10,DLD,XRCC5,TFB1M,MYB,TAF13,RHOXF2,RHOXF2B,ATP13A1,SRF,STT3A,MRPS7,LAMTOR2,ACAD9,ATP5PB,SNAI1,ZCRB1,NDUFB4,SKA3,OPA1,DHDDS,GTF3C1,MRPL15,MRPL49,SEC11A,SNRNP27,PSMC1,TWNK,TBP,MCM5,PPP2R2A,MED7,PGK1,CYB5B,UBE2J1,TRPM7,HINFP,CPSF6,BMS1,DNAJC24,PSMC3,MRPL3,SLC25A3,FASTKD5,NEDD8-MDP1,BCLAF1,HEXIM1,ATP5MF,ATP5PO,SINHCAF,RRAGA,CUL3,CARS2")                 
                        }}
                    /></Flex> </div>}>
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