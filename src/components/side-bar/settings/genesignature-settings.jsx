import React from 'react';
import {connect} from 'react-redux';
import { Field, Slider,CheckBox } from '@oliasoft-open-source/react-ui-library';
import { genesignatureSettingsChanged } from '../../../store/settings/gene-signature-settings';
import { GeneSignatureSettingsTypes } from './enums';
import styles from './settings.module.scss';

const GeneSignatureSettings = ({
  genesignatureSettings,
  genesignatureSettingsChanged,
}) => {

  return (
    <>
    <Field>             
      <CheckBox
        label="Filter Black Listed sgRNAs"
        onChange={({ target: { checked } }) => genesignatureSettingsChanged({
          settingName: GeneSignatureSettingsTypes.FILTER,
          newValue: checked
        })}
        checked={genesignatureSettings?.filter}/>
      </Field>

      <Field  labelLeft label='Filter Threshold'>
        <div className={styles.inputRange}>         
          <Slider
            disabled=  {!genesignatureSettings?.filter}
            label={genesignatureSettings?.filterBlackListed}
            max={100}
            min={24}
            value={genesignatureSettings?.filterBlackListed*20}
            onChange={({ target: { value } }) => genesignatureSettingsChanged({
              settingName: GeneSignatureSettingsTypes.FILTER_BLACKLISTED,
              newValue: value/20,
            })}
          />
        </div>
      </Field>
    </>
  );
};

const mapStateToProps = ({ settings }) => ({
  genesignatureSettings: settings?.genesignature ?? {}
});
const mapDispatchToProps = {
  genesignatureSettingsChanged,
};

const MainContainer = connect(mapStateToProps, mapDispatchToProps)(GeneSignatureSettings);
export { MainContainer as GeneSignatureSettings };
