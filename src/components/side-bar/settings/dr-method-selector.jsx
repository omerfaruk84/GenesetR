import React from 'react';
import { connect } from 'react-redux';
import { Field, Select } from '@oliasoft-open-source/react-ui-library';
import { coreSettingsChanged } from '../../../store/settings/core-settings';
import { CoreSettingsTypes } from './enums';

const DrMethodSelector = ({
  coreSettings,
  coreSettingsChanged,
}) => {
  const drMethodOptions = [
    {
      label: "PCA (Principal Component Analysis)",
      value: "pca",
    },
    {
      label: "MDE (Minimum Distortion Embedding)",
      value: "mde",
    },
    {
      label: "UMAP (Uniform Manifold Approximation)",
      value: "umap",
    },
    {
      label: "t-SNE (t-Distributed Stochastic Neighbor Embedding)",
      value: "tsne",
    },
    {
      label: "Pre-computed DR (All Genes)",
      value: "precomputed",
    },
  ];

  const getCurrentMethodLabel = () => {
    const currentMethod = coreSettings?.currentModule || "pca";
    const option = drMethodOptions.find(opt => opt.value === currentMethod);
    return option ? option.label : "PCA (Principal Component Analysis)";
  };

  return (
    <Field
      label={
        <span style={{
          fontWeight: '600',
          fontSize: '11px',
          color: 'var(--gs-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em'
        }}>
          DR Method Selection
        </span>
      }
      labelLeft={false}
      helpText={
        <div style={{ fontSize: '12px', lineHeight: '1.4', color: 'var(--gs-text)' }}>
          <strong>Choose the dimensionality reduction method to run:</strong><br/>
          • <strong>PCA</strong>: Linear method for variance-based reduction<br/>
          • <strong>MDE</strong>: Nonlinear method optimized for clustering<br/>
          • <strong>UMAP</strong>: Preserves local and global structure<br/>
          • <strong>t-SNE</strong>: Best for visualizing local relationships<br/>
          • <strong>Pre-computed</strong>: All-genes analysis with optimized parameters<br/>
          <br/>
          <em>Tip: You can chain methods (e.g., PCA → MDE) by running one method and then selecting the result from the dataset selector below.</em>
        </div>
      }
      style={{
        border: '1px solid var(--gs-border)',
        borderRadius: '8px',
        padding: '12px',
        marginBottom: '16px',
        backgroundColor: 'var(--gs-surface-alt)'
      }}
    >
      <Select
        value={coreSettings?.currentModule || "pca"}
        options={drMethodOptions}
        onChange={({ target: { value } }) => {
          coreSettingsChanged({
            settingName: CoreSettingsTypes.CURRENT_MODULE,
            newValue: value,
          });
        }}
      />
    </Field>
  );
};

const mapStateToProps = ({ settings }) => ({
  coreSettings: settings?.core ?? {},
});

const mapDispatchToProps = {
  coreSettingsChanged,
};

const MainContainer = connect(mapStateToProps, mapDispatchToProps)(DrMethodSelector);

export { MainContainer as DrMethodSelector };





