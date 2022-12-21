import React from 'react';
import { Field, Select, TextArea, Text } from '@oliasoft-open-source/react-ui-library';

const CoreSettings = () => {
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

  return (
    <>
      <Field label='Cell Line'>
        <Select
          onChange={onChangeCellLine}
          options={cellLineOptions}
        />
      </Field>
      <Field label='Data Type'>
        <Select
          onChange={onChangeDataType}
          options={dataTypeOptions}
        />
      </Field>
      <Field label='Perturbation list'>
        <TextArea
          placeholder='Please enter gene list seperated by comma, new line, space, or semicolon!'
        />
        <Text>0 genes</Text>
      </Field>
      <Field label='Graph Type'>
        <Select
          onChange={onChangeGraphType}
          options={graphTypeOptions}
        />
      </Field>
      <Field label='Highlight Genes'>
        <TextArea
          placeholder='Please enter gene list seperated by comma, new line, space, or semicolon!'
        />
      </Field>
    </>
  );
};

export { CoreSettings };
