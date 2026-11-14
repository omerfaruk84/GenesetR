import React, { useEffect } from "react";
import { connect } from "react-redux";
import {
  Field,
  CheckBox,
  Flex,
  Slider,
} from "@oliasoft-open-source/react-ui-library";
import { inchlibSettingsChanged } from "../../../store/settings/inchlib-settings";
import { InchlibSettingsTypes } from "./enums";
import ColorGradientSelector from "./color-gradient-selector";
import MultiRangeSlider from "multi-range-slider-react";
import { sliderBounds, useHeatmapRangeInfo } from "../../cluster-heatmap/rangeInfo";

// utils/colorScaleUtils.js
export function rgbString({ r, g, b }) {
  return `rgb(${r}, ${g}, ${b})`;
}

/**
 * Given a colorScale object like:
 * {
 *   start: { r: 255, g: 0,   b: 0 },
 *   middle: { r: 255, g: 255, b: 255 },
 *   end:   { r: 0,   g: 0,   b: 255 }
 * }
 * Returns a linear gradient string:
 * "linear-gradient(to right, rgb(255,0,0), rgb(255,255,255), rgb(0,0,255))"
 */
export function get3StopGradient(colorScale) {
  const hasThreeStops = !!colorScale.middle;
  const startColor = rgbString(colorScale.start);
  const endColor = rgbString(colorScale.end);

  if (!hasThreeStops) {
    // 2-stop gradient
    return `linear-gradient(to right, ${startColor}, ${endColor})`;
  }
  // 3-stop gradient
  const middleColor = rgbString(colorScale.middle);
  return `linear-gradient(to right, ${startColor}, ${middleColor}, ${endColor})`;
}

const InchlibSettings = ({ inchlibSettings, inchlibSettingsChanged }) => {
  // Range of the heatmap on screen (cluster heatmap only); without it the
  // slider keeps the -1..1 of a correlation matrix.
  const rangeInfo = useHeatmapRangeInfo();
  const bounds = rangeInfo
    ? sliderBounds(rangeInfo.dataMin, rangeInfo.dataMax)
    : { min: -1, max: 1, step: 0.1, digits: 1 };
  const autoRange = inchlibSettings.color_range_auto !== false;
  const onStep = (value) =>
    Number(
      Math.min(bounds.max, Math.max(bounds.min, Math.round(value / bounds.step) * bounds.step)).toFixed(
        bounds.digits
      )
    );
  const shownMin = onStep(
    autoRange && rangeInfo ? rangeInfo.autoMin : Number(inchlibSettings.color_percentile_min ?? bounds.min)
  );
  const shownMax = onStep(
    autoRange && rangeInfo ? rangeInfo.autoMax : Number(inchlibSettings.color_percentile_max ?? bounds.max)
  );
  const sliderLabels = [0, 0.25, 0.5, 0.75, 1].map((t) =>
    String(Number((bounds.min + t * (bounds.max - bounds.min)).toFixed(Math.max(bounds.digits, 1))))
  );
  useEffect(() => {
    // Safety check in case color_scale is missing or invalid
    if (
      !inchlibSettings.color_scale?.values?.start ||
      !inchlibSettings.color_scale?.values?.end
    ) {
      return;
    }

    // Query the slider DOM node (assuming only ONE slider on this page;
    // if multiple, you'd need something more specific, like a ref or a custom class)
    const sliderEl = document.querySelector(".multi-range-slider");

    if (!sliderEl) return;

    // 3) Compute your colors from the color scale
    const colorScale = inchlibSettings.color_scale;
    const startColor = rgbString(colorScale.values?.start);
    const endColor = rgbString(colorScale.values?.end);
    const gradient = get3StopGradient(colorScale.values); // 2 or 3-stop gradient

    // 4) Grab the relevant child elements
    const barLeft = sliderEl.querySelector(".bar-left");
    const barRight = sliderEl.querySelector(".bar-right");
    const barInner = sliderEl.querySelector(".bar-inner");
    // The library splits bar-inner into bar-inner-left and bar-inner-right too,
    // but we usually only need to set the background on the parent.

    // 5) Apply styles
    if (barLeft) barLeft.style.background = startColor;
    if (barRight) barRight.style.background = endColor;
    if (barInner) barInner.style.background = gradient;
  }, [
    inchlibSettings.color_scale.values,
    inchlibSettings.color_percentile_max,
    inchlibSettings.color_percentile_min,
  ]);

  return (
    <>
      <Field label="Color Scale" helpText="Configure the color gradient and range for the heatmap visualization. Adjust the slider to set the data range that will be mapped to colors.">
        <ColorGradientSelector
          colorScale={inchlibSettings.color_scale}
          onChange={(value) =>
            inchlibSettingsChanged({
              settingName: InchlibSettingsTypes.COLOR_SCALE,
              newValue: value,
            })
          }
        />

        <CheckBox
          onChange={({ target: { checked } }) =>
            inchlibSettingsChanged({
              settingName: InchlibSettingsTypes.COLOR_RANGE_AUTO,
              newValue: checked,
            })
          }
          checked={autoRange}
          label="Automatic range"
          helpText="2nd to 98th percentile of the values, centred on zero for diverging colour scales. Move the slider to set the range yourself."
        />
        <MultiRangeSlider
          // The slider keeps its own state; a new range of values needs a new slider.
          key={`${bounds.min}:${bounds.max}:${bounds.step}`}
          min={bounds.min}
          max={bounds.max}
          step={bounds.step}
          labels={sliderLabels}
          style={{
            width: "100%",
            border: "none",
            boxShadow: "none",
          }}
          minValue={shownMin}
          maxValue={shownMax}
          subSteps={1}
          onInput={(e) => {
            // The slider also reports the values it was given; only a real
            // move switches to a manual range.
            const tolerance = bounds.step / 2;
            if (
              Math.abs(e.minValue - shownMin) < tolerance &&
              Math.abs(e.maxValue - shownMax) < tolerance
            ) {
              return;
            }
            inchlibSettingsChanged({
              settingName: InchlibSettingsTypes.COLOR_PERCENTILE_MIN,
              newValue: e.minValue,
            });
            inchlibSettingsChanged({
              settingName: InchlibSettingsTypes.COLOR_PERCENTILE_MAX,
              newValue: e.maxValue,
            });
            inchlibSettingsChanged({
              settingName: InchlibSettingsTypes.COLOR_RANGE_AUTO,
              newValue: false,
            });
          }}
        />
      </Field>

      <Field labelLeft helpText="Display options for heatmap cells and labels.">
        <Flex direction="row" gap={15}>
          <CheckBox
            onChange={({ target: { checked } }) =>
              inchlibSettingsChanged({
                settingName: InchlibSettingsTypes.SHOW_CELL_VALUES,
                newValue: checked,
              })
            }
            checked={inchlibSettings?.show_cell_values}
            label="Cell Values"
          />

          <CheckBox
            onChange={({ target: { checked } }) =>
              inchlibSettingsChanged({
                settingName: InchlibSettingsTypes.ROW_SCALING,
                newValue: checked,
              })
            }
            checked={!!inchlibSettings?.row_scaling}
            label="Row z-scores"
          />

          <CheckBox
            onChange={({ target: { checked } }) =>
              inchlibSettingsChanged({
                settingName: InchlibSettingsTypes.SQUARE_CELLS,
                newValue: checked,
              })
            }
            checked={!!inchlibSettings?.square_cells}
            label="Square cells"
          />

          <CheckBox
            onChange={({ target: { checked } }) =>
              inchlibSettingsChanged({
                settingName: InchlibSettingsTypes.DRAW_ROW_IDS,
                newValue: checked,
              })
            }
            checked={inchlibSettings?.draw_row_ids}
            label="Row IDs"
          />

          <CheckBox
            onChange={({ target: { checked } }) =>
              inchlibSettingsChanged({
                settingName: InchlibSettingsTypes.SHOW_COLUMN_NAMES,
                newValue: checked,
              })
            }
            checked={inchlibSettings?.show_column_names}
            label="Column IDs"
          />

          <CheckBox
            onChange={({ target: { checked } }) =>
              inchlibSettingsChanged({
                settingName: InchlibSettingsTypes.SHOW_ROW_DENDROGRAM,
                newValue: checked,
              })
            }
            checked={inchlibSettings?.show_row_dendrogram}
            label="Row Dendrogram"
          />

          <CheckBox
            onChange={({ target: { checked } }) =>
              inchlibSettingsChanged({
                settingName: InchlibSettingsTypes.SHOW_COLUMN_DENDROGRAM,
                newValue: checked,
              })
            }
            checked={inchlibSettings?.show_column_dendrogram}
            label="Column Dendrogram"
          />
        </Flex>
      </Field>
      <Field label="Dendrogram Line Width" labelLeft labelWidth="130px" helpText="Thickness of lines in the dendrogram visualization. Thicker lines are easier to see but may clutter the display.">
        <Slider
          max={8}
          min={1}
          value={inchlibSettings?.dendrogram_line_width}
          onChange={({ target: { value } }) =>
            inchlibSettingsChanged({
              settingName: InchlibSettingsTypes.DENDROGRAM_LINE_WIDTH,
              newValue: value,
            })
          }
        />
      </Field>
      <Field label="Dendrogram Width" labelLeft labelWidth="130px" helpText="Maximum width allocated for dendrogram display. Larger values provide more detail but reduce space for the heatmap.">
        <Slider
          max={300}
          min={50}
          value={inchlibSettings?.max_dendrogram_width}
          onChange={({ target: { value } }) => {
            inchlibSettingsChanged({
              settingName: InchlibSettingsTypes.MAX_DENDROGRAM_WIDTH,
              newValue: value,
            });
          }}
        />
      </Field>
    </>
  );
};

const mapStateToProps = ({ settings }) => {
  return {
    inchlibSettings: settings?.inchlib ?? {},
  };
};

const mapDispatchToProps = {
  inchlibSettingsChanged,
};
const MainContainer = connect(
  mapStateToProps,
  mapDispatchToProps
)(InchlibSettings);
export { MainContainer as InchlibSettings };
