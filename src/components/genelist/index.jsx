import React from 'react';
//import { connect } from 'react-redux';
import { Heading,Card,Field,toast, Flex, Text, Popover, Input, InputGroup, Spacer, Select, TextArea, Button, Modal, Row,  } from "@oliasoft-open-source/react-ui-library";
import styles from './main-view.module.scss';
import { FaTrash, FaSave, FaWindowClose} from 'react-icons/fa';
import { useState } from "react";

const Genelist = (props) => {
    //Connect to indexdb and get genelists

    var db;
    const dbPromise = window.indexedDB.open('GeneListDB', 1);
    const [currentGenes, setGenes] = useState(""); //sets the current genes in textarea
    const [currentGeneLists, setGeneLists] = useState([]); //sets the current gene lists in select box
    const [selectedGeneList, setSelectedGeneList] = useState();//sets the currently selected gene list in the select box
    const [newGeneListName, setNewGeneListName] = useState();
   


    const numberOfGenesEntered = currentGenes?.trim()?.replaceAll(/\s+|,|;/g, '\n').replaceAll(/\n+/g, '\n')
    ?.split('\n')
    ?.reduce((prev, step) => step?.trim()?.length > 0 ? prev + 1 : prev, 0);

    

    dbPromise.onerror = (event) => {
      toast({
        message: { "type":  "Error",
        "icon": true,
        "heading": "Local DB Creation",
        "content": "It seems that there is a problem with saving data to IndexDB.\n Be sure to use an up-to-date browser.\nAnd check whther you have enough space on your disk."},
        autoClose:3000
      })
    };

    
    dbPromise.onsuccess = (event) => {
        console.log("DBOpen suceeded")
     db = event.target.result;    
     };
    
    // Create the object store and indexes when the database is first created
    dbPromise.onupgradeneeded = event => {
    var db = event.target.result;
    const genelistStore = db.createObjectStore('genelists', { keyPath: "label" });
    genelistStore.createIndex('label', 'label', { unique: true });
    genelistStore.createIndex('timestamp', 'timestamp', { unique: false });
    refreshList();
    };

    const refreshList = ()=> {
      getAllGenelists()
      .then(genelists => {   
        console.log("refreshList",genelists )     
        setGeneLists(genelists);    
        console.log("Reset list", genelists)        
      })
      .catch(error => {
        toast({
          message: { "type":  "Error",
          "icon": true,
          "heading": "Genelist Retrival",
          "content": "Failed to get genelists."},
          autoClose:2000
        })
      })   
   }

    // Insert a new genelist into the database
    const addGenelist = (genelist) => {       
    return new Promise((resolve, reject) => {        
      const transaction = db.transaction('genelists', 'readwrite');
      const genelistStore = transaction.objectStore('genelists');
      genelist.timestamp = Date.now(); // Add a timestamp to the genelist object
      console.log("Adding:" , genelist, genelistStore)
      const request = genelistStore.put(genelist);
      request.onsuccess = () => {
        console.log("Adding succeeded:" , genelistStore, db)
        toast({
          message: { "type":  "Success",
          "icon": true,
          "heading": "Genelist",
          "content": "Genelist saved successfully"},
          autoClose:2000
        })
        refreshList();
        resolve()    
    };
      request.onerror = () => reject();
        });
    };
    
    function addOrReplaceGenelist(genelist) {
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(['genelists'], 'readwrite');
        const objectStore = transaction.objectStore('genelists');
        genelist.timestamp = Date.now(); // Add a timestamp to the genelist object
        console.log(genelist)
        const request = objectStore.get(genelist.label);
    
        request.onsuccess = event => {
          const existingGenelist = request.result;
          if (existingGenelist) {
            // A genelist with this ID already exists, so update it
            const updateRequest = objectStore.put(genelist);
            updateRequest.onsuccess = () => {
              toast({
                message: { "type":  "Success",
                "icon": true,
                "heading": "Genelist",
                "content": "Genelist updated successfully"},
                autoClose:2000
              })
              resolve(updateRequest.result)           
            };
            updateRequest.onerror = () => reject(updateRequest.error);           
          } else {
            // This is a new genelist, so add it
            const addRequest = objectStore.add(genelist);
            addRequest.onsuccess = () => {
              toast({
                message: { "type":  "Success",
                "icon": true,
                "heading": "Genelist",
                "content": "Genelist saved successfully"},
                autoClose:2000
              });
              resolve(addRequest.result);
            }
            addRequest.onerror = () => reject(addRequest.error);
          }
          refreshList();
        };
    
        request.onerror = event => {
          reject(request.error);
        };
      });
    }



  // Get all available genelists from the database
  const getAllGenelists = () => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('genelists', 'readonly');
      const genelistStore = transaction.objectStore('genelists');
      const index = genelistStore.index('timestamp');
      const maxAge = Date.now() - (30 * 24 * 60 * 60 * 1000); // 30 days ago
      const request = index.openCursor(IDBKeyRange.lowerBound(maxAge));
      const genelists = [];
      request.onsuccess = event => {
        const cursor = event.target.result;      
        if (cursor) {
          genelists.push(cursor.value);
          cursor.continue();
        } else {
          resolve(genelists);
        }
      };
      request.onerror = () => reject();
    });
  };
  
  // Remove a genelist from the database based on ID
  const removeGenelistById = (id) => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('genelists', 'readwrite');
      const genelistStore = transaction.objectStore('genelists');
      const request = genelistStore.delete(id);
      request.onsuccess = () => {
        toast({
          message: { "type":  "Warning",
          "icon": true,
          "heading": "Genelist",
          "content": "Genelist deleted successfully"},
          autoClose:2000
        }) 
        refreshList();       
        resolve()    
      
      };
      request.onerror = () => reject();
    });
  };


   // Get a genelist from the database based on ID
   const getGenelistById = (id) => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('genelists', 'readonly');
      const genelistStore = transaction.objectStore('genelists');
      console.log("ID",id)
      const request = genelistStore.get(id);
      request.onsuccess = event => {        
        resolve(event.target.result)   
      };
      request.onerror = event => {
        reject(request.error);
      };
    });
  };

  
  const genelist = {
    label: 'My First Gene List',
    value: "ABC"
  };

  
  


  /*
  const genelistId = 1;
  removeGenelistById(genelistId)
  .then(() => {
    console.log(`Genelist with ID ${genelistId} was successfully removed from the database`);
  })
  .catch(error => {
    console.error(error);
  });
  */

    
    

  return (
    <div className={styles.mainView}> 
    <Card heading={<Heading>Genelist</Heading>}>
     <Row spacing={0} width="100%" height="15%" >  
     <div className={styles.subItems}>  
    <Field label='Saved Lists' labelLeft labelWidth="80px" helpText="Your locally saved genelists" className={styles.mainView}>
        
        <Select
          onChange={({ target: { value} }) => {
            console.log("value",value)
            setSelectedGeneList(value);                           
            
            getGenelistById(value).then(result => {
              console.log(result)
               setGenes(result.genes); 
            })
            .catch(error => {
              console.error(error);
            });   
          }        
                    
          }          
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
            onChange={({ target: { value } }) => setGenes(value?.replaceAll(/\s+|,|;/g, '\n').replaceAll(/\n+/g, '\n').trimStart('\n')) }
        />
        <Spacer height={3} />
        <Text>{numberOfGenesEntered}</Text>
    </div>
    </Row> 
   
   
    <Row spacing={0} width="100%" height="15%">
    
    <div className={styles.subItems}>  
    <Flex  alignItems="center"
    justifyContent="space-between"
    //className={styles.mainView}
    //  style={{width: "100%"}}
    
    >
 
        <Button 
        colored="danger"
        disabled = {selectedGeneList === undefined || currentGeneLists.length===0}
        icon={<FaTrash />}
        label="DELETE" 
        onClick={() => {
          console.log("Deleting",selectedGeneList)          
          removeGenelistById(selectedGeneList).then(result =>
          //set selected genelist to firtsone
          {if(currentGeneLists.length>0){
            setSelectedGeneList(currentGeneLists[0])           
            setGenes(currentGeneLists[0].genes)  
          }
            else
            {
              setSelectedGeneList(undefined)
              setGenes("")        
            }
          }
          ).catch(error => {console.error(error)

            })}
          }       
        /> 

        <Popover disabled = {numberOfGenesEntered===0} content={<InputGroup>
            <Input value={newGeneListName??"New Gene List"} width="150px"  onChange={({ target: { value } }) => setNewGeneListName(value)}/>
            <Button colored="success" label="Save"  icon={<FaSave />} disabled = {false} 
            onClick={() =>{ 
              addGenelist({label: newGeneListName, value:newGeneListName, genes :currentGenes}).then(result => {
                setSelectedGeneList(newGeneListName)
                setGenes(currentGenes)}
              )
              //set genelist to current one
                       


            }}/>
            <Button label="Cancel" icon={<FaWindowClose />}  onClick={function Tl(){}}/></InputGroup>}>
            <Button colored label="SAVE LIST"  icon={<FaSave />} disabled= {numberOfGenesEntered===0}/>
        </Popover>  
        </Flex>
        </div>
    </Row> 
    
    </Card> 
    </div>
  );
};


export default Genelist;