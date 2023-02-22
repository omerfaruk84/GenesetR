import React from 'react';
//import { connect } from 'react-redux';
import { Heading,Card,Field, Flex, Text, Popover, Input, InputGroup, Spacer, Select, TextArea, Button, Modal, Row,  } from "@oliasoft-open-source/react-ui-library";
import styles from './main-view.module.scss';
import { FaTrash, FaSave, FaWindowClose} from 'react-icons/fa';

const Genelist = (props) => {
    //Connect to indexdb and get genelists

    var db;
    const dbPromise = window.indexedDB.open('GeneListDB', 1);

    dbPromise.onerror = (event) => {
    console.error("Why didn't you allow my web app to use IndexedDB?!");
    };

    
    dbPromise.onsuccess = (event) => {
        console.log("Open suceeded", event.target.result)
     db = event.target.result;
    };
    
    // Create the object store and indexes when the database is first created
    dbPromise.onupgradeneeded = event => {
    var db = event.target.result;
    const genelistStore = db.createObjectStore('genelists', { autoIncrement : true });
    genelistStore.createIndex('name', 'name', { unique: true });
    genelistStore.createIndex('timestamp', 'timestamp', { unique: false });
    };

    // Insert a new genelist into the database
    const addGenelist = (genelist) => {
        console.log("Adding list:" , genelist)
    return new Promise((resolve, reject) => {
        console.log("Adding list 2:" , genelist)
      const transaction = db.transaction('genelists', 'readwrite');
      const genelistStore = transaction.objectStore('genelists');
      genelist.timestamp = Date.now(); // Add a timestamp to the genelist object
      const request = genelistStore.add(genelist);
      request.onsuccess = () => {
        console.log("Adding succeeded:" , genelistStore, db)
        resolve()    
    };
      request.onerror = () => reject();
        });
    };
  
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
      request.onsuccess = () => resolve();
      request.onerror = () => reject();
    });
  };

  
  const genelist = {
    name: 'My First Gene List',
    genes: "ABC"
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



    const genes = "";
    const numberOfGenesEntered = genes?.replaceAll(/\s+|,\s+|,/g, ';')
    ?.split(';')
    ?.reduce((prev, step) => step?.trim()?.length > 0 ? prev + 1 : prev, 0);

    const currentGeneLists = ["List1","List2"]

  return (
    <div className={styles.mainView}> 
    <Card heading={<Heading>Genelist</Heading>}>
     <Row spacing={0} width="100%" height="15%" >  
     <div className={styles.subItems}>  
    <Field label='Saved Lists' labelLeft labelWidth="80px" helpText="Your locally saved genelists" className={styles.mainView}>
        
        <Select
          //onChange={({ target: { value } }) => ()}
          
          options={currentGeneLists}
          value={currentGeneLists[0]}
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
            value={genes}
            // onChange={({ target: { value } }) => coreSettingsChanged({
            //    settingName: CoreSettingsTypes.PETURBATION_LIST,
            //    newValue: value
            //  })}
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
        disabled = {false}
        icon={<FaTrash />}
        label="DELETE" 
        onClick={() => getAllGenelists()
            .then(genelists => {
              console.log(genelists);
            })
            .catch(error => {
              console.error(error);
            })}       
        /> 

        <Popover content={<InputGroup>
            <Input value="Value" width="150px"/>
            <Button colored="success" label="Save"  icon={<FaSave />} disabled = {false} onClick={function Tl(){}}/>
            <Button label="Cancel" icon={<FaWindowClose />}  onClick={function Tl(){}}/></InputGroup>}>
            <Button colored label="SAVE LIST"  icon={<FaSave />} onClick={() =>addGenelist({genelist})
}/>
        </Popover>  
        </Flex>
        </div>
    </Row> 
    
    </Card> 
    </div>
  );
};


export default Genelist;