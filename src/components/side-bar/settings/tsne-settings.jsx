import React from 'react';
import { connect } from 'react-redux';
import { Field, Select, CheckBox, Text, Spacer } from '@oliasoft-open-source/react-ui-library';
import InputRange from 'react-input-range';
import 'react-input-range/lib/css/index.css';
import styles from './settings.module.scss';

const TsneSettings = ({
  tsneSettings,
}) => {
  const tsneSourceOptions = [
    {
      label: 'PCA Data',
      value: 'PCA Data',
    }
  ];
  
  const onChangetsneSource = (evt) => {
    console.log(evt);
  };

  return (
    <>
      <Field label='tSNE Source'>
        <Select
          onChange={onChangetsneSource}
          options={tsneSourceOptions}
          value={tsneSettings?.tsneSource}
        />
        <Spacer height={10} />
        <Text>You need to first perform PCA to use it in embeding!</Text>
      </Field>
      <Field label='Perplexity'>
        <div className={styles.inputRange}>
          <InputRange
            maxValue={300}
            minValue={1}
            value={tsneSettings?.perplexity}
            onChange={value => console.log({ value })}
          />
        </div>
      </Field>
      <Field label='Learning Rate'>
        <div className={styles.inputRange}>
          <InputRange
            maxValue={1000}
            minValue={10}
            value={tsneSettings?.learningRate}
            onChange={value => console.log({ value })}
          />
        </div>
      </Field>
      <Field label='Learning Rate'>
        <div className={styles.inputRange}>
          <InputRange
            maxValue={5000}
            minValue={250}
            value={tsneSettings?.numberOfIterations}
            onChange={value => console.log({ value })}
          />
        </div>
      </Field>
      <Field label='Early Exaggeration %'>
        <div className={styles.inputRange}>
          <InputRange
            maxValue={25}
            minValue={1}
            value={tsneSettings?.earlyExaggeration}
            onChange={value => console.log({ value })}
          />
        </div>
      </Field>
      <Field>
        <CheckBox
          label="HDB Scan Clustering"
          onChange={() => { }}
          checked={tsneSettings?.hdbScanClustering}
        />
      </Field>
    </>
  );
};

const mapStateToProps = ({ settings }) => ({
  tsneSettings: settings?.tsne ?? {},
});

const mapDispatchToProps = {};

const MainContainer = connect(mapStateToProps, mapDispatchToProps)(TsneSettings);

export { MainContainer as TsneSettings };
