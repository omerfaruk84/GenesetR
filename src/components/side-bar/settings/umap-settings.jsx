import React from 'react';
import { connect } from 'react-redux';
import { Field, Select, CheckBox, Spacer, Text } from '@oliasoft-open-source/react-ui-library';
import InputRange from 'react-input-range';
import { umapSettingsChanged } from '../../../store/settings/umap-settings';
import { UmapSettingsTypes } from './enums';
import 'react-input-range/lib/css/index.css';
import styles from './settings.module.scss';

const UmapSettings = ({
  umapSettings,
  umapSettingsChanged,
}) => {
  const umapSourceOptions = [
    {
      label: 'PCA Data',
      value: 'PCA Data',
    }
  ];

  return (
    <>
      <Field label='UMAP Source'>
        <Select
          onChange={({ target: { value } }) => umapSettingsChanged({
            settingName: UmapSettingsTypes.UMAP_SOURCE,
            newValue: value,
          })}
          options={umapSourceOptions}
          value={umapSettings?.umapSource}
        />
        <Spacer height={10} />
        <Text>You need to first perform PCA to use it in embeding!</Text>
      </Field>
      <Field label='Dimesion Count'>
        <div className={styles.inputRange}>
          <InputRange
            maxValue={4}
            minValue={2}
            value={umapSettings?.dimensionCount}
            onChange={(value) => umapSettingsChanged({
              settingName: UmapSettingsTypes.DIMENSION_COUNT,
              newValue: value,
            })}
          />
        </div>
      </Field>
      <Field label='Minimum Distance'>
        <div className={styles.inputRange}>
          <InputRange
            maxValue={0.99}
            minValue={0}
            value={umapSettings?.minimumDistance}
            onChange={value => console.log(value)}
          />
        </div>
      </Field>
      <Field label='Number of Neighbours'>
        <div className={styles.inputRange}>
          <InputRange
            maxValue={200}
            minValue={2}
            value={umapSettings?.numberOfNeighbours}
            onChange={(value) => umapSettingsChanged({
              settingName: UmapSettingsTypes.NUMBER_OF_NEIGHBOURS,
              newValue: value,
            })}
          />
        </div>
      </Field>
      <CheckBox
        label='HDB Scan Clustering'
        onChange={({ target: { checked } }) => umapSettingsChanged({
          settingName: UmapSettingsTypes.HDB_SCAN_CLUSTERING,
          newValue: checked,
        })}
        checked={umapSettings?.hdbScanClustering}
      />
    </>
  );
};

const mapStateToProps = ({ settings }) => ({
  umapSettings: settings?.umap ?? {},
});

const mapDispatchToProps = {
  umapSettingsChanged,
};

const MainContainer = connect(mapStateToProps, mapDispatchToProps)(UmapSettings);

export { MainContainer as UmapSettings };
