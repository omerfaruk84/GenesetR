import React, { useEffect, useState } from "react";
import { CLASS_ABOUT, CLASS_LABELS, CLASS_MARKS, INTERACTION_CLASSES, classColor } from "../../utils/interactions";
import { usePalette } from "../../utils/theme";
import styles from "./interactions-page.module.scss";

export const fmt = (value, digits = 2) =>
  typeof value === "number" && Number.isFinite(value) ? value.toFixed(digits) : "–";

export const count = (value) => Number(value || 0).toLocaleString("en-US");

export const plural = (number, noun) => `${count(number)} ${noun}${number === 1 ? "" : "s"}`;

export const slug = (text) =>
  String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/** A q-value: 3.2e-12, 0.004, or "< 1e-300" when it underflowed to zero. */
export const formatQ = (value) => {
  if (typeof value !== "number" || !Number.isFinite(value)) return "–";
  if (value === 0) return "< 1e-300";
  if (value < 0.001) return value.toExponential(1);
  return value.toFixed(3);
};

/** True while the window is at most `width` px wide (charts then break their axis titles in two lines). */
export const useNarrow = (width = 560) => {
  const query = `(max-width: ${width}px)`;
  const [narrow, setNarrow] = useState(() => typeof window !== "undefined" && !!window.matchMedia && window.matchMedia(query).matches);
  useEffect(() => {
    if (!window.matchMedia) return undefined;
    const media = window.matchMedia(query);
    const update = () => setNarrow(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [query]);
  return narrow;
};

/** SVG path of the "plus" mark, also given to ECharts as `path://`. */
export const PLUS_PATH = "M4 0h4v4h4v4h-4v4h-4v-4h-4v-4h4z";

/** The mark of a class as the chart draws it: colour and shape together. */
export const ClassMark = ({ id, size = 11 }) => {
  const palette = usePalette();
  const mark = CLASS_MARKS[id] || CLASS_MARKS.additive;
  const color = classColor(id, palette);
  const paint = mark.hollow ? { fill: "none", stroke: color, strokeWidth: 1.6 } : { fill: color };
  let shape = <circle cx="6" cy="6" r={mark.hollow ? 4.2 : 5} {...paint} />;
  if (mark.symbol === "triangle") shape = <path d="M6 0.8L11.6 11H0.4z" transform={mark.rotate ? "rotate(180 6 6)" : undefined} {...paint} />;
  if (mark.symbol === "rect") shape = <rect x="1.2" y="1.2" width="9.6" height="9.6" {...paint} />;
  if (mark.symbol === "diamond") shape = <path d="M6 0.4L11.6 6L6 11.6L0.4 6z" {...paint} />;
  if (mark.symbol === "plus") shape = <path d={PLUS_PATH} {...paint} />;
  return (
    <svg className={styles.classMark} width={size} height={size} viewBox="0 0 12 12" aria-hidden="true">
      {shape}
    </svg>
  );
};

/** Mark and name of a class, as shown in the table and in the heading of a pair. */
export const ClassName = ({ id, labels }) => (
  <span className={styles.className} title={CLASS_ABOUT[id]}>
    <ClassMark id={id} />
    {labels?.[id] || CLASS_LABELS[id] || id}
  </span>
);

/** "How to read this": the numbers and the classes in plain words. */
export const HowToRead = ({ labels, fdr = 0.05 }) => (
  <details className={styles.how} data-testid="interactions-how" open>
    <summary>How to read this</summary>
    <div className={styles.howBody}>
      <dl className={styles.terms}>
        <dt>Response</dt>
        <dd>
          The change of every measured gene when a gene, or a pair, is switched on, compared with control cells. Only
          genes that respond in the pair or in one of the two genes alone (|z| of 3 or more) enter the numbers below.
        </dd>
        <dt>Weights</dt>
        <dd>
          The pair's response written as a mix of the two single responses: weight A times the response to gene A plus
          weight B times the response to gene B. Weights of 1 and 1 are a plain sum.
        </dd>
        <dt>Fit</dt>
        <dd>The share of the pair's response that this mix explains, from 0 to 1. A low fit means the pair does something new.</dd>
        <dt>Magnitude</dt>
        <dd>The size of the pair's response divided by the size of the sum of the two single responses. 1 means as large as the sum.</dd>
        <dt>Similarity</dt>
        <dd>The correlation of the two single responses: 1 when the two genes alone do the same thing.</dd>
        <dt>Genes off the sum</dt>
        <dd>
          Genes whose change in the pair differs from the sum of their changes in the two single genes, at a false
          discovery rate of {Math.round(100 * fdr)} %. The interaction z is that difference divided by its standard error.
        </dd>
      </dl>
      <dl className={styles.terms}>
        {INTERACTION_CLASSES.map((id) => (
          <React.Fragment key={id}>
            <dt>
              <ClassMark id={id} /> {labels?.[id] || CLASS_LABELS[id]}
            </dt>
            <dd>{CLASS_ABOUT[id]}</dd>
          </React.Fragment>
        ))}
      </dl>
    </div>
  </details>
);
