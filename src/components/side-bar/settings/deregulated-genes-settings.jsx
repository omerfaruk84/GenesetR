import React from 'react';
import { connect } from 'react-redux';
import {
  Field,
  Slider,
  CheckBox,
  Select,
  Input
} from '@oliasoft-open-source/react-ui-library';
import { deregulatedGenesSettingsChanged } from '../../../store/settings/deregulated-genes-settings';
import { DeregulatedGenesSettingsTypes } from './enums';
import styles from './settings.module.scss';

const DeregulatedGenesSettings = ({
  deregulatedGenesSettings,
  deregulatedGenesSettingsChanged,
}) => {
  const averageMethodOptions = [
    {
      label: "Z-Score",
      value: "zscore",
    },
    {
      label: "Rank",
      value: "rank",
    },
  ];

  const minPerturbationsTypeOptions = [
    {
      label: "Number",
      value: "number",
    },
    {
      label: "Percentage",
      value: "percentage",
    },
  ];

  return (
    <>
      <Field
        label='Top N Genes'
        labelLeft
        labelWidth="150px"
        helpText="Number of top up/down regulated genes to extract from each perturbation"
      >
        <Input
          type="number"
          min={1}
          max={2000}
          value={deregulatedGenesSettings?.topNGenes}
          onChange={({ target: { value } }) =>
            deregulatedGenesSettingsChanged({
              settingName: DeregulatedGenesSettingsTypes.TOP_N_GENES,
              newValue: parseInt(value),
            })
          }
        />
      </Field>

      <Field
        label='Z-Score Threshold'
        labelLeft
        labelWidth="150px"
        helpText="Minimum absolute Z-Score for a gene to be considered deregulated"
      >
        <div className={styles.inputRange}>
          <Slider
            label={deregulatedGenesSettings?.zScoreThreshold?.toFixed(1)}
            max={100}
            min={0}
            value={deregulatedGenesSettings?.zScoreThreshold * 20}
            onChange={({ target: { value } }) =>
              deregulatedGenesSettingsChanged({
                settingName: DeregulatedGenesSettingsTypes.Z_SCORE_THRESHOLD,
                newValue: value / 20,
              })
            }
          />
        </div>
      </Field>

      <Field
        label='Min Perturbations Type'
        labelLeft
        labelWidth="150px"
        helpText="Whether to specify minimum perturbations as a number or percentage"
      >
        <Select
          value={deregulatedGenesSettings?.minPerturbationsType}
          options={minPerturbationsTypeOptions}
          onChange={({ target: { value } }) =>
            deregulatedGenesSettingsChanged({
              settingName: DeregulatedGenesSettingsTypes.MIN_PERTURBATIONS_TYPE,
              newValue: value,
            })
          }
        />
      </Field>

      <Field
        label={
          deregulatedGenesSettings?.minPerturbationsType === "percentage"
            ? 'Min Perturbations (%)'
            : 'Min Perturbations'
        }
        labelLeft
        labelWidth="150px"
        helpText={
          deregulatedGenesSettings?.minPerturbationsType === "percentage"
            ? "Minimum percentage of perturbations a gene must appear in"
            : "Minimum number of perturbations a gene must appear in"
        }
      >
        <Input
          type="number"
          min={deregulatedGenesSettings?.minPerturbationsType === "percentage" ? 0 : 1}
          max={deregulatedGenesSettings?.minPerturbationsType === "percentage" ? 100 : 100}
          value={deregulatedGenesSettings?.minPerturbations}
          onChange={({ target: { value } }) =>
            deregulatedGenesSettingsChanged({
              settingName: DeregulatedGenesSettingsTypes.MIN_PERTURBATIONS,
              newValue: deregulatedGenesSettings?.minPerturbationsType === "percentage"
                ? parseFloat(value)
                : parseInt(value),
            })
          }
        />
      </Field>

      <Field
        label='Average Method'
        labelLeft
        labelWidth="150px"
        helpText="Method to calculate average effect across perturbations"
      >
        <Select
          value={deregulatedGenesSettings?.averageMethod}
          options={averageMethodOptions}
          onChange={({ target: { value } }) =>
            deregulatedGenesSettingsChanged({
              settingName: DeregulatedGenesSettingsTypes.AVERAGE_METHOD,
              newValue: value,
            })
          }
        />
      </Field>

      <Field>
        <CheckBox
          label="Require Same Direction"
          onChange={({ target: { checked } }) =>
            deregulatedGenesSettingsChanged({
              settingName: DeregulatedGenesSettingsTypes.REQUIRE_SAME_DIRECTION,
              newValue: checked
            })
          }
          checked={deregulatedGenesSettings?.requireSameDirection}
        />
      </Field>

      <Field
        label='Min Datasets'
        labelLeft
        labelWidth="150px"
        helpText="For multi-dataset analysis: minimum number of datasets a gene must appear in"
      >
        <Input
          type="number"
          min={1}
          max={20}
          value={deregulatedGenesSettings?.minDatasets}
          onChange={({ target: { value } }) =>
            deregulatedGenesSettingsChanged({
              settingName: DeregulatedGenesSettingsTypes.MIN_DATASETS,
              newValue: parseInt(value),
            })
          }
        />
      </Field>
    </>
  );
};

const mapStateToProps = ({ settings }) => ({
  deregulatedGenesSettings: settings?.deregulatedGenes ?? {}
});

const mapDispatchToProps = {
  deregulatedGenesSettingsChanged,
};

const MainContainer = connect(mapStateToProps, mapDispatchToProps)(DeregulatedGenesSettings);
export { MainContainer as DeregulatedGenesSettings };
