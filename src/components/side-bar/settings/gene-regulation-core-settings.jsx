import React from 'react';
import { connect } from 'react-redux';
import { Field, Select } from '@oliasoft-open-source/react-ui-library';
import InputRange from 'react-input-range';
import { geneRegulationCoreSettingsChanged } from '../../../store/settings/gene-regulation-core-settings';
import { GeneRegulationCoreSettingsTypes } from './enums';
import 'react-input-range/lib/css/index.css';
import styles from './settings.module.scss';

const GeneRegulationSettings = ({
  geneRegulationCoreSettings,
  geneRegulationCoreSettingsChanged,
}) => {
  const geneOptions = [
    {
      label: 'SLC39A10',
      value: 'SLC39A10',
    }
  ];

  return (
    <>
      <Field label='Select a gene'>
        <Select
          onChange={({ target: { value } }) => geneRegulationCoreSettingsChanged({
            settingName: GeneRegulationCoreSettingsTypes.SELECTED_GENE,
            newValue: value
          })}
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
            onChange={(value) => geneRegulationCoreSettingsChanged({
              settingName: GeneRegulationCoreSettingsTypes.ABSOLUTE_Z_SCORE,
              newValue: value
            })}
          />
        </div>
      </Field>
    </>
  );
};

const mapStateToProps = ({ settings }) => ({
  geneRegulationCoreSettings: settings?.geneRegulationCore ?? {},
});

const mapDispatchToProps = {
  geneRegulationCoreSettingsChanged,
};

const MainContainer = connect(mapStateToProps, mapDispatchToProps)(GeneRegulationSettings);

export { MainContainer as GeneRegulationSettings };
