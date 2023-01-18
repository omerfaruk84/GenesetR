import React from 'react';
import { connect } from 'react-redux';
import { Field, Select, Text, Spacer } from '@oliasoft-open-source/react-ui-library';
import InputRange from 'react-input-range';
import { tsneSettingsChanged } from '../../../store/settings/tsne-settings';
import { TsneSettingsTypes } from './enums';
import 'react-input-range/lib/css/index.css';
import styles from './settings.module.scss';

const TsneSettings = ({
  tsneSettings,
  tsneSettingsChanged,
}) => {
  const tsneSourceOptions = [
    {
      label: 'PCA Data',
      value: 'PCA Data',
    }
  ];

  return (
    <>
      <Field label='tSNE Source'>
        <Select
          onChange={({ target: { value } }) => tsneSettingsChanged({
            settingName: TsneSettingsTypes.TSNE_SOURCE,
            newValue: value,
          })}
          options={tsneSourceOptions}
          value={tsneSettings?.tsneSource}
        />
        <Spacer height={10} />
        <Text>You need to first perform PCA to use it in embeding!</Text>
      </Field>
      <Field label='Perplexity'>
        <div className={styles.inputRange}>
          <InputRange
            maxValue={300}
            minValue={1}
            value={tsneSettings?.perplexity}
            onChange={(value) => tsneSettingsChanged({
              settingName: TsneSettingsTypes.PERPLEXITY,
              newValue: value
            })}
          />
        </div>
      </Field>
      <Field label='Learning Rate'>
        <div className={styles.inputRange}>
          <InputRange
            maxValue={1000}
            minValue={10}
            value={tsneSettings?.learningRate}
            onChange={(value) => tsneSettingsChanged({
              settingName: TsneSettingsTypes.LEARNING_RATE,
              newValue: value
            })}
          />
        </div>
      </Field>
      <Field label='Number Of Iterations'>
        <div className={styles.inputRange}>
          <InputRange
            maxValue={5000}
            minValue={250}
            value={tsneSettings?.numberOfIterations}
            onChange={(value) => tsneSettingsChanged({
              settingName: TsneSettingsTypes.NUMBER_OF_ITERATIONS,
              newValue: value
            })}
          />
        </div>
      </Field>
      <Field label='Early Exaggeration %'>
        <div className={styles.inputRange}>
          <InputRange
            maxValue={25}
            minValue={1}
            value={tsneSettings?.earlyExaggeration}
            onChange={(value) => tsneSettingsChanged({
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
