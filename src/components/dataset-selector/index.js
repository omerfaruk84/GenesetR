import {Tree, Button} from "@oliasoft-open-source/react-ui-library";
import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef  } from "react";
import { connect } from "react-redux";
import { FaTrash } from "react-icons/fa";
import { coreSettingsChanged } from '../../store/settings/core-settings';
import { CoreSettingsTypes } from '../side-bar/settings/enums';
import { string } from "prop-types";
import styles from './AccordionMenu.scss';
import { get, set} from "idb-keyval";
import Axios from 'axios';
import { ROUTES } from '../../common/routes';
import { useLocation } from 'react-router-dom';

const DatasetSelector = forwardRef(({ coreSettingsChanged , coreSettings}, ref, onlyMain) => {

    
  const [datasetList, setDatasetList] = useState([{
    droppable: true,
    id: 'K562gwps',
    name: 'K562 Whole Genome',
    onClick: () => updateActivityById('K562gwps'),    
    parent: 0,
    active: true,
    resultShape:"11258 8248"
  }, {
    droppable: true,
    id: 'K562essential',
    name: 'K562 Essential',
    //details: 'Main',
    onClick: () => updateActivityById('K562essential'),
    parent: 0,
    active: false,
    resultShape:"2285 8563"
  },{
    droppable: true,
    id: 'RPE1essential',
    name: 'RPE1 Essential',
    onClick: () => updateActivityById('RPE1essential'),
    parent: 0,
    active: false,
    resultShape:"2679 8749"

  }])

  const location = useLocation();
  const { pathname } = location;
  React.useEffect(() => {
    console.log('URL changed:', location.pathname);
    // Add any other logic you want to handle on URL change
  }, [location]); // useEffect dependency on location will cause this effect to run every time the location (URL) changes

  
  const updateActivityById  = (id) => { 

     let dataShape = ""
       setDatasetList(prevDatasetList => {     
     const arr = []
     for(const e in prevDatasetList){    
       var itemx = prevDatasetList[e]
       console.log(itemx)
       var actionsNew =[]
       if(itemx?.actions!== undefined && itemx.id.length>17){
       actionsNew = [{
         icon:itemx?.actions[0]?.icon,
         label: itemx?.actions[0]?.label,
         onClick: ((id) => () => deleteItemAndChildren(id))(itemx.id),
       }]}
       var newItem = {      
         droppable: false,
         id: itemx.id,
         name: itemx?.name,
         resultShape: itemx?.resultShape,
         parent: itemx?.parent,
         onClick: ((id) => () => updateActivityById(id))(itemx.id),
         actions: actionsNew, 
         active : itemx?.id===id,
       }
       if(itemx?.id===id)
          dataShape = itemx?.resultShape
     
       arr.push(newItem)    
    }

    coreSettingsChanged({settingName: CoreSettingsTypes.CELL_LINE, newValue: [id,dataShape]})   
    return arr;
  });
    
  
   //coreSettingsChanged({settingName: CoreSettingsTypes.DATASETLIST, newValue: arr})
   
   }   


 const deleteItemAndChildren =(id) => { 
   
   let parent = "";


   datasetList.forEach((item, index) => {
     if (item.id.toString() === id) {
       parent = [item.parent, item?.resultShape]
     }
   });

   let arr = deleteItemAndChildrenHelper(id)
   

   setDatasetList(arr)

   coreSettingsChanged({
     settingName: CoreSettingsTypes.CELL_LINE,
     newValue: parent
   })
 
 }

 function deleteItemAndChildrenHelper (id, ds = datasetList) {  
   let arr =  [...ds];     
 
   arr.forEach((item, index) => {
     if (item.id.toString() === id) {       
       
       arr.splice(index, 1); // remove the item
       // recursively delete its children
       arr.filter(child => child.parent.toString() === id).forEach(child => deleteItemAndChildrenHelper(child.id.toString(), arr));
     }
   });
    return arr;  
 }

 useImperativeHandle(ref, () => ({
  saveDataset: (newID, name, parentID, dataShape) => {
  
  setDatasetList(prevDatasetList => {    
  let arr =  [];

  for( var e in prevDatasetList){    
    var itemx = prevDatasetList[e]
    if(itemx.id===newID) continue;  

    var actionsNew =[]
    if(itemx?.actions && itemx.id.toString().length>17){
    actionsNew = [{
      icon: <FaTrash />,
      label: 'Delete',
      onClick: ((id) => () => deleteItemAndChildren(id))(itemx.id),
    }]}
    var newItem = {    
      resultShape: itemx?.resultShape,
      droppable: false,
      isOpen: itemx.id ===parentID,
      id: itemx.id,
      name: itemx?.name,
      parent: itemx?.parent,
      onClick: ((id) => () => updateActivityById(id))(itemx.id),
      actions: actionsNew, 
      active : false,
    }
    arr.push(newItem)    
 }
  
  var newItem = {    
    resultShape: dataShape,  
    droppable: false,
    isOpen:true,
    id: newID,
    name: name,
    parent: parentID,
    onClick: ((id) => () => updateActivityById(id))(newID),
    actions: [
      {
        icon: <FaTrash />,
        label: 'Delete',
        onClick: ((id) => () => deleteItemAndChildren(id))(newID)       
      }
    ],
    active : true,
  }
  arr.push(newItem) 
    //Save the settings
  coreSettingsChanged({settingName: CoreSettingsTypes.CELL_LINE, newValue: [newID,dataShape] })

  return arr;
  });

    },
}));

const getData = async(dataType) =>{ 
  //if already exists in db return and dont do anything
  //else download it and save it
  get("geneList_" + dataType + "_perturb").then((val) => {
   if (val && val.size>0) 
     return;
   else
   {
     Axios.post("https://genesetr.uio.no/api/getData", 
    // Axios.post("https://localhost:8443/getData", 
     {
      headers: {
        'ngrok-skip-browser-warning': '69420',
      },
       body: JSON.stringify({
         dataset: dataType,
         request: 'getAllGenes'
       }),
     })
       .then(response => 
         {
         if(response && response.data) {
           //console.log(response.data.result.columns)           
           set("geneList_" + dataType + "_perturb", new Set(response.data.result.perturbations));
           set("geneList_" + dataType + "_genes", new Set(response.data.result.genes));
         }
         });      
   }}); 
}

useEffect(() => { 
  //console.log(coreSettings.cellLine
  getData(coreSettings.cellLine[0])  
}, [coreSettings.cellLine]);

useEffect(() => { 
  if (location.pathname === ROUTES.CORRELATION || location.pathname === ROUTES.HEATMAP){
    if(coreSettings.cellLine[0].length>17)
      updateActivityById('K562gwps')
 }
  
}, [location.pathname]);

    return (
      <>   
       <div className={styles._itemHeader_1fhdv_401} style= {{ border: '1px solid black' }}>   
          <Tree list= {{items:  (location.pathname === ROUTES.CORRELATION || location.pathname === ROUTES.HEATMAP)?datasetList.filter((x)=>x.id.length<17): datasetList,name: "Dataset Selection" } }/> 
       </div>        
      </>
    );
  });
  
 
  const mapStateToProps = ({ settings }) => ({    
    coreSettings: settings?.core ?? {},
  });
  
  const mapDispatchToProps = {coreSettingsChanged};
  
  const MainContainer = connect(
    mapStateToProps,
    mapDispatchToProps,null, {forwardRef: true}
  )(DatasetSelector);
  
  export { MainContainer as DatasetSelector };
  
  
  