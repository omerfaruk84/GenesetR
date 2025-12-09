import React from "react";
import { connect } from "react-redux";
import { Field, Select, Slider } from "@oliasoft-open-source/react-ui-library";
import { tsneSettingsChanged } from "../../../store/settings/tsne-settings";
import { TsneSettingsTypes } from "./enums";
import styles from "./settings.module.scss";

const TsneSettings = ({ tsneSettings, coreSettings, tsneSettingsChanged }) => {
  const tsneMetricOptions = [
    {
      label: "Euclidean",
      value: "euclidean",
    },
    {
      label: "Correlation",
      value: "correlation",
    },
  ];

  return (
    <>
      <Field label="Dimesion Count" helpText="Number of dimensions in the output embedding. Higher values preserve more information but may be harder to visualize (2-3 dimensions recommended for visualization).">
        <div className={styles.inputRange}>
          <Slider
            label={tsneSettings?.numcomponents}
            max={Math.min(200, coreSettings.cellLine.geneCount)}
            min={3}
            value={tsneSettings?.numcomponents}
            onChange={({ target: { value } }) =>
              tsneSettingsChanged({
                settingName: TsneSettingsTypes.NUMBER_OF_COMPONENTS,
                newValue: value,
              })
            }
          />
        </div>
      </Field>

      <Field label="Distance Metric" helpText="Method for calculating distances between data points. Euclidean works well for most cases, while correlation is useful for gene expression data.">
        <Select
          onChange={({ target: { value } }) =>
            tsneSettingsChanged({
              settingName: TsneSettingsTypes.METRIC,
              newValue: value,
            })
          }
          options={tsneMetricOptions}
          value={tsneSettings?.metric}
        />
      </Field>

      <Field label="Perplexity" helpText="Balances attention between local and global aspects of data. Lower values focus on local structure, higher values on global structure. Typical range: 5-50.">
        <div className={styles.inputRange}>
          <Slider
            label={tsneSettings?.perplexity}
            max={300}
            min={1}
            value={tsneSettings?.perplexity}
            onChange={({ target: { value } }) =>
              tsneSettingsChanged({
                settingName: TsneSettingsTypes.PERPLEXITY,
                newValue: value,
              })
            }
          />
        </div>
      </Field>

      <Field label="Learning Rate" helpText="Step size for gradient descent optimization. Higher values may cause instability, lower values slow convergence. Typical range: 10-1000.">
        <div className={styles.inputRange}>
          <Slider
            label={tsneSettings?.learning_rate}
            max={1000}
            min={10}
            value={tsneSettings?.learning_rate}
            onChange={({ target: { value } }) =>
              tsneSettingsChanged({
                settingName: TsneSettingsTypes.LEARNING_RATE,
                newValue: value,
              })
            }
          />
        </div>
      </Field>

      <Field label="Number Of Iterations" helpText="Maximum number of optimization iterations. More iterations may improve quality but increase computation time. Typical range: 1000-5000.">
        <div className={styles.inputRange}>
          <Slider
            label={tsneSettings?.n_iter}
            max={5000}
            min={250}
            value={tsneSettings?.n_iter}
            onChange={({ target: { value } }) =>
              tsneSettingsChanged({
                settingName: TsneSettingsTypes.NUMBER_OF_ITERATIONS,
                newValue: value,
              })
            }
          />
        </div>
      </Field>
      <Field label="Early Exaggeration %">
        <div className={styles.inputRange}>
          <Slider
            label={tsneSettings?.earlyExaggeration}
            max={25}
            min={1}
            value={tsneSettings?.earlyExaggeration}
            onChange={({ target: { value } }) =>
              tsneSettingsChanged({
                settingName: TsneSettingsTypes.EARLY_EXAGGERATION,
                newValue: value,
              })
            }
          />
        </div>
      </Field>
    </>
  );
};

const mapStateToProps = ({ settings }) => ({
  tsneSettings: settings?.tsne ?? {},
  coreSettings: settings?.core ?? {},
});

const mapDispatchToProps = {
  tsneSettingsChanged,
};

const MainContainer = connect(
  mapStateToProps,
  mapDispatchToProps
)(TsneSettings);

export { MainContainer as TsneSettings };
