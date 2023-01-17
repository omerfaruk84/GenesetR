import React from 'react';
import { connect } from 'react-redux';
import { Field, Select, TextArea, Text, Spacer } from '@oliasoft-open-source/react-ui-library';
import { coreSettingsChanged } from '../../../store/settings/core-settings';
import { CoreSettingsTypes } from './enums';

const CoreSettings = ({
  coreSettings,
  coreSettingsChanged,
}) => {
  const cellLineOptions = [
    {
      label: 'K562-Whole Gensome',
      value: 'K562-Whole Gensome',
    }
  ];
  const dataTypeOptions = [
    {
      label: 'Perturbation',
      value: 1,
    },
    {
      label: 'Correlation data',
      value: 2,
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

  const numberOfGenesEntered = coreSettings?.peturbationList
    ?.replaceAll('\n', ';')
    ?.split(';')
    ?.reduce((prev, step) => step?.trim()?.length > 0 ? prev + 1 : prev, 0);

  return (
    <>
      <Field label='Cell Line'>
        <Select
          onChange={({ target: { value } }) => coreSettingsChanged({
            settingName: CoreSettingsTypes.CELL_LINE,
            newValue: value
          })}
          options={cellLineOptions}
          value={coreSettings?.cellLine}
        />
      </Field>
      <Field label='Data Type'>
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
          placeholder='Please enter gene list seperated by comma, new line, space, or semicolon!'
          value={coreSettings?.peturbationList}
          onChange={({ target: { value } }) => coreSettingsChanged({
            settingName: CoreSettingsTypes.PETURBATION_LIST,
            newValue: value
          })}
        />
        <Spacer height={10} />
        <Text>{numberOfGenesEntered} genes</Text>
      </Field>
      <Field label='Graph Type'>
        <Select
          onChange={({ target: { value } }) => coreSettingsChanged({
            settingName: CoreSettingsTypes.GRAPH_TYPE,
            newValue: value
          })}
          options={graphTypeOptions}
          value={coreSettings?.graphType}
        />
      </Field>
      <Field label='Highlight Genes'>
        <TextArea
          placeholder='Please enter gene list seperated by comma, new line, space, or semicolon!'
          value={coreSettings?.highlightGenes}
          onChange={({ target: { value } }) => coreSettingsChanged({
            settingName: CoreSettingsTypes.HIGHLIGHT_GENES,
            newValue: value
          })}
        />
      </Field>
    </>
  );
};

const mapStateToProps = ({ settings }) => ({
  coreSettings: settings?.core ?? {},
});

const mapDispatchToProps = {
  coreSettingsChanged,
};

const MainContainer = connect(mapStateToProps, mapDispatchToProps)(CoreSettings);

export { MainContainer as CoreSettings };
