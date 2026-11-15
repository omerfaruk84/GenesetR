import React from "react";
import { connect } from "react-redux";
import { Field, Select, Slider } from "@oliasoft-open-source/react-ui-library";
import { genelistcompareSettingsChanged } from "../../../store/settings/genelist-compare-settings";
import { GenelistCompareSettingsTypes } from "./enums";
import styles from "./settings.module.scss";

const DEFAULT_WIDTH_RATIOS = [0.23, 0.4];

/**
 * Figure appearance of the gene list comparison page. The lists themselves,
 * the plot type and the set mode are chosen on the page.
 */
const GenelistCompareSettings = ({ genelistcompareSettings: rawSettings, genelistcompareSettingsChanged }) => {
  const widthRatios =
    Array.isArray(rawSettings?.widthRatios) && rawSettings.widthRatios.length === 2 ? rawSettings.widthRatios : DEFAULT_WIDTH_RATIOS;
  const genelistcompareSettings = { ...rawSettings, widthRatios };
  return (
    <>
      <div style={{ fontSize: 12.5, color: "var(--gs-muted)", margin: "4px 0 12px", lineHeight: 1.45 }}>
        Choose and manage the lists on the page. These settings change how the UpSet plot and Venn diagram look and
        are exported.
      </div>
      <Field //MINIMUM SET NUMBER
        label="Smallest combination shown"
        labelLeft
        labelWidth={150}
        helpText="UpSet columns with fewer genes than this are hidden."
      >
        <div className={styles.inputRange}>
          <Slider
            label={genelistcompareSettings?.minsetmember}
            max={50}
            min={1}
            value={genelistcompareSettings?.minsetmember}
            onChange={({ target: { value } }) =>
              genelistcompareSettingsChanged({
                settingName: GenelistCompareSettingsTypes.MINSETMEMBER,
                newValue: value,
              })
            }
          />
        </div>
      </Field>

      <Field //THEME
        label="Theme"
        labelLeft
        labelWidth={150}
        helpText="Set the color theme for the comparison visualization."
      >
        <Select
          small
          onChange={({ target: { value } }) =>
            genelistcompareSettingsChanged({
              settingName: GenelistCompareSettingsTypes.THEME,
              newValue: value,
            })
          }
          options={["Dark", "Light", "Vega", "Colorful"]}
          value={genelistcompareSettings?.theme}
        />
      </Field>

      <Field //BAR PADDING
        label="Bar Padding"
        labelLeft
        labelWidth={150}
        helpText="Adjust spacing between bars in the comparison chart. Higher values create more space between elements."
      >
        <div className={styles.inputRange}>
          <Slider
            label={genelistcompareSettings?.barpadding}
            max={99}
            min={0}
            value={genelistcompareSettings?.barpadding * 100}
            onChange={({ target: { value } }) =>
              genelistcompareSettingsChanged({
                settingName: GenelistCompareSettingsTypes.BARPADDING,
                newValue: value / 100,
              })
            }
          />
        </div>
      </Field>

      <Field //DOT PADDING
        label="Dot Padding"
        labelLeft
        labelWidth={150}
        //helpText="Set the threshold for maximum number set members for the visibility of the set / intersection"
      >
        <div className={styles.inputRange}>
          <Slider
            label={genelistcompareSettings?.dotpadding}
            max={99}
            min={0}
            value={genelistcompareSettings?.dotpadding * 100}
            onChange={({ target: { value } }) =>
              genelistcompareSettingsChanged({
                settingName: GenelistCompareSettingsTypes.DOTPADDING,
                newValue: value / 100,
              })
            }
          />
        </div>
      </Field>
      <Field //chartfontsize
        label="Chart Font Size"
        labelLeft
        labelWidth={150}
        helpText="Set the chart font size"
      >
        <div className={styles.inputRange}>
          <Slider
            label={genelistcompareSettings?.chartfontsize}
            max={100}
            min={5}
            value={genelistcompareSettings?.chartfontsize}
            onChange={({ target: { value } }) =>
              genelistcompareSettingsChanged({
                settingName: GenelistCompareSettingsTypes.CHARTFONTSIZE,
                newValue: value,
              })
            }
          />
        </div>
      </Field>

      <Field //labelfontsize
        label="Label Font Size"
        labelLeft
        labelWidth={150}
        helpText="Set label font size"
      >
        <div className={styles.inputRange}>
          <Slider
            label={genelistcompareSettings?.labelfontsize}
            max={100}
            min={5}
            value={genelistcompareSettings?.labelfontsize}
            onChange={({ target: { value } }) =>
              genelistcompareSettingsChanged({
                settingName: GenelistCompareSettingsTypes.LABELFONTSIZE,
                newValue: value,
              })
            }
          />
        </div>
      </Field>

      <Field //setlabelfontsize
        label="Set Label Font Size"
        labelLeft
        labelWidth={150}
        helpText="Set font size for set labels specifically"
      >
        <div className={styles.inputRange}>
          <Slider
            label={genelistcompareSettings?.setlabelfontsize}
            max={100}
            min={5}
            value={genelistcompareSettings?.setlabelfontsize}
            onChange={({ target: { value } }) =>
              genelistcompareSettingsChanged({
                settingName: GenelistCompareSettingsTypes.SETLABELFONTSIZE,
                newValue: value,
              })
            }
          />
        </div>
      </Field>

      <Field //venndiagramfontsize
        label="Venn Diagram Font Size"
        labelLeft
        labelWidth={150}
        helpText="Set font size for Venn diagram text"
      >
        <div className={styles.inputRange}>
          <Slider
            label={genelistcompareSettings?.venndiagramfontsize}
            max={100}
            min={5}
            value={genelistcompareSettings?.venndiagramfontsize}
            onChange={({ target: { value } }) =>
              genelistcompareSettingsChanged({
                settingName: GenelistCompareSettingsTypes.VENNDIAGRAMFONTSIZE,
                newValue: value,
              })
            }
          />
        </div>
      </Field>

      <Field //fontfamily
        label="Font Family"
        labelLeft
        labelWidth={150}
        helpText="Set the font family for all text elements"
      >
        <Select
          small
          onChange={({ target: { value } }) =>
            genelistcompareSettingsChanged({
              settingName: GenelistCompareSettingsTypes.FONTFAMILY,
              newValue: value,
            })
          }
          options={[
            "Arial, sans-serif",
            "Helvetica, sans-serif", 
            "Times New Roman, serif",
            "Georgia, serif",
            "Verdana, sans-serif",
            "Tahoma, sans-serif",
            "Trebuchet MS, sans-serif",
            "Courier New, monospace",
            "Lucida Console, monospace",
            "Impact, sans-serif"
          ]}
          value={genelistcompareSettings?.fontfamily}
        />
      </Field>

      <Field //fontweight
        label="Font Weight"
        labelLeft
        labelWidth={150}
        helpText="Set the font weight for text elements"
      >
        <Select
          small
          onChange={({ target: { value } }) =>
            genelistcompareSettingsChanged({
              settingName: GenelistCompareSettingsTypes.FONTWEIGHT,
              newValue: value,
            })
          }
          options={[
            "normal",
            "bold",
            "bolder",
            "lighter",
            "100",
            "200", 
            "300",
            "400",
            "500",
            "600",
            "700",
            "800",
            "900"
          ]}
          value={genelistcompareSettings?.fontweight}
        />
      </Field>

      <Field //fontstyle
        label="Font Style"
        labelLeft
        labelWidth={150}
        helpText="Set the font style for text elements"
      >
        <Select
          small
          onChange={({ target: { value } }) =>
            genelistcompareSettingsChanged({
              settingName: GenelistCompareSettingsTypes.FONTSTYLE,
              newValue: value,
            })
          }
          options={[
            "normal",
            "italic",
            "oblique"
          ]}
          value={genelistcompareSettings?.fontstyle}
        />
      </Field>



      <Field //setheightratio
        label="Combination to Set Height Ratio"
        labelLeft
        labelWidth={150}
        helpText="Set the ratio of height of combination vs set portions of the graph."
      >
        <div className={styles.inputRange}>
          <Slider
            label={genelistcompareSettings?.setheightratio}
            max={100}
            min={5}
            value={genelistcompareSettings?.setheightratio * 100}
            onChange={({ target: { value } }) =>
              genelistcompareSettingsChanged({
                settingName: GenelistCompareSettingsTypes.SETHEIGHTRATIO,
                newValue: value / 100,
              })
            }
          />
        </div>
      </Field>

      <Field //setwidthtratio
        label="Combination to Set Width Ratio"
        labelLeft
        labelWidth={150}
        //helpText="Combination to Set Width Ratio"
      >
        <div className={styles.inputRange}>
          <Slider
            label={(
              1 -
              genelistcompareSettings?.widthRatios[0] -
              genelistcompareSettings?.widthRatios[1]
            ).toFixed(2)}
            max={100}
            min={1}
            step={5}
            value={
              (1 -
                genelistcompareSettings?.widthRatios[0] -
                genelistcompareSettings?.widthRatios[1]) *
              100
            }
            onChange={({ target: { value } }) => {
              const v = Number.parseFloat(value) / 100;
              const sum =
                genelistcompareSettings?.widthRatios[0] +
                genelistcompareSettings?.widthRatios[1];
              const v0 =
                ((1 - v) * genelistcompareSettings?.widthRatios[0]) / sum;
              const v1 =
                ((1 - v) * genelistcompareSettings?.widthRatios[1]) / sum;
              genelistcompareSettingsChanged({
                settingName: GenelistCompareSettingsTypes.WIDTHRATIOS,
                newValue: [v0, v1],
              });
            }}
          />
        </div>
      </Field>

      <Field //settolabel
        label="Set to Label Width Ratio"
        labelLeft
        labelWidth={150}
        //helpText="Set to Label Width Ratio"
      >
        <div className={styles.inputRange}>
          <Slider
            label={(
              genelistcompareSettings?.widthRatios[0] /
              (genelistcompareSettings?.widthRatios[0] +
                genelistcompareSettings?.widthRatios[1])
            ).toFixed(2)}
            max={100}
            min={1}
            step={5}
            value={
              (genelistcompareSettings?.widthRatios[0] /
                (genelistcompareSettings?.widthRatios[0] +
                  genelistcompareSettings?.widthRatios[1])) *
              100
            }
            onChange={({ target: { value } }) => {
              const v = Number.parseFloat(value) / 100;
              const sum =
                genelistcompareSettings?.widthRatios[0] +
                genelistcompareSettings?.widthRatios[1];
              const v0 = v * sum;
              const v1 = (1 - v) * sum;
              genelistcompareSettingsChanged({
                settingName: GenelistCompareSettingsTypes.WIDTHRATIOS,
                newValue: [v0, v1],
              });
            }}
          />
        </div>
      </Field>
    </>
  );
};

const mapStateToProps = ({ settings }) => ({
  genelistcompareSettings: settings?.genelistcompare ?? {},
});
const mapDispatchToProps = {
  genelistcompareSettingsChanged,
};

const MainContainer = connect(mapStateToProps, mapDispatchToProps)(GenelistCompareSettings);
export { MainContainer as GenelistCompareSettings };
