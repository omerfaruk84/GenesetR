import React from 'react';
import { connect } from 'react-redux';
import { Field, Select, TextArea, Text, Spacer } from '@oliasoft-open-source/react-ui-library';
import { coreSettingsChanged } from '../../../store/settings/core-settings';
import { CoreSettingsTypes } from './enums';
import { useLocation } from 'react-router-dom';
import Genelist  from '../../genelist/index';


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

  return (
    <>

      <Genelist genes = {["ATF4","ATF2"]}/>
      <Field label='Cell Line' labelLeft labelWidth="80px" helpText="Repulsion is what">
        <Select
          onChange={({ target: { value } }) => coreSettingsChanged({
            settingName: CoreSettingsTypes.CELL_LINE,
            newValue: value
          })}
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
      <Field label='Perturbation list'>
        <TextArea
          placeholder='Please enter target list seperated by comma, new line, space, or semicolon!'
          tooltip='Please enter gene list seperated by comma, new line, space, or semicolon!'
          rows={10}
          resize='vertical'
          value={coreSettings?.peturbationList}
          onChange={({ target: { value } }) => coreSettingsChanged({
            settingName: CoreSettingsTypes.PETURBATION_LIST,
            newValue: value
          })}
        />
        <Spacer height={10} />
        <Text>{numberOfGenesEntered} sgRNAs</Text>
      </Field>

      <Field label='Perturbation list'>

      <TextArea
        placeholder="Please enter gene list seperated by comma, new line, space, or semicolon!"
        value={coreSettings?.targetGeneList}
        rows={10}
        onChange={({ target: { value } }) => coreSettingsChanged({
          settingName: CoreSettingsTypes.TARGET_LIST,
          newValue: value
        })}
      />
       <Spacer height={10} />
        <Text>{numberOfTargetsEntered} genes</Text>
      </Field>
    
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
