import {Tree, Button} from "@oliasoft-open-source/react-ui-library";
import React, { useEffect, useRef, useState } from "react";
import { connect } from "react-redux";
import { FaTrash } from "react-icons/fa";

  
const DatasetSelector = () => {
    
    const [items, setItems] = useState([]);
    const [selectedCluster, setselectedCluster] = useState("");
    
    
    const  datalist = {
        name : 'Datasets',
        items,
    };
    console.log(datalist);

    function deleteItem (index){


    }

    function updateIndexes(){


    }

    function selectItem (index){



    }

    function addItem(name, details, parent){
        let currIndex = Math.max(...items.map((item) => item.id),-1) + 1;
        const newItem = {
            actions: [
              {
                icon: <FaTrash />,
                label: 'Delete',
                onClick: ({target: { active, parent, id } }) =>{console.log(parent, id, active)}
              }
            ],            
            id: currIndex,
            key : currIndex,
            name: name,
            parent: parent,
            details: details,
            active:false,            
            onClick: (evt) =>{console.log(evt)}
          }
          setItems([newItem].concat(items));
          console.log(items);
    }
    return (
      <>
         
          <Tree list= {datalist} onListReorder={setItems}/> 
          <Button label = "ADD" onClick = {()=>{addItem("AAA", "BBB",0 )}}/> 
        </>
    );
  };
  
  const mapStateToProps = ({ settings, calcResults }) => ({
    coreSettings: settings?.genesetEnrichment ?? {},
  });
  
  const mapDispatchToProps = {};
  
  const MainContainer = connect(
    mapStateToProps,
    mapDispatchToProps
  )(DatasetSelector);
  
  export { MainContainer as DatasetSelector };
  