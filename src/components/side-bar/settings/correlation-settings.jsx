import React, { useState, useEffect } from "react";
import { connect } from "react-redux";
import {
  Field,
  Select,
  CheckBox,
  Slider,
  Spacer,
  Flex,
  Text,
} from "@oliasoft-open-source/react-ui-library";
import { correlationSettingsChanged } from "../../../store/settings/correlation-settings";
import { CorrelationSettingsTypes } from "./enums";
import { useDebounce } from "../../../hooks/useDebounce";
import styles from "./settings.module.scss";

const CorrelationSettings = ({
  correlationSettings,
  correlationSettingsChanged,
  coreSettings,
}) => {
  // Local state for immediate slider updates
  const [localTrimThreshold, setLocalTrimThreshold] = useState(
    correlationSettings?.trimThreshold || 0.1
  );

  // Debounced value that will trigger API calls
  const debouncedTrimThreshold = useDebounce(localTrimThreshold, 800);

  // State to track when the slider is being adjusted
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [lastChangeTime, setLastChangeTime] = useState(0);

  // Update local state when settings change from outside
  useEffect(() => {
    if (correlationSettings?.trimThreshold !== undefined) {
      setLocalTrimThreshold(correlationSettings.trimThreshold);
    }
  }, [correlationSettings?.trimThreshold]);

  // Trigger API call when debounced value changes
  useEffect(() => {
    if (debouncedTrimThreshold !== correlationSettings?.trimThreshold) {
      setIsAdjusting(false);
      correlationSettingsChanged({
        settingName: CorrelationSettingsTypes.TRIM_THRESHOLD,
        newValue: debouncedTrimThreshold,
      });
    }
  }, [debouncedTrimThreshold, correlationSettings?.trimThreshold, correlationSettingsChanged]);

  // Calculate remaining time for countdown
  const getRemainingTime = () => {
    if (!isAdjusting) return 0;
    const elapsed = Date.now() - lastChangeTime;
    const remaining = Math.max(0, 800 - elapsed);
    return Math.ceil(remaining / 100);
  };

  // Update countdown timer
  const [countdown, setCountdown] = useState(0);
  
  useEffect(() => {
    if (!isAdjusting) {
      setCountdown(0);
      return;
    }

    const interval = setInterval(() => {
      const remaining = getRemainingTime();
      setCountdown(remaining);
      
      if (remaining <= 0) {
        setIsAdjusting(false);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isAdjusting, lastChangeTime]);
  const linkageMethodOptions = [
    {
      label: "Single",
      value: "single",
    },
    {
      label: "Complete",
      value: "complete",
    },
    {
      label: "Average",
      value: "average",
    },
    {
      label: "Centroid",
      value: "centroid",
    },
    {
      label: "Median",
      value: "median",
    },
    {
      label: "Ward",
      value: "ward",
    },
  ];

  const distanceMetricOptions = [
    {
      label: "Euclidean",
      value: "euclidean",
    },
    {
      label: "Correlation",
      value: "correlation",
    },
    {
      label: "Jaccard",
      value: "jaccard",
    },
  ];

  const axisOptions = [
    {
      label: "Both",
      value: "both",
    },
    {
      label: "Row",
      value: "row",
    },
  ];

  const corrtypeOptions = [
    {
      label: "Pearson",
      value: "pearson",
    },
    {
      label: "Spearman",
      value: "spearman",
    },
    {
      label: "Kendall",
      value: "kendall",
    },
  ];

  // Validate selected datasets against available datasets (remove invalid ones)
  useEffect(() => {
    // Get all main datasets (id.length < 17) for correlation module
    const allDatasets = coreSettings?.datasetList?.filter(
      (dataset) => dataset.id.length < 17
    ) || [];

    if (allDatasets.length === 0) {
      // No datasets available - ensure selectedDatasets is empty array
      if (correlationSettings?.selectedDatasets?.length > 0) {
        correlationSettingsChanged({
          settingName: CorrelationSettingsTypes.SELECTED_DATASETS,
          newValue: [],
        });
      }
      return;
    }

    const availableDatasetIds = allDatasets.map(d => d.id);
    const currentSelected = correlationSettings?.selectedDatasets || [];
    const validSelected = currentSelected.filter(id => availableDatasetIds.includes(id));

    // Only update if some datasets were invalid (don't auto-select if none selected)
    if (validSelected.length !== currentSelected.length) {
      correlationSettingsChanged({
        settingName: CorrelationSettingsTypes.SELECTED_DATASETS,
        newValue: validSelected,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coreSettings?.datasetList, correlationSettingsChanged]);

  return (
    <>
      <Field
        label="Correlation Algorithm"
        labelLeft
        labelWidth={150}
        helpText="Set the correlation algorithm. Note that Pearson measures a linear relationship between two variables, while Kendall and Spearman measure how likely it is for two variables to move in the same direction, but not necessarily at a constant rate. Pearson provides information about the strength and direction of the linear relationship between two variables but is sensitive to outliers."
      >
        <Select
          small
          onChange={({ target: { value } }) =>
            correlationSettingsChanged({
              settingName: CorrelationSettingsTypes.CORRTYPE,
              newValue: value,
            })
          }
          options={corrtypeOptions}
          value={correlationSettings?.corrType}
        />
      </Field>
      <Field
        label="Cluster Axis"
        labelLeft
        labelWidth={150}
        helpText="Set clustering axis (row/both) (default: both)"
      >
        <Select
          small
          onChange={({ target: { value } }) =>
            correlationSettingsChanged({
              settingName: CorrelationSettingsTypes.AXIS,
              newValue: value,
            })
          }
          options={axisOptions}
          value={correlationSettings?.axis}
        />
      </Field>
      <Field
        label="Row Distance"
        labelLeft
        labelWidth={150}
        helpText="Set the distance to use for clustering rows (default: euclidean)"
      >
        <Select
          small
          onChange={({ target: { value } }) =>
            correlationSettingsChanged({
              settingName: CorrelationSettingsTypes.ROW_DISTANCE,
              newValue: value,
            })
          }
          options={distanceMetricOptions}
          value={correlationSettings?.row_distance}
        />
      </Field>
      <Field
        label="Column Distance"
        labelLeft
        labelWidth={150}
        helpText="Set the distance to use for clustering columns (default: euclidean)"
      >
        <Select
          small
          onChange={({ target: { value } }) =>
            correlationSettingsChanged({
              settingName: CorrelationSettingsTypes.COLUMN_DISTANCE,
              newValue: value,
            })
          }
          options={distanceMetricOptions}
          value={correlationSettings?.column_distance}
        />
      </Field>
      <Field
        label="Row Linkage Method"
        labelLeft
        labelWidth={150}
        helpText="Set the linkage to use for clustering rows (default: Average)"
      >
        <Select
          small
          onChange={({ target: { value } }) =>
            correlationSettingsChanged({
              settingName: CorrelationSettingsTypes.ROW_LINKAGE,
              newValue: value,
            })
          }
          options={linkageMethodOptions}
          value={correlationSettings?.row_linkage}
        />
      </Field>
      <Field
        label="Column Linkage Method"
        labelLeft
        labelWidth={150}
        helpText="Set the linkage to use for clustering columns (default: Average)"
      >
        <Select
          small
          onChange={({ target: { value } }) =>
            correlationSettingsChanged({
              settingName: CorrelationSettingsTypes.COLUMN_LINKAGE,
              newValue: value,
            })
          }
          options={linkageMethodOptions}
          value={correlationSettings?.column_linkage}
        />
      </Field>
      <Field
        labelLeft
        labelWidth={165}
        label="Row/Column same order"
        helpText="Whether to order columns in the same order with rows. Enabling this will remove column dendogram."
      >
        <CheckBox
          small
          onChange={({ target: { checked } }) =>
            correlationSettingsChanged({
              settingName: CorrelationSettingsTypes.ROW_COL_SAMEORDER,
              newValue: checked,
            })
          }
          checked={correlationSettings?.row_col_sameorder}
        />
      </Field>
      
      <Spacer size={10} />
      
      <Field
        labelLeft
        labelWidth={165}
        label="Trim Low Correlations"
        helpText="Remove rows and columns that don't have any meaningful correlation values above the threshold. Ignores perfect correlations (±1) to focus on significant partial correlations and reduces heatmap size."
      >
        <CheckBox
          small
          onChange={({ target: { checked } }) =>
            correlationSettingsChanged({
              settingName: CorrelationSettingsTypes.TRIM_ENABLED,
              newValue: checked,
            })
          }
          checked={correlationSettings?.trimEnabled}
        />
      </Field>
      
      {correlationSettings?.trimEnabled && (
        <Field
          label="Trim Threshold"
          labelLeft
          labelWidth={150}
          helpText={`Remove rows/columns with no meaningful correlations above ${localTrimThreshold.toFixed(2)} (excludes ±1 values). Range: 0.05 - 0.2`}
        >
          <div className={styles.inputRange}>
            <Slider
              label={localTrimThreshold.toFixed(2)}
              max={40}
              min={10}
              value={localTrimThreshold * 200}
              onChange={({ target: { value } }) => {
                const newValue = value / 200;
                setLocalTrimThreshold(newValue);
                setIsAdjusting(true);
                setLastChangeTime(Date.now());
              }}
            />
            {isAdjusting && debouncedTrimThreshold !== localTrimThreshold && (
              <div style={{ 
                fontSize: '12px', 
                color: '#666', 
                marginTop: '4px',
                fontStyle: 'italic'
              }}>
                Updating in {countdown * 100}ms...
              </div>
            )}
          </div>
        </Field>
      )}
      
      <Spacer size={10} />
    </>
  );
};

const mapStateToProps = ({ settings }) => ({
  correlationSettings: settings?.correlation ?? {},
  coreSettings: settings?.core ?? {},
});
const mapDispatchToProps = {
  correlationSettingsChanged,
};

const MainContainer = connect(
  mapStateToProps,
  mapDispatchToProps
)(CorrelationSettings);
export { MainContainer as CorrelationSettings };
