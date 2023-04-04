import React from 'react';
import { connect } from 'react-redux';
import { Field, Slider } from '@oliasoft-open-source/react-ui-library';
import { pcaSettingsChanged } from '../../../store/settings/pca-settings';
import { PcaSettingsTypes } from './enums';
import styles from './settings.module.scss';

const PcaSettings = ({
  pcaSettings,
  pcaSettingsChanged,
}) => {
  return (
    <>
      <Field label='Number of components'>
        <div className={styles.inputRange}>         
          <Slider
            label={pcaSettings?.numberOfComponents}
            max={99}
            min={50}
            value={pcaSettings?.numberOfComponents}
            onChange={({ target: { value } }) => pcaSettingsChanged({
              settingName: PcaSettingsTypes.NUMBER_OF_COMPONENTS,
              newValue: value
            })}
          />
        </div>
      </Field>
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
