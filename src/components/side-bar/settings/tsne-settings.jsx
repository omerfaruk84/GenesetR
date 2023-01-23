import React from 'react';
import { connect } from 'react-redux';
import { Field, Select, Slider } from '@oliasoft-open-source/react-ui-library';
import { tsneSettingsChanged } from '../../../store/settings/tsne-settings';
import { TsneSettingsTypes } from './enums';
import styles from './settings.module.scss';

const TsneSettings = ({
  tsneSettings,
  tsneSettingsChanged,
}) => {
  const tsneMetricOptions = [
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
            label={tsneSettings?.numcomponents}
            max={100}
            min={2}
            value={tsneSettings?.numcomponents}
            onChange={({ target: { value } }) =>tsneSettingsChanged({
              settingName: TsneSettingsTypes.NUMBER_OF_COMPONENTS,
              newValue: value,
            })}
          />
        </div>
      </Field>

      <Field label='Distance Metric'>
        <Select
          onChange={({ target: { value } }) =>tsneSettingsChanged({
            settingName: TsneSettingsTypes.METRIC,
            newValue: value
          })}
          options={tsneMetricOptions}
          value={tsneSettings?.metric}
        />
      </Field>

      <Field label='Perplexity'>
        <div className={styles.inputRange}>          
          <Slider
            label={tsneSettings?.perplexity}
            max={300}
            min={1}
            value={tsneSettings?.perplexity}
            onChange={({ target: { value } }) => tsneSettingsChanged({
              settingName: TsneSettingsTypes.PERPLEXITY,
              newValue: value
            })}
          />
        </div>
      </Field>

      <Field label='Learning Rate'>
        <div className={styles.inputRange}>          
          <Slider
            label={tsneSettings?.learning_rate}
            max={1000}
            min={10}
            value={tsneSettings?.learning_rate}
            onChange={({ target: { value } }) => tsneSettingsChanged({
              settingName: TsneSettingsTypes.LEARNING_RATE,
              newValue: value
            })}
          />
        </div>
      </Field>

      <Field label='Number Of Iterations'>
        <div className={styles.inputRange}>         
          <Slider
            label={tsneSettings?.n_iter}
            max={5000}
            min={250}
            value={tsneSettings?.n_iter}
            onChange={({ target: { value } }) => tsneSettingsChanged({
              settingName: TsneSettingsTypes.NUMBER_OF_ITERATIONS,
              newValue: value
            })}
          />
        </div>
      </Field>
      <Field label='Early Exaggeration %'>
        <div className={styles.inputRange}>
          <Slider
            label={tsneSettings?.earlyExaggeration}
            max={25}
            min={1}
            value={tsneSettings?.earlyExaggeration}
            onChange={({ target: { value } }) => tsneSettingsChanged({
              settingName: TsneSettingsTypes.EARLY_EXAGGERATION,
              newValue: value
            })}
          />
        </div>
      </Field>
    </>
  );
};

const mapStateToProps = ({ settings }) => ({
  tsneSettings: settings?.tsne ?? {},
});

const mapDispatchToProps = {
  tsneSettingsChanged,
};

const MainContainer = connect(mapStateToProps, mapDispatchToProps)(TsneSettings);

export { MainContainer as TsneSettings };
