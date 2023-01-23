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
  const mdePreProcessingOptions = [
    {
      label: 'Preserve Neighbours',
      value: 'preserve_neighbors',
    },
    {
      label: 'Preserve Distances',
      value: 'preserve_distances',
    }
  ];
  const mdeConstraintOptions = [
    {
      label: 'Standardized',
      value: 'Standardized',
    },
    {
      label: 'Centered',
      value: 'Centered',
    },
    {
      label: 'None',
      value: 'None',
    }
  ];

  return (
    <>
      
      <Field label='Dimension Count'>
        <div className={styles.inputRange}>
            <Slider
            label={mdeSettings?.numcomponents}
            max={200}
            min={2}
            value={mdeSettings?.numcomponents}
            onChange={({ target: { value } }) => mdeSettingsChanged({
              settingName: MdeSettingsTypes.NUMBER_OF_COMPONENTS,
              newValue: value,
            })}
          />
        </div>
      </Field>
      <Field label='Preprocessing Method'>
        <Select
          onChange={({ target: { value } }) => mdeSettingsChanged({
            settingName: MdeSettingsTypes.PREPROCESSING_METHOD,
            newValue: value,
          })}
          options={mdePreProcessingOptions}
          value={mdeSettings?.preprocessingMethod}
        />
      </Field>
      <Field label='MDE Constraint'>
        <Select
          onChange={({ target: { value } }) => mdeSettingsChanged({
            settingName: MdeSettingsTypes.MDE_CONTRSAINT,
            newValue: value,
          })}
          options={mdeConstraintOptions}
          value={mdeSettings?.pyMdeConstraint}
        />
      </Field>
      <Field label='Repulsive Fraction'>
        <div className={styles.inputRange}>         
          <Slider
            label={mdeSettings?.repulsiveFraction}
            max={20}
            min={0}
            value={mdeSettings?.repulsiveFraction * 20}
            onChange={({ target: { value } }) => mdeSettingsChanged({
              settingName: MdeSettingsTypes.REPULSIVE_FRACTION,
              newValue: value / 20,
            })}
          />
        </div>
      </Field>
    </>
  );
};

const mapStateToProps = ({ settings }) => ({
  mdeSettings: settings?.mde ?? {},
});

const mapDispatchToProps = {
  mdeSettingsChanged,
};

const MainContainer = connect(mapStateToProps, mapDispatchToProps)(MdeSettings);

export { MainContainer as MdeSettings };
