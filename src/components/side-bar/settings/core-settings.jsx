import React, {useCallback, useRef} from 'react';
import { connect } from 'react-redux';
import { Field, Select, Button, Spacer } from '@oliasoft-open-source/react-ui-library';
import { coreSettingsChanged } from '../../../store/settings/core-settings';
import { CoreSettingsTypes } from './enums';
import { useLocation } from 'react-router-dom';
import {Genelist}  from '../../genelist/index';
import {DatasetSelector} from '../../dataset-selector';
import { ROUTES } from '../../../common/routes';

const CoreSettings = ({
  coreSettings,tsneResults, umapResults, mdeResults,pcaResults,
  coreSettingsChanged,module,SettingsSelector,
  showcellLineOptions = true, 
  showPerturbationList = true, 
  showGeneList = true, 
  showdataTypeOptions = true,
  showgraphTypeOptions = true,
  isGeneSignature = false,
  geneListTitle = "Genes",
  perturbationListTitle = "Perturbations",

  
}) => {

  

  const childRef  = React.useRef();

 
  const cellLineOptions = [
    {
      label: 'K562-Whole Genome',
      value: 'K562gwps',
    },
    {
      label: 'K562-Essential',
      value: 'K562essential',
    },
    {
      label: 'RPE1-Essential',
      value: 'RPE1essential',
    }
  ];
  const dataTypeOptions = [
    {
      label: 'Perturbation',
      value: 'pert',
    },
    {
      label: 'Gene Expression',
      value: 'genes',
    }
  ];
  const graphTypeOptions = [
    {
      label: '2D',
      value: '2D',
    },
    {
      label: '3D',
      value: '3D',
    }
  ];

  var location = useLocation().pathname;
  const { pathname } = location;
  
  


   const setPerturbationList = useCallback((value) => {
    coreSettingsChanged({
      settingName: CoreSettingsTypes.PETURBATION_LIST,
      newValue: value
    })}, [coreSettingsChanged]);

    const setGeneList = useCallback((value) => {
      coreSettingsChanged({
        settingName:CoreSettingsTypes.TARGET_LIST,
        newValue: value
      })}, [coreSettingsChanged]);
    
   
    var graphData = undefined    
    if (coreSettings?.currentModule === "tsne") graphData = tsneResults;
    else if (coreSettings?.currentModule === "umap") graphData = umapResults;
    else if (coreSettings?.currentModule === "pca") graphData = pcaResults;
    else if (coreSettings?.currentModule === "mde") graphData = mdeResults;


  return (
    <> 
   
      <div style={{display:showcellLineOptions==true? "block": "none"}}>      

      <DatasetSelector 
        ref={childRef}
        onlyMain = {(pathname === ROUTES.CORRELATION || pathname === ROUTES.HEATMAP)}      
      />  <Spacer height={5}/>
      </div>
      {graphData? <>
      {console.log("graphData", graphData)}
      <Button colored="success" width = "100%" 
            label="ADD THIS TO DATASETS" 
            onClick={() => childRef?.current?.saveDataset(graphData.taskID, graphData.taskName, graphData.dataset, graphData.resultShape)}    
            small      
            /><Spacer height={10}/></>:""}

      
      <div style={{display:showdataTypeOptions===true? "block": "none"}}>   
      <Field label='Data Type' labelLeft labelWidth="80px" helpText="Datatype that analyzes will be performed on.">
        <Select
          onChange={({ target: { value } }) => coreSettingsChanged({
            settingName: CoreSettingsTypes.DATA_TYPE,
            newValue: value
          })}
          options={dataTypeOptions}
          value={coreSettings?.dataType}
        />
      </Field> 
      </div> 

     
      <div style={{display:showPerturbationList===true? "block": "none"}}>   
      <Genelist listTitle= {coreSettings?.dataType === "pert"?perturbationListTitle:geneListTitle}  setPerturbationList = {setPerturbationList} isPerturbationList =  {coreSettings?.dataType === "pert"}/>
      </div> 
    
      <div style={{display:showGeneList===true? "block": "none"}}>   
     <Genelist listTitle= {coreSettings?.dataType === "pert"?geneListTitle:perturbationListTitle}  setPerturbationList = {setGeneList} isPerturbationList = {!coreSettings?.dataType === "pert"} isGeneSignature ={isGeneSignature} />
     </div> 


    
      <div style={{display:showgraphTypeOptions===true? "block": "none"}}>   
      <Field label='Graph Type' labelLeft labelWidth="80px" helpText="Style of scatter graph.">
        <Select
          onChange={({ target: { value } }) => coreSettingsChanged({
            settingName: CoreSettingsTypes.GRAPH_TYPE,
            newValue: value
          })}
          options={graphTypeOptions}
          value={coreSettings?.graphType}
        />
      </Field> 
      </div> 
     
    </>
  );
};

const mapStateToProps = ({ settings, calcResults }) => ({
  coreSettings: settings?.core ?? {},
  currentGraph: calcResults?.currentGraph ?? null,
  tsneResults: calcResults?.["tsneGraph"]?.result ?? null,
  mdeResults: calcResults?.["mdeGraph"]?.result ?? null,
  pcaResults: calcResults?.["pcaGraph"]?.result ?? null,
  umapResults: calcResults?.["umapGraph"]?.result ?? null,
});

const mapDispatchToProps = {
  coreSettingsChanged,
};

const MainContainer = connect(mapStateToProps, mapDispatchToProps)(CoreSettings);

export { MainContainer as CoreSettings };
