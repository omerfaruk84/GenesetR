import React from 'react';
import { connect } from 'react-redux';
import { Field, Select, CheckBox } from '@oliasoft-open-source/react-ui-library';
import InputRange from 'react-input-range';
import { pcaSettingsChanged } from '../../../store/settings/pca-settings';
import { PcaSettingsTypes } from './enums';
import 'react-input-range/lib/css/index.css';
import styles from './settings.module.scss';

const PcaSettings = ({
  pcaSettings,
  pcaSettingsChanged,
}) => {
  return (
    <>      
      <Field label='Number of components'>
        <div className={styles.inputRange}>
          <InputRange
            maxValue={100}
            minValue={2}
            value={pcaSettings?.numberOfComponents}
            onChange={value => pcaSettingsChanged({
              settingName: PcaSettingsTypes.NUMBER_OF_COMPONENTS,
              newValue: value
            })}
          />
        </div>
      </Field>
      <CheckBox
        label='HDB Scan Clustering'
        onChange={({ target: { checked } }) => pcaSettingsChanged({
          settingName: PcaSettingsTypes.HDB_SCAN_CLUSTERING,
          newValue: checked
        })}
        checked={pcaSettings?.hdbScanClustering}
      />
    </>
  );
};

const mapStateToProps = ({ settings }) => ({
  pcaSettings: settings?.pca ?? {},
});

const mapDispatchToProps = {
  pcaSettingsChanged,
};

const MainContainer = connect(mapStateToProps, mapDispatchToProps)(PcaSettings);

export { MainContainer as PcaSettings };
