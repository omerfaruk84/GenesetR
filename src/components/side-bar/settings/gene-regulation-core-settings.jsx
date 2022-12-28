import React from 'react';
import { connect } from 'react-redux';
import { Field, Select } from '@oliasoft-open-source/react-ui-library';
import InputRange from 'react-input-range';
import 'react-input-range/lib/css/index.css';
import styles from './settings.module.scss';

const GeneRegulationSettings = ({
  geneRegulationCoreSettings,
}) => {
  const geneOptions = [
    {
      label: 'SLC39A10',
      value: 'SLC39A10',
    }
  ];

  const onChangeGene = (evt) => {
    console.log(evt);
  }

  return (
    <>
      <Field label='Select a gene'>
        <Select
          onChange={onChangeGene}
          options={geneOptions}
          value={geneRegulationCoreSettings?.selectedGene}
        />
      </Field>
      <Field label='Absolute Z Score/Correlation r'>
        <div className={styles.inputRange}>
          <InputRange
            maxValue={1}
            minValue={0}
            value={geneRegulationCoreSettings?.absoluteZScore}
            onChange={value => console.log(value)}
          />
        </div>
      </Field>
    </>
  );
};

const mapStateToProps = ({ settings }) => ({
  geneRegulationCoreSettings: settings?.geneRegulationCore ?? {},
});

const mapDispatchToProps = {};

const MainContainer = connect(mapStateToProps, mapDispatchToProps)(GeneRegulationSettings);

export { MainContainer as GeneRegulationSettings };
