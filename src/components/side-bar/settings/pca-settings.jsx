import React from 'react';
import { connect } from 'react-redux';
import { Field, Select, CheckBox } from '@oliasoft-open-source/react-ui-library';
import InputRange from 'react-input-range';
import { pcaSourceChanged, numberOfComponentsChanged, hdbScanClusteringChanged } from '../../../store/settings/pca-settings';
import 'react-input-range/lib/css/index.css';
import styles from './settings.module.scss';

const PcaSettings = ({
  pcaSettings,
  pcaSourceChanged,
  numberOfComponentsChanged,
  hdbScanClusteringChanged,
}) => {
  const pcaSourceOptions = [
    {
      label: 'Correlation Data',
      value: 2,
    },
    {
      label: 'Perturbation',
      value: 1,
    }
  ];

  return (
    <>
      <Field label='PCA Source'>
        <Select
          onChange={({ target: { value } }) => pcaSourceChanged({ value })}
          options={pcaSourceOptions}
          value={pcaSettings?.pcaSource}
        />
      </Field>
      <Field label='Number of components'>
        <div className={styles.inputRange}>
          <InputRange
            maxValue={100}
            minValue={2}
            value={pcaSettings?.numberOfComponents}
            onChange={value => numberOfComponentsChanged({ value })}
          />
        </div>
      </Field>
      <CheckBox
        label='HDB Scan Clustering'
        onChange={({ target: { checked } }) => hdbScanClusteringChanged({ value: checked })}
        checked={pcaSettings?.hdbScanClustering}
      />
    </>
  );
};

const mapStateToProps = ({ settings }) => ({
  pcaSettings: settings?.pca ?? {},
});

const mapDispatchToProps = {
  pcaSourceChanged,
  numberOfComponentsChanged,
  hdbScanClusteringChanged,
};

const MainContainer = connect(mapStateToProps, mapDispatchToProps)(PcaSettings);

export { MainContainer as PcaSettings };
