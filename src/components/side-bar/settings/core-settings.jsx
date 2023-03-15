import React, {useCallback} from 'react';
import { connect } from 'react-redux';
import { Field, Select, TextArea, Text, Spacer } from '@oliasoft-open-source/react-ui-library';
import { coreSettingsChanged } from '../../../store/settings/core-settings';
import { CoreSettingsTypes } from './enums';
import { useLocation } from 'react-router-dom';
import {Genelist}  from '../../genelist/index';
import {DatasetSelector} from '../../dataset-selector';
import Axios from 'axios';
import { get, set, del} from "idb-keyval";

const CoreSettings = ({
  coreSettings,
  coreSettingsChanged,module,SettingsSelector,
}) => {
 
  const cellLineOptions = [
    {
      label: 'K562-Whole Genome',
      value: 1,
    },
    {
      label: 'K562-Essential',
      value: 2,
    },
    {
      label: 'RPE1-Essential',
      value: 3,
    }
  ];
  const dataTypeOptions = [
    {
      label: 'Perturbation',
      value: 1,
    },
    {
      label: 'Gene Expression',
      value: 2,
    },
    {
      label: 'Perturbation Correlation',
      value: 3,
    },
    {
      label: 'Expression Correlation',
      value: 4,
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

  var currGraph = useLocation().pathname;


  const numberOfGenesEntered = coreSettings?.peturbationList
    ?.replaceAll(/\s+|,\s+|,/g, ';')
    ?.split(';')
    ?.reduce((prev, step) => step?.trim()?.length > 0 ? prev + 1 : prev, 0);

  const numberOfTargetsEntered = coreSettings?.targetGeneList
    ?.replaceAll(/\s+|,\s+|,/g, ';')
    ?.split(';')
    ?.reduce((prev, step) => step?.trim()?.length > 0 ? prev + 1 : prev, 0);

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
    
    const getData = async(dataType) =>{ 
       //if already exists in db return and dont do anything
       //else download it and save it
       get("geneList_" + dataType + "_perturb").then((val) => {
        console.log("val in core set", val);
        if (val && val.size>0) 

          return;
        else
        {
          Axios.post("https://318d-2001-700-100-400a-00-f-f95c.eu.ngrok.io/getData", 
          {
            body: JSON.stringify({
              dataset: dataType,
              request: 'getAllGenes'
            }),
          })
            .then(response => 
              {
              if(response && response.data) {
                //console.log(response.data.result.columns)           
                set("geneList_" + dataType + "_perturb", new Set(response.data.result.rows));
                set("geneList_" + dataType + "_genes", new Set(response.data.result.columns));
              }
              });      
        }});      
           
    }

  return (
    <>
      <DatasetSelector> </DatasetSelector>
      
      <Field label='Cell Line' labelLeft labelWidth="80px" helpText="Repulsion is what">
        <Select
          onChange={({ target: { value} }) =>           
          {coreSettingsChanged({
            settingName: CoreSettingsTypes.CELL_LINE,
            newValue: value
          })
          //Download perturbations and save them to indexdb
          getData(value);
          }
        
          }
          options={cellLineOptions}
          value={coreSettings?.cellLine}
        />
      </Field>


      <Field label='Data Type' labelLeft labelWidth="80px" helpText="Repulsion is what">
        <Select
          onChange={({ target: { value } }) => coreSettingsChanged({
            settingName: CoreSettingsTypes.DATA_TYPE,
            newValue: value
          })}
          options={dataTypeOptions}
          value={coreSettings?.dataType}
        />
      </Field>   


      <Genelist setPerturbationList = {setPerturbationList} isPerturbationList =  {true}/>
      <Genelist setPerturbationList = {setGeneList} isPerturbationList = {false} />

    
      { (currGraph != "/heatmap" && currGraph != "/correlation" && currGraph != "/bi-clustering" && currGraph != "/pathfinder") ?
      <Field label='Graph Type' labelLeft labelWidth="80px" helpText="Repulsion is what">
        <Select
          onChange={({ target: { value } }) => coreSettingsChanged({
            settingName: CoreSettingsTypes.GRAPH_TYPE,
            newValue: value
          })}
          options={graphTypeOptions}
          value={coreSettings?.graphType}
        />
      </Field>: null      
    }
    </>
  );
};

const mapStateToProps = ({ settings, calcResults }) => ({
  coreSettings: settings?.core ?? {},
  currentGraph: calcResults?.currentGraph ?? null,
});

const mapDispatchToProps = {
  coreSettingsChanged,
};

const MainContainer = connect(mapStateToProps, mapDispatchToProps)(CoreSettings);

export { MainContainer as CoreSettings };
