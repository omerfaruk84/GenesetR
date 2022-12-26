import React from 'react';
import { connect } from 'react-redux';
import { Field, Select, TextArea, Text, Spacer } from '@oliasoft-open-source/react-ui-library';

const CoreSettings = ({
  coreSettings,
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
      value: 'Perturbation',
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
  
  const onChangeCellLine = (evt) => {
    console.log(evt);
  };
  
  const onChangeDataType = (evt) => {
    console.log(evt);
  };

  const onChangeGraphType = (evt) => {
    console.log(evt);
  };

  console.log(coreSettings);

  return (
    <>
      <Field label='Cell Line'>
        <Select
          onChange={onChangeCellLine}
          options={cellLineOptions}
          value={coreSettings?.cellLine}
        />
      </Field>
      <Field label='Data Type'>
        <Select
          onChange={onChangeDataType}
          options={dataTypeOptions}
          value={coreSettings?.dataType}
        />
      </Field>
      <Field label='Perturbation list'>
        <TextArea
          placeholder='Please enter gene list seperated by comma, new line, space, or semicolon!'
          value={coreSettings?.peturbationList}
        />
        <Spacer height={10} />
        <Text>0 genes</Text>
      </Field>
      <Field label='Graph Type'>
        <Select
          onChange={onChangeGraphType}
          options={graphTypeOptions}
          value={coreSettings?.graphType}
        />
      </Field>
      <Field label='Highlight Genes'>
        <TextArea
          placeholder='Please enter gene list seperated by comma, new line, space, or semicolon!'
          value={coreSettings?.highlightGenes}
        />
      </Field>
    </>
  );
};

const mapStateToProps = ({
  settings
}) => ({
  coreSettings: settings?.core ?? {}
});

const mapDispatchToProps = {};

const MainContainer = connect(mapStateToProps, mapDispatchToProps)(CoreSettings);

export { MainContainer as CoreSettings };
