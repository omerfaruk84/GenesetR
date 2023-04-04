import {Tree, Button} from "@oliasoft-open-source/react-ui-library";
import React, { useEffect, useRef, useState } from "react";
import { connect } from "react-redux";
import { FaTrash } from "react-icons/fa";
import { coreSettingsChanged } from '../../store/settings/core-settings';
import { CoreSettingsTypes } from '../side-bar/settings/enums';
  
const DatasetSelector = ({items,setItems } ) => {
    
   
    return (
      <>
         
          <Tree list= {{items: items,name: "Datasets" } }/> 
          
        </>
    );
  };
  
 
  const mapStateToProps = ({ settings }) => ({    
    coreSettings: settings?.core ?? {},
  });
  
  const mapDispatchToProps = {coreSettingsChanged};
  
  const MainContainer = connect(
    mapStateToProps,
    mapDispatchToProps
  )(DatasetSelector);
  
  export { MainContainer as DatasetSelector };
  
  
  