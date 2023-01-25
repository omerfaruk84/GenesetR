import React from 'react';
import { connect } from 'react-redux';
import { Field, Slider, TextArea, CheckBox } from '@oliasoft-open-source/react-ui-library';
import { PathFinderSettingsTypes } from './enums';
import { pathfinderSettingsChanged } from '../../../store/settings/pathfinder-settings';
import styles from './settings.module.scss';

const PathFinderSettings = ({
  pathfinderSettings,
  pathfinderSettingsChanged,
}) => {
 

  return (
    <>
      <Field label='Upregulated Genes'>
        <TextArea
          onChange={({ target: { value } }) => pathfinderSettingsChanged({ 
            settingName: PathFinderSettingsTypes.UPREGULATED_GENES,
            newValue: value
           })}
          placeholder=""
          value={pathfinderSettings?.upgeneList}
          rows = {10}
        />
      </Field>
      <Field label='Z Score Cutoff'>
        <div className={styles.inputRange}>         
          <Slider
            label={pathfinderSettings?.cutoff}
            max={40}
            min={0}
            value={pathfinderSettings?.cutoff * 20}
            onChange={({ target: { value } }) => pathfinderSettingsChanged({
              settingName: PathFinderSettingsTypes.CUTOFF,
              newValue: value / 20,
            })}
          />
        </div>
      </Field>

      <Field label='Search Depth'>
          <Slider
            label={pathfinderSettings?.depth}
            max={3}
            min={1}
            value={pathfinderSettings?.depth}
            onChange={({ target: { value } }) => pathfinderSettingsChanged({
              settingName: PathFinderSettingsTypes.DEPTH,
              newValue: value,
            })}
          />
      </Field>
      
      <Field>
        <CheckBox
          onChange={({ target: { checked } }) => pathfinderSettingsChanged({ 
            settingName: PathFinderSettingsTypes.CHECK_CORR,
            newValue: checked,
           
           })}
           checked={pathfinderSettings?.checkCorr}
           label=  'Check Correlation'
        />
      </Field>
      
      <Field label='Correlation Cutoff'>
        <div className={styles.inputRange}>         
          <Slider
            label={pathfinderSettings?.corrCutOff}
            max={10}
            min={2}
            value={pathfinderSettings?.corrCutOff * 20}
            onChange={({ target: { value } }) => pathfinderSettingsChanged({
              settingName: PathFinderSettingsTypes.CORR_CUTOFF,
              newValue: value / 20,
            })}
          />
        </div>
      </Field>

      <Field>
        <CheckBox
          onChange={({ target: { checked } }) => pathfinderSettingsChanged({ 
            settingName: PathFinderSettingsTypes.CHECK_BIOGRID,
            newValue: checked,
            
           })}
           checked={pathfinderSettings?.BioGridData}
           label= 'Check Biogrid'
        />
      </Field>

    </>
  );
};


const mapStateToProps = ({ settings }) => ({
  pathfinderSettings: settings?.pathfinder ?? {},
});

const mapDispatchToProps = {
  pathfinderSettingsChanged,
};

const MainContainer = connect(mapStateToProps, mapDispatchToProps)(PathFinderSettings);

export { MainContainer as PathFinderSettings };
