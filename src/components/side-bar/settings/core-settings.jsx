import React from 'react';
import { connect } from 'react-redux';
import { Field, Select, TextArea, Text, Spacer } from '@oliasoft-open-source/react-ui-library';
import {
  cellLineChanged,
  dataTypeChanged,
  peturbationListChanged,
  graphTypeChanged,
  highlightGenesChanged,
} from '../../../store/settings/core-settings';

const CoreSettings = ({
  coreSettings,
  cellLineChanged,
  dataTypeChanged,
  peturbationListChanged,
  graphTypeChanged,
  highlightGenesChanged,
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

  const onChangeGraphType = (evt) => {
    console.log(evt);
  };

  return (
    <>
      <Field label='Cell Line'>
        <Select
          onChange={({ target: { value } }) => cellLineChanged({ value })}
          options={cellLineOptions}
          value={coreSettings?.cellLine}
        />
      </Field>
      <Field label='Data Type'>
        <Select
          onChange={({ target: { value } }) => dataTypeChanged({ value })}
          options={dataTypeOptions}
          value={coreSettings?.dataType}
        />
      </Field>
      <Field label='Perturbation list'>
        <TextArea
          placeholder='Please enter gene list seperated by comma, new line, space, or semicolon!'
          value={coreSettings?.peturbationList}
          onChange={({ target: { value } }) => peturbationListChanged({ value })}
        />
        <Spacer height={10} />
        <Text>0 genes</Text>
      </Field>
      <Field label='Graph Type'>
        <Select
          onChange={({ target: { value } }) => graphTypeChanged({ value })}
          options={graphTypeOptions}
          value={coreSettings?.graphType}
        />
      </Field>
      <Field label='Highlight Genes'>
        <TextArea
          placeholder='Please enter gene list seperated by comma, new line, space, or semicolon!'
          value={coreSettings?.highlightGenes}
          onChange={({ target: { value } }) => highlightGenesChanged({ value })}
        />
      </Field>
    </>
  );
};

const mapStateToProps = ({ settings }) => ({
  coreSettings: settings?.core ?? {},
});

const mapDispatchToProps = {
  cellLineChanged,
  dataTypeChanged,
  peturbationListChanged,
  graphTypeChanged,
  highlightGenesChanged,
};

const MainContainer = connect(mapStateToProps, mapDispatchToProps)(CoreSettings);

export { MainContainer as CoreSettings };
