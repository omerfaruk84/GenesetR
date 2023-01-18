import React from 'react';
import { connect } from 'react-redux';
import { Field, Select, CheckBox, Text, Spacer } from '@oliasoft-open-source/react-ui-library';
import InputRange from 'react-input-range';
import { embeddingSettingsChanged } from '../../../store/settings/embedding-settings';
import { EmbeddingSettingsTypes } from './enums';
import 'react-input-range/lib/css/index.css';
import styles from './settings.module.scss';

const EmbeddingSettings = ({
  embeddingSettings,
  embeddingSettingsChanged,
}) => {
  const embedingSourceOptions = [
    {
      label: 'PCA Data',
      value: 'PCA Data',
    }
  ];
  const mdeConstraintOptions = [
    {
      label: 'Standardized',
      value: 'Standardized',
    }
  ];

  return (
    <>
      <Field label='Embeding Source'>
        <Select
          onChange={({ target: { value } }) => embeddingSettingsChanged({
            settingName: EmbeddingSettingsTypes.EMBEDDING_SOURCE,
            newValue: value,
          })}
          options={embedingSourceOptions}
          value={embeddingSettings?.embedingSource}
        />
        <Spacer height={10} />
        <Text>You need to first perform PCA to use it in embeding!</Text>
      </Field>
      <Field label='Dimension Count'>
        <div className={styles.inputRange}>
          <InputRange
            maxValue={4}
            minValue={2}
            value={embeddingSettings?.dimensionCount}
            onChange={(value) => embeddingSettingsChanged({
              settingName: EmbeddingSettingsTypes.DIMENSION_COUNT,
              newValue: value,
            })}
          />
        </div>
      </Field>
      <Field label='MDE Constraint'>
        <Select
          onChange={({ target: { value } }) => embeddingSettingsChanged({
            settingName: EmbeddingSettingsTypes.MDE_CONTRSAINT,
            newValue: value,
          })}
          options={mdeConstraintOptions}
          value={embeddingSettings?.mdeContrsaint}
        />
      </Field>
      <Field label='Repulsive Fraction'>
        <div className={styles.inputRange}>
          <InputRange
            maxValue={5}
            minValue={0.1}
            value={embeddingSettings?.repulsiveFraction}
            onChange={(value) => embeddingSettingsChanged({
              settingName: EmbeddingSettingsTypes.REPULSIVE_FRACTION,
              newValue: value,
            })}
          />
        </div>
      </Field>
    </>
  );
};

const mapStateToProps = ({ settings }) => ({
  embeddingSettings: settings?.embedding ?? {},
});

const mapDispatchToProps = {
  embeddingSettingsChanged,
};

const MainContainer = connect(mapStateToProps, mapDispatchToProps)(EmbeddingSettings);

export { MainContainer as EmbeddingSettings };
