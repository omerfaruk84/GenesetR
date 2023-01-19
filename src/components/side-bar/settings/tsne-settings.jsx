import React from 'react';
import { connect } from 'react-redux';
import { Field, Select, Text, Spacer, Slider, Flex } from '@oliasoft-open-source/react-ui-library';
import { tsneSettingsChanged } from '../../../store/settings/tsne-settings';
import { TsneSettingsTypes } from './enums';
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
          <Flex justifyContent="space-between">
            <Text>{1}</Text>
            <Text>{300}</Text>
          </Flex>
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
          <Flex justifyContent="space-between">
            <Text>{10}</Text>
            <Text>{1000}</Text>
          </Flex>
          <Slider
            label={tsneSettings?.learningRate}
            max={1000}
            min={10}
            value={tsneSettings?.learningRate}
            onChange={({ target: { value } }) => tsneSettingsChanged({
              settingName: TsneSettingsTypes.LEARNING_RATE,
              newValue: value
            })}
          />
        </div>
      </Field>
      <Field label='Number Of Iterations'>
        <div className={styles.inputRange}>
          <Flex justifyContent="space-between">
            <Text>{250}</Text>
            <Text>{5000}</Text>
          </Flex>
          <Slider
            label={tsneSettings?.numberOfIterations}
            max={5000}
            min={250}
            value={tsneSettings?.numberOfIterations}
            onChange={({ target: { value } }) => tsneSettingsChanged({
              settingName: TsneSettingsTypes.NUMBER_OF_ITERATIONS,
              newValue: value
            })}
          />
        </div>
      </Field>
      <Field label='Early Exaggeration %'>
        <div className={styles.inputRange}>
          <Flex justifyContent="space-between">
            <Text>{1}</Text>
            <Text>{25}</Text>
          </Flex>
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
