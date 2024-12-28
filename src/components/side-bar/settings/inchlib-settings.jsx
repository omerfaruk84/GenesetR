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
  useEffect(() => {
    // Safety check in case color_scale is missing or invalid
    if (
      !inchlibSettings.color_scale?.start ||
      !inchlibSettings.color_scale?.end
    ) {
      return;
    }

    // Query the slider DOM node (assuming only ONE slider on this page;
    // if multiple, you'd need something more specific, like a ref or a custom class)
    const sliderEl = document.querySelector(".multi-range-slider");
    if (!sliderEl) return;

    // 3) Compute your colors from the color scale
    const colorScale = inchlibSettings.color_scale;
    const startColor = rgbString(colorScale.start);
    const endColor = rgbString(colorScale.end);
    const gradient = get3StopGradient(colorScale); // 2 or 3-stop gradient

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
  }, [inchlibSettings.color_scale]);

  return (
    <>
      <Field label="Color Scale">
        <ColorGradientSelector
          colorScale={inchlibSettings.color_scale}
          onChange={(value) =>
            inchlibSettingsChanged({
              settingName: InchlibSettingsTypes.COLOR_SCALE,
              newValue: value,
            })
          }
        />

        <MultiRangeSlider
          min={-1}
          labels={[
            "-1",
            "-0.8",
            "-0.6,",
            "-0.4",
            "-0.2",
            "0",
            "0.2",
            "0.4",
            "0.6",
            "0.8",
            "1",
          ]}
          style={{
            width: "100%",
            border: "none",
            boxShadow: "none",
          }}
          max={1}
          step={0.1}
          minValue={-0.8}
          maxValue={0.8}
          subSteps={1}
          onInput={(e) => {
            inchlibSettingsChanged({
              settingName: InchlibSettingsTypes.COLOR_PERCENTILE,
              newValue: e,
            });
          }}
        />
      </Field>

      <Field labelLeft>
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
      <Field label="Dendrogram Line Width" labelLeft labelWidth="130px">
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
      <Field label="Dendrogram Width" labelLeft labelWidth="130px">
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
