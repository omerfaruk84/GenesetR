import React from 'react';
import { connect } from 'react-redux';
import { Field, Select, TextArea, Text, Spacer } from '@oliasoft-open-source/react-ui-library';
import { graphmapSettingsChanged } from '../../../store/settings/graphmap-settings';


import { GraphmapSettingsTypes } from './enums';
import { useLocation } from 'react-router-dom';

const GraphMapSettings = ({
  graphmapSettings,
  graphmapSettingsChanged,module,SettingsSelector,
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


  const numberOfGenesEntered = graphmapSettings?.peturbationList
    ?.replaceAll(/\s+|,\s+|,/g, ';')
    ?.split(';')
    ?.reduce((prev, step) => step?.trim()?.length > 0 ? prev + 1 : prev, 0);

  const numberOfTargetsEntered = graphmapSettings?.targetGeneList
    ?.replaceAll(/\s+|,\s+|,/g, ';')
    ?.split(';')
    ?.reduce((prev, step) => step?.trim()?.length > 0 ? prev + 1 : prev, 0);

  return (
    <>
      <Field label='Cell Line'>
        <Select
          onChange={({ target: { value } }) => graphmapSettingsChanged({
            settingName: GraphmapSettingsTypes.CELL_LINE,
            newValue: value
          })}
          options={cellLineOptions}
          value={graphmapSettings?.cellLine}
        />
      </Field>
      <Field label='Data Type'>
        <Select
          onChange={({ target: { value } }) => graphmapSettingsChanged({
            settingName: GraphmapSettingsTypes.DATA_TYPE,
            newValue: value
          })}
          options={dataTypeOptions}
          value={graphmapSettings?.dataType}
        />
      </Field>
      <Field label='Perturbation list'>
        <TextArea
          placeholder='Please enter target list seperated by comma, new line, space, or semicolon!'
          tooltip='Please enter gene list seperated by comma, new line, space, or semicolon!'
          rows={10}
          resize='vertical'
          value={graphmapSettings?.peturbationList}
          onChange={({ target: { value } }) => graphmapSettingsChanged({
            settingName: GraphmapSettingsTypes.PETURBATION_LIST,
            newValue: value
          })}
        />
        <Spacer height={10} />
        <Text>{numberOfGenesEntered} sgRNAs</Text>
      </Field>

      <Field label='Perturbation list'>

      <TextArea
        placeholder="Please enter gene list seperated by comma, new line, space, or semicolon!"
        value={graphmapSettings?.targetGeneList}
        rows={10}
        onChange={({ target: { value } }) => graphmapSettingsChanged({
          settingName: GraphmapSettingsTypes.TARGET_LIST,
          newValue: value
        })}
      />
       <Spacer height={10} />
        <Text>{numberOfTargetsEntered} genes</Text>
      </Field>
    
      { (currGraph != "/heatmap" && currGraph != "/correlation" && currGraph != "/bi-clustering" && currGraph != "/pathfinder") ?
      <Field label='Graph Type'>
        <Select
          onChange={({ target: { value } }) => graphmapSettingsChanged({
            settingName: GraphmapSettingsTypes.GRAPH_TYPE,
            newValue: value
          })}
          options={graphTypeOptions}
          value={graphmapSettings?.graphType}
        />
      </Field>: null      
    }
    </>
  );
};

const mapStateToProps = ({ settings, calcResults }) => ({
  graphmapSettings: settings?.graphmap ?? {},
  currentGraph: calcResults?.currentGraph ?? null,
});

const mapDispatchToProps = {
  graphmapSettingsChanged,
};

const MainContainer = connect(mapStateToProps, mapDispatchToProps)(GraphMapSettings);

export { MainContainer as GraphMapSettings };
