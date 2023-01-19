import React from 'react';
import { connect } from 'react-redux';
import { Field, Select, Spacer, Text, Slider, Flex } from '@oliasoft-open-source/react-ui-library';
import { umapSettingsChanged } from '../../../store/settings/umap-settings';
import { UmapSettingsTypes } from './enums';
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
          <Flex justifyContent="space-between">
            <Text>{2}</Text>
            <Text>{4}</Text>
          </Flex>
          <Slider
            label={umapSettings?.dimensionCount}
            max={4}
            min={2}
            value={umapSettings?.dimensionCount}
            onChange={({ target: { value } }) => umapSettingsChanged({
              settingName: UmapSettingsTypes.DIMENSION_COUNT,
              newValue: value,
            })}
          />
        </div>
      </Field>
      <Field label='Minimum Distance'>
        <div className={styles.inputRange}>
          <Flex justifyContent="space-between">
            <Text>{0}</Text>
            <Text>{0.99}</Text>
          </Flex>
          <Slider
            label={umapSettings?.minimumDistance}
            max={99}
            min={0}
            value={umapSettings?.minimumDistance * 100}
            onChange={({ target: { value } }) => umapSettingsChanged({
              settingName: UmapSettingsTypes.MINIMUM_DISTANCE,
              newValue: value / 100,
            })}
          />
        </div>
      </Field>
      <Field label='Number of Neighbours'>
        <div className={styles.inputRange}>
          <Flex justifyContent="space-between">
            <Text>{2}</Text>
            <Text>{200}</Text>
          </Flex>
          <Slider
            label={umapSettings?.numberOfNeighbours}
            max={200}
            min={2}
            value={umapSettings?.numberOfNeighbours}
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
});

const mapDispatchToProps = {
  umapSettingsChanged,
};

const MainContainer = connect(mapStateToProps, mapDispatchToProps)(UmapSettings);

export { MainContainer as UmapSettings };
