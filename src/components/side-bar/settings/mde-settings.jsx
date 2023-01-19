import React from 'react';
import { connect } from 'react-redux';
import { Field, Select, Text, Spacer, Slider, Flex } from '@oliasoft-open-source/react-ui-library';
import { mdeSettingsChanged } from '../../../store/settings/mde-settings';
import { MdeSettingsTypes } from './enums';
import styles from './settings.module.scss';

const MdeSettings = ({
  mdeSettings,
  mdeSettingsChanged,
}) => {
  const mdeSourceOptions = [
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
          onChange={({ target: { value } }) => mdeSettingsChanged({
            settingName: MdeSettingsTypes.EMBEDDING_SOURCE,
            newValue: value,
          })}
          options={mdeSourceOptions}
          value={mdeSettings?.mdeSource}
        />
        <Spacer height={10} />
        <Text>You need to first perform PCA to use it in embeding!</Text>
      </Field>
      <Field label='Dimension Count'>
        <div className={styles.inputRange}>
          <Flex justifyContent="space-between">
            <Text>{2}</Text>
            <Text>{4}</Text>
          </Flex>
          <Slider
            label={mdeSettings?.dimensionCount}
            max={4}
            min={2}
            value={mdeSettings?.dimensionCount}
            onChange={({ target: { value } }) => mdeSettingsChanged({
              settingName: MdeSettingsTypes.DIMENSION_COUNT,
              newValue: value,
            })}
          />
        </div>
      </Field>
      <Field label='MDE Constraint'>
        <Select
          onChange={({ target: { value } }) => mdeSettingsChanged({
            settingName: MdeSettingsTypes.MDE_CONTRSAINT,
            newValue: value,
          })}
          options={mdeConstraintOptions}
          value={mdeSettings?.mdeContrsaint}
        />
      </Field>
      <Field label='Repulsive Fraction'>
        <div className={styles.inputRange}>
          <Flex justifyContent="space-between">
            <Text>{0.1}</Text>
            <Text>{5}</Text>
          </Flex>
          <Slider
            label={mdeSettings?.repulsiveFraction}
            max={50}
            min={1}
            value={mdeSettings?.repulsiveFraction * 10}
            onChange={({ target: { value } }) => mdeSettingsChanged({
              settingName: MdeSettingsTypes.REPULSIVE_FRACTION,
              newValue: value / 10,
            })}
          />
        </div>
      </Field>
    </>
  );
};

const mapStateToProps = ({ settings }) => ({
  mdeSettings: settings?.embedding ?? {},
});

const mapDispatchToProps = {
  mdeSettingsChanged,
};

const MainContainer = connect(mapStateToProps, mapDispatchToProps)(MdeSettings);

export { MainContainer as MdeSettings };
