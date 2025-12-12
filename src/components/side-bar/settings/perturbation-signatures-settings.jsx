import React, { useEffect, useState } from 'react';
import { connect } from 'react-redux';
import { Field, TextArea, Select, CheckBox } from '@oliasoft-open-source/react-ui-library';
import { perturbationSignaturesSettingsChanged } from '../../../store/settings/perturbation-signatures-settings';
import { fetchSignatureCellLines, fetchAvailableSignatures } from '../../../store/api';
import styles from './settings.module.scss';

const PerturbationSignaturesSettingsTypes = {
  GENE_LIST: 'geneList',
  SELECTED_CELL_LINES: 'selectedCellLines',
  SELECTED_SIGNATURES: 'selectedSignatures',
  DISPLAY_MODE: 'displayMode',
  SHOW_VALUES: 'showValues',
  Z_SCORE_CUTOFF: 'zScoreCutoff',
};

const PerturbationSignaturesSettings = ({
  perturbationSignaturesSettings,
  perturbationSignaturesSettingsChanged,
}) => {
  const [availableCellLines, setAvailableCellLines] = useState([]);
  const [availableSignatures, setAvailableSignatures] = useState([]);
  const [loadingCellLines, setLoadingCellLines] = useState(false);
  const [loadingSignatures, setLoadingSignatures] = useState(false);

  // Fetch available cell lines and signatures on mount
  useEffect(() => {
    const fetchOptions = async () => {
      setLoadingCellLines(true);
      setLoadingSignatures(true);

      try {
        const cellLines = await fetchSignatureCellLines();
        setAvailableCellLines(
          cellLines.map(cl => ({
            label: cl.replace('gwps', ''),
            value: cl,
          }))
        );
      } catch (error) {
        console.error('Error fetching cell lines:', error);
        // Use default cell lines if fetch fails
        setAvailableCellLines([
          { label: 'K562', value: 'K562gwps' },
          { label: 'HCT116', value: 'HCT116gwps' },
          { label: 'HEK293', value: 'HEK293gwps' },
        ]);
      }
      setLoadingCellLines(false);

      try {
        const signatures = await fetchAvailableSignatures();
        setAvailableSignatures(
          signatures.map(sig => ({
            label: sig.replace('HALLMARK_', '').replace(/_/g, ' '),
            value: sig,
          }))
        );
      } catch (error) {
        console.error('Error fetching signatures:', error);
        // Use default Hallmark signatures if fetch fails
        setAvailableSignatures([
          { label: 'APOPTOSIS', value: 'HALLMARK_APOPTOSIS' },
          { label: 'HYPOXIA', value: 'HALLMARK_HYPOXIA' },
          { label: 'P53 PATHWAY', value: 'HALLMARK_P53_PATHWAY' },
          { label: 'MYC TARGETS V1', value: 'HALLMARK_MYC_TARGETS_V1' },
          { label: 'E2F TARGETS', value: 'HALLMARK_E2F_TARGETS' },
          { label: 'G2M CHECKPOINT', value: 'HALLMARK_G2M_CHECKPOINT' },
          { label: 'DNA REPAIR', value: 'HALLMARK_DNA_REPAIR' },
          { label: 'OXIDATIVE PHOSPHORYLATION', value: 'HALLMARK_OXIDATIVE_PHOSPHORYLATION' },
        ]);
      }
      setLoadingSignatures(false);
    };

    fetchOptions();
  }, []);

  const displayModeOptions = [
    { label: 'Heatmap', value: 'heatmap' },
    { label: 'Table', value: 'table' },
  ];

  return (
    <>
      <Field
        label="Perturbed Genes"
        labelLeft
        labelWidth="120px"
        helpText="Enter gene symbols to query. These are the genes that were perturbed (knocked down)."
      >
        <TextArea
          placeholder="Enter gene symbols separated by comma, space, or newline (e.g., TP53, MYC, BRCA1)"
          tooltip="Enter the gene symbols you want to analyze"
          rows={5}
          resize="vertical"
          value={perturbationSignaturesSettings?.geneList || ''}
          onChange={({ target: { value } }) =>
            perturbationSignaturesSettingsChanged({
              settingName: PerturbationSignaturesSettingsTypes.GENE_LIST,
              newValue: value,
            })
          }
        />
      </Field>

      <Field
        label="Cell Lines"
        labelLeft
        labelWidth="120px"
        helpText="Select cell lines to analyze. Leave empty to include all available cell lines."
      >
        <Select
          isMulti
          placeholder={loadingCellLines ? 'Loading...' : 'All cell lines'}
          options={availableCellLines}
          value={
            perturbationSignaturesSettings?.selectedCellLines?.map(cl =>
              availableCellLines.find(opt => opt.value === cl)
            ) || []
          }
          onChange={(selected) =>
            perturbationSignaturesSettingsChanged({
              settingName: PerturbationSignaturesSettingsTypes.SELECTED_CELL_LINES,
              newValue: selected ? selected.map(s => s.value) : [],
            })
          }
          isDisabled={loadingCellLines}
        />
      </Field>

      <Field
        label="Signatures"
        labelLeft
        labelWidth="120px"
        helpText="Select specific signatures to display. Leave empty to show all Hallmark signatures."
      >
        <Select
          isMulti
          placeholder={loadingSignatures ? 'Loading...' : 'All signatures'}
          options={availableSignatures}
          value={
            perturbationSignaturesSettings?.selectedSignatures?.map(sig =>
              availableSignatures.find(opt => opt.value === sig)
            ) || []
          }
          onChange={(selected) =>
            perturbationSignaturesSettingsChanged({
              settingName: PerturbationSignaturesSettingsTypes.SELECTED_SIGNATURES,
              newValue: selected ? selected.map(s => s.value) : [],
            })
          }
          isDisabled={loadingSignatures}
        />
      </Field>

      <Field
        label="Display Mode"
        labelLeft
        labelWidth="120px"
        helpText="Choose how to display results"
      >
        <Select
          options={displayModeOptions}
          value={displayModeOptions.find(
            opt => opt.value === perturbationSignaturesSettings?.displayMode
          )}
          onChange={(selected) =>
            perturbationSignaturesSettingsChanged({
              settingName: PerturbationSignaturesSettingsTypes.DISPLAY_MODE,
              newValue: selected?.value || 'heatmap',
            })
          }
        />
      </Field>

      <Field>
        <CheckBox
          label="Show values in heatmap cells"
          onChange={({ target: { checked } }) =>
            perturbationSignaturesSettingsChanged({
              settingName: PerturbationSignaturesSettingsTypes.SHOW_VALUES,
              newValue: checked,
            })
          }
          checked={perturbationSignaturesSettings?.showValues || false}
        />
      </Field>
    </>
  );
};

const mapStateToProps = ({ settings }) => ({
  perturbationSignaturesSettings: settings?.perturbationSignatures ?? {},
});

const mapDispatchToProps = {
  perturbationSignaturesSettingsChanged,
};

const MainContainer = connect(mapStateToProps, mapDispatchToProps)(PerturbationSignaturesSettings);
export { MainContainer as PerturbationSignaturesSettings };
