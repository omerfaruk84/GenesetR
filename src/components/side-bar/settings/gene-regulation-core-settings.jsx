import React from 'react';
import { connect } from 'react-redux';
import { Field, Select, Slider, Divider, Toggle } from '@oliasoft-open-source/react-ui-library';
import { geneRegulationCoreSettingsChanged } from '../../../store/settings/gene-regulation-core-settings';
import { GeneRegulationCoreSettingsTypes } from './enums';
import styles from './settings.module.scss';

const GeneRegulationSettings = ({
  geneRegulationCoreSettings,
  geneRegulationCoreSettingsChanged,
}) => {
  const geneOptions = [
    {
      label: 'SLC39A10',
      value: 'SLC39A10',
    }
  ];

  return (
    <>
      <Field label='Select a gene'>
        <Select
          onChange={({ target: { value } }) => geneRegulationCoreSettingsChanged({
            settingName: GeneRegulationCoreSettingsTypes.SELECTED_GENE,
            newValue: value
          })}
          options={geneOptions}
          value={geneRegulationCoreSettings?.selectedGene}
        />
      </Field>
    
      <Field label='Show Exprresional Regulation' labelLeft labelWidth="250px" helpText="Adjust symbol opacity based on clustering probability">
      <Toggle      
       onChange={({ target: { checked } }) => geneRegulationCoreSettingsChanged({
        settingName: GeneRegulationCoreSettingsTypes.INCLUDE_EXP,
        newValue: checked
      })}
      checked={geneRegulationCoreSettings?.include_exp}
    /></Field>
      <Field  labelLeft label='Absolute Z Score threshold'>
        <div className={styles.inputRange}>         
          <Slider
            label={geneRegulationCoreSettings?.absoluteZScore}
            max={100}
            min={0}
            value={geneRegulationCoreSettings?.absoluteZScore * 10}
            onChange={({ target: { value } }) => geneRegulationCoreSettingsChanged({
              settingName: GeneRegulationCoreSettingsTypes.ABSOLUTE_Z_SCORE,
              newValue: value / 10,
            })}
          />
        </div>
      </Field>
     <Field label='Include Correlation' labelLeft labelWidth="250px" helpText="Adjust symbol opacity based on clustering probability">
      <Toggle      
       onChange={({ target: { checked } }) => geneRegulationCoreSettingsChanged({
        settingName: GeneRegulationCoreSettingsTypes.INCLUDE_CORR,
        newValue: checked
      })}
      checked={geneRegulationCoreSettings?.include_corr}
    /></Field>
      <Field labelLeft label='Correlation R threshold'>
        <div className={styles.inputRange}>         
          <Slider
            label={geneRegulationCoreSettings?.corr_cutoff}
            max={16}
            min={1}
            value={geneRegulationCoreSettings?.corr_cutoff * 20}
            onChange={({ target: { value } }) => geneRegulationCoreSettingsChanged({
              settingName: GeneRegulationCoreSettingsTypes.CORR_CUTOFF,
              newValue: value / 20,
            })}
          />
        </div>
      </Field>
      
      <Divider align="left"> Edges to display </Divider>

      <Field label='Upstream Positive Regulators' labelLeft labelWidth="250px" helpText="Adjust symbol opacity based on clustering probability">
      <Toggle      
       onChange={({ target: { checked } }) => geneRegulationCoreSettingsChanged({
        settingName: GeneRegulationCoreSettingsTypes.UPR,
        newValue: checked
      })}
      checked={geneRegulationCoreSettings?.upr}
    /></Field>
    <Field label='Upstream Negative Regulators' labelLeft labelWidth="250px" helpText="Adjust symbol opacity based on clustering probability">
      <Toggle      
       onChange={({ target: { checked } }) => geneRegulationCoreSettingsChanged({
        settingName: GeneRegulationCoreSettingsTypes.UNR,
        newValue: checked
      })}
      checked={geneRegulationCoreSettings?.unr}
    /></Field>
    <Field label='Downstream Positive Regulators' labelLeft labelWidth="250px" helpText="Adjust symbol opacity based on clustering probability">
      <Toggle      
       onChange={({ target: { checked } }) => geneRegulationCoreSettingsChanged({
        settingName: GeneRegulationCoreSettingsTypes.DPR,
        newValue: checked
      })}
      checked={geneRegulationCoreSettings?.dpr}
    /></Field>
    <Field label='Downstream Negative Regulators' labelLeft labelWidth="250px" helpText="Adjust symbol opacity based on clustering probability">
      <Toggle      
       onChange={({ target: { checked } }) => geneRegulationCoreSettingsChanged({
        settingName: GeneRegulationCoreSettingsTypes.DNR,
        newValue: checked
      })}
      checked={geneRegulationCoreSettings?.dnr}
    /></Field>
    <Field label='UPR to DPR' labelLeft labelWidth="250px" helpText="Adjust symbol opacity based on clustering probability">
      <Toggle      
       onChange={({ target: { checked } }) => geneRegulationCoreSettingsChanged({
        settingName: GeneRegulationCoreSettingsTypes.UPR_DPR,
        newValue: checked
      })}
      checked={geneRegulationCoreSettings?.upr_dpr}
    /></Field>
    <Field label='UPR to DNR' labelLeft labelWidth="250px" helpText="Adjust symbol opacity based on clustering probability">
      <Toggle      
       onChange={({ target: { checked } }) => geneRegulationCoreSettingsChanged({
        settingName: GeneRegulationCoreSettingsTypes.UPR_DNR,
        newValue: checked
      })}
      checked={geneRegulationCoreSettings?.upr_dnr}
    /></Field>
    <Field label='UNR to DPR' labelLeft labelWidth="250px" helpText="Adjust symbol opacity based on clustering probability">
      <Toggle      
       onChange={({ target: { checked } }) => geneRegulationCoreSettingsChanged({
        settingName: GeneRegulationCoreSettingsTypes.UNR_DPR,
        newValue: checked
      })}
      checked={geneRegulationCoreSettings?.unr_dpr}
    /></Field>
    <Field label='UNR to DNR' labelLeft labelWidth="250px" helpText="Adjust symbol opacity based on clustering probability">
      <Toggle      
       onChange={({ target: { checked } }) => geneRegulationCoreSettingsChanged({
        settingName: GeneRegulationCoreSettingsTypes.UNR_DNR,
        newValue: checked
      })}
      checked={geneRegulationCoreSettings?.unr_dnr}
    /></Field>
     <Field label='Among UPR' labelLeft labelWidth="250px" helpText="Adjust symbol opacity based on clustering probability">
      <Toggle      
       onChange={({ target: { checked } }) => geneRegulationCoreSettingsChanged({
        settingName: GeneRegulationCoreSettingsTypes.AMONG_UPR,
        newValue: checked
      })}
      checked={geneRegulationCoreSettings?.among_upr}
    /></Field>
      <Field label='Among DPR' labelLeft labelWidth="250px" helpText="Adjust symbol opacity based on clustering probability">
      <Toggle      
       onChange={({ target: { checked } }) => geneRegulationCoreSettingsChanged({
        settingName: GeneRegulationCoreSettingsTypes.AMONG_DPR,
        newValue: checked
      })}
      checked={geneRegulationCoreSettings?.among_dpr}
    /></Field>
    



    </>
  );
};

const mapStateToProps = ({ settings }) => ({
  geneRegulationCoreSettings: settings?.geneRegulationCore ?? {},
});

const mapDispatchToProps = {
  geneRegulationCoreSettingsChanged,
};

const MainContainer = connect(mapStateToProps, mapDispatchToProps)(GeneRegulationSettings);

export { MainContainer as GeneRegulationSettings };


