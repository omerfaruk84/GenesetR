import React, { useEffect, useRef, useState } from "react";
import UpSetJS, { VennDiagram } from "@upsetjs/react";
import { lab } from "d3-color";
import { saveAs } from "file-saver";
import { FaDownload } from "react-icons/fa";
import { Panel, ToolbarButton } from "../ui";
import styles from "./genelist-compare-page.module.scss";

/** Set modes offered on the page, as indices into COMBINATION_TYPES (the stored setting). */
export const COMBINATION_TYPES = ["intersection", "union", "composite", "distinctIntersection"];
export const MODE_OPTIONS = [
  { value: 3, label: "Exclusive intersections", hint: "Each gene is counted once, in the exact combination of lists that contain it (as in the Venn diagram)" },
  { value: 0, label: "Inclusive intersections", hint: "Genes shared by the lists of a column, whatever other lists they are also in" },
  { value: 1, label: "Unions", hint: "Genes in any of the lists of a column" },
];
export const VENN_MAX_SETS = 5;

const stamp = () => new Date().toISOString().slice(0, 10);

const mergeColors = (colors) => {
  if (colors.length === 0) return undefined;
  if (colors.length === 1) return colors[0];
  const sum = colors.reduce(
    (acc, d) => {
      const c = lab(d || "transparent");
      return { l: acc.l + c.l, a: acc.a + c.a, b: acc.b + c.b };
    },
    { l: 0, a: 0, b: 0 }
  );
  return lab(sum.l / colors.length, sum.a / colors.length, sum.b / colors.length).toString();
};

/** Width of an element, kept up to date. */
const useWidth = (ref) => {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const update = () => setWidth(el.clientWidth);
    update();
    if (typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);
  return width;
};

const svgText = (svg, font, background) => {
  const clone = svg.cloneNode(true);
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("style", `font-family: ${font.family}; font-weight: ${font.weight}; font-style: ${font.style}; background: ${background}`);
  // Leave out UpSetJS's own export links if present
  clone.querySelectorAll("[class*='exportButtons']").forEach((node) => node.remove());
  return new XMLSerializer().serializeToString(clone);
};

const exportSvg = (svg, name, font, background) => {
  saveAs(new Blob([svgText(svg, font, background)], { type: "image/svg+xml;charset=utf-8" }), `${name}-${stamp()}.svg`);
};

const exportPng = (svg, name, font, background) => {
  const { width, height } = svg.getBoundingClientRect();
  const scale = 3; // print resolution
  const url = URL.createObjectURL(new Blob([svgText(svg, font, background)], { type: "image/svg+xml;charset=utf-8" }));
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(width * scale);
    canvas.height = Math.ceil(height * scale);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(url);
    canvas.toBlob((blob) => blob && saveAs(blob, `${name}-${stamp()}.png`), "image/png");
  };
  img.src = url;
};

/**
 * UpSet plot or Venn diagram of the selected lists.
 *   sets, combinations   from extractCombinations
 *   selection            highlighted set-like or array of elements
 *   onSelect(combination) a column / region was clicked
 */
const OverlapPlots = ({
  sets,
  combinations,
  view,
  onViewChange,
  mode,
  onModeChange,
  selection,
  onHover,
  onSelect,
  settings,
  plot,
}) => {
  const bodyRef = useRef(null);
  const plotRef = useRef(null);
  const width = useWidth(bodyRef);
  const vennAllowed = sets.length >= 2 && sets.length <= VENN_MAX_SETS;
  const shownView = view === "venn" && !vennAllowed ? "upset" : view;

  const font = {
    family: settings?.fontfamily || "Arial, sans-serif",
    weight: settings?.fontweight || "normal",
    style: settings?.fontstyle || "normal",
  };
  const chartFont = (settings?.chartfontsize || 13) + "px";
  const minSize = Math.max(1, Number(settings?.minsetmember) || 1);
  const shownCombinations = combinations.filter((c) => c.elems.length >= minSize);
  const hiddenCount = combinations.length - shownCombinations.length;

  const plotWidth = Math.max(320, (width || 800) - 24);
  const upsetWidth = Math.min(plotWidth, Math.max(680, shownCombinations.length * 36 + 440));
  const vennWidth = Math.min(plotWidth, 720);

  const download = (kind) => {
    const svg = plotRef.current?.querySelector("svg");
    if (!svg) return;
    const name = shownView === "venn" ? "genelist-venn" : "genelist-upset";
    if (kind === "svg") exportSvg(svg, name, font, plot.background);
    else exportPng(svg, name, font, plot.background);
  };

  const modeHint = MODE_OPTIONS.find((m) => m.value === mode)?.hint;

  return (
    <Panel
      title="Overlaps"
      subtitle={shownView === "venn" ? "Venn diagram" : `UpSet plot · ${shownCombinations.length} combinations`}
      data-testid="genelist-overlaps"
      actions={
        <>
          <div className={styles.segmented} role="group" aria-label="Plot type">
            <button type="button" aria-pressed={shownView === "upset"} onClick={() => onViewChange("upset")}>
              UpSet
            </button>
            <button
              type="button"
              aria-pressed={shownView === "venn"}
              disabled={!vennAllowed}
              title={vennAllowed ? undefined : `A Venn diagram shows 2–${VENN_MAX_SETS} lists`}
              onClick={() => onViewChange("venn")}
            >
              Venn
            </button>
          </div>
          {shownView === "upset" && (
            <select
              className={styles.select}
              value={mode}
              onChange={(e) => onModeChange(Number(e.target.value))}
              aria-label="Set mode"
              title={modeHint}
            >
              {MODE_OPTIONS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          )}
          <ToolbarButton size="sm" icon={<FaDownload size={11} />} onClick={() => download("svg")} title="Vector graphic for figures">
            SVG
          </ToolbarButton>
          <ToolbarButton size="sm" icon={<FaDownload size={11} />} onClick={() => download("png")} title="Image at 3× resolution">
            PNG
          </ToolbarButton>
        </>
      }
    >
      <div ref={bodyRef} className={styles.plotBody}>
        <div
          ref={plotRef}
          className={`${styles.plotCanvas} ${shownView === "venn" ? "venndiagram" : "upsetjs"}`}
          style={{
            background: plot.background,
            fontFamily: font.family,
            fontWeight: font.weight,
            fontStyle: font.style,
            "--venn-font-size": (settings?.venndiagramfontsize || 16) + "px",
          }}
        >
          {shownView === "venn" ? (
            <VennDiagram
              id="venndiagram"
              sets={sets}
              combinations={plot.colorful ? { mergeColors } : undefined}
              width={vennWidth}
              height={Math.round(Math.min(440, vennWidth * 0.62))}
              padding={24}
              selection={selection}
              onHover={onHover}
              onClick={(c) => c && onSelect(c)}
              theme={plot.theme}
              {...plot.colors}
              exportButtons={false}
              fontFamily={font.family}
              fontSizes={{
                setLabel: (settings?.venndiagramfontsize || 16) + "px",
                valueLabel: (settings?.venndiagramfontsize || 16) + "px",
              }}
            />
          ) : (
            <UpSetJS
              id="upsetcompare"
              sets={sets}
              combinations={shownCombinations}
              width={upsetWidth}
              height={Math.max(320, 220 + sets.length * 26)}
              selection={selection}
              onHover={onHover}
              onClick={(c) => c && onSelect(c)}
              theme={plot.theme}
              {...plot.colors}
              exportButtons={false}
              barPadding={settings?.barpadding ?? 0.3}
              dotPadding={settings?.dotpadding ?? 0.7}
              widthRatios={settings?.widthRatios}
              heightRatios={[settings?.setheightratio || 0.6]}
              combinationName={MODE_OPTIONS.find((m) => m.value === mode)?.label || "Intersection size"}
              setName="List size"
              fontFamily={font.family}
              fontSizes={{
                chartLabel: chartFont,
                setLabel: (settings?.setlabelfontsize || settings?.labelfontsize || 13) + "px",
                axisTick: chartFont,
                barLabel: chartFont,
              }}
            />
          )}
        </div>
        <div className={styles.plotFoot}>
          <span>Hover to highlight, click a {shownView === "venn" ? "region" : "bar or column"} to list its genes below.</span>
          {shownView === "upset" && hiddenCount > 0 && (
            <span>
              {hiddenCount} combination{hiddenCount === 1 ? "" : "s"} with fewer than {minSize} genes hidden (sidebar).
            </span>
          )}
        </div>
      </div>
    </Panel>
  );
};

export default OverlapPlots;
