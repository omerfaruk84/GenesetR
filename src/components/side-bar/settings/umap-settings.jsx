import React from 'react';
import { connect } from 'react-redux';
import { Field, Select, Slider } from '@oliasoft-open-source/react-ui-library';
import { umapSettingsChanged } from '../../../store/settings/umap-settings';
import { UmapSettingsTypes } from './enums';
import styles from './settings.module.scss';

const UmapSettings = ({
  umapSettings,coreSettings,
  umapSettingsChanged,
}) => {
  const umapMetricOptions = [
    {
      label: 'Euclidean',
      value: 'euclidean',
    },
    {
      label: 'Correlation',
      value: 'correlation',
    }
  ];

  return (
    <>     
      <Field label='Dimesion Count'>
        <div className={styles.inputRange}>
          <Slider
            label={umapSettings?.numcomponents}
            max={Math.min(200, coreSettings.cellLine[1]?.split(" ")[1])}
            min={3}
            value={umapSettings?.numcomponents}
            onChange={({ target: { value } }) => umapSettingsChanged({
              settingName: UmapSettingsTypes.NUMBER_OF_COMPONENTS,
              newValue: value,
            })}
          />
        </div>
      </Field>

      <Field label='Distance Metric'>
        <Select
          onChange={({ target: { value } }) => umapSettingsChanged({
            settingName: UmapSettingsTypes.METRIC,
            newValue: value
          })}
          options={umapMetricOptions}
          value={umapSettings?.metric}
        />
      </Field>


      <Field label='Minimum Distance'>
        <div className={styles.inputRange}>
          
          <Slider
            label={umapSettings?.min_dist}
            max={99}
            min={0}
            value={umapSettings?.min_dist * 100}
            onChange={({ target: { value } }) => umapSettingsChanged({
              settingName: UmapSettingsTypes.MINIMUM_DISTANCE,
              newValue: value / 100,
            })}
          />
        </div>
      </Field>

      <Field label='Number of Neighbours'>
        <div className={styles.inputRange}>
          
          <Slider
            label={umapSettings?.n_neighbors}
            max={200}
            min={2}
            value={umapSettings?.n_neighbors}
            onChange={({ target: { value } }) => umapSettingsChanged({
              settingName: UmapSettingsTypes.NUMBER_OF_NEIGHBOURS,
              newValue: value,
            })}
          />
        </div>
      </Field>
    </>
  );
};

const mapStateToProps = ({ settings }) => ({
  umapSettings: settings?.umap ?? {},
  coreSettings: settings?.core ?? {},

  
});

const mapDispatchToProps = {
  umapSettingsChanged,
};

const MainContainer = connect(mapStateToProps, mapDispatchToProps)(UmapSettings);

export { MainContainer as UmapSettings };
