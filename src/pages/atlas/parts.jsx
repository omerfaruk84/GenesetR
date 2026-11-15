import React, { useEffect, useId, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ATLAS_AXES, AXIS_TEXT, percent } from "../../utils/atlas";
import { divergingColor } from "../../utils/regulators";
import styles from "./atlas-page.module.scss";

export const plural = (count, noun) => `${Number(count || 0).toLocaleString("en-US")} ${noun}${count === 1 ? "" : "s"}`;

export const fmt = (value, digits = 2) =>
  typeof value === "number" && Number.isFinite(value) ? value.toFixed(digits) : "–";

export const slug = (text) =>
  String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/** A number on the blue-white-red scale that the consensus tables use. */
export const Score = ({ value, limit = 6, digits = 2 }) => (
  <span className={styles.value} style={{ background: divergingColor(value, limit) }}>
    {fmt(value, digits)}
  </span>
);

/** Confidence of a predicted function as a bar and a percentage. */
export const Confidence = ({ value }) => {
  if (typeof value !== "number" || !Number.isFinite(value)) return <span className={styles.muted}>–</span>;
  return (
    <span className={styles.confidence} title="Share of equally strong predictions that are an existing annotation; a lower bound">
      <span className={styles.confidenceBar} aria-hidden="true">
        <span style={{ width: `${Math.round(100 * Math.max(0, Math.min(1, value)))}%` }} />
      </span>
      {percent(value)}
    </span>
  );
};

/** Marker for a partner whose promoter lies within 5 kb of the gene's (a possible neighbour effect of CRISPRi). */
export const NeighbourMark = ({ genes }) => (
  <span
    className={`${styles.mark} ${styles.markWarn}`}
    data-testid="neighbour-mark"
    title={
      genes && genes.length > 0
        ? `Rests on ${genes.join(", ")}, whose promoter lies within 5 kb of this gene's: CRISPRi may silence both, so the knock-down may copy its neighbour`
        : "The promoters of the two genes lie within 5 kb of each other: CRISPRi may silence both, so the similarity may be a neighbour effect"
    }
  >
    neighbour
  </span>
);

/** Marker for a partner whose own mRNA falls under the knock-down of the gene (a possible collateral knock-down). */
export const CollateralMark = ({ genes }) => (
  <span
    className={`${styles.mark} ${styles.markWarn}`}
    data-testid="collateral-mark"
    title={
      genes && genes.length > 0
        ? `Rests on ${genes.join(", ")}, whose own mRNA falls under this knock-down: the guides may silence that gene too, so the prediction may describe it instead`
        : "The mRNA of this partner falls under the knock-down of the gene: the guides may silence it too, so the similarity may be a collateral effect"
    }
  >
    collateral
  </span>
);

/** Marker for a row whose gene belongs to the module or gene set itself. */
export const MemberMark = ({ title }) => (
  <span className={styles.mark} data-testid="member-mark" title={title}>
    member
  </span>
);

/** Knock-downs / Co-regulated genes: `to(axis)` gives the address of each choice. */
export const AxisToggle = ({ axis, to }) => (
  <span className={styles.control} role="group" aria-label="Map">
    {ATLAS_AXES.map((id) => (
      <Link
        key={id}
        className={id === axis ? styles.chipActive : styles.chip}
        aria-current={id === axis ? "true" : undefined}
        title={AXIS_TEXT[id].about}
        to={to(id)}
      >
        {AXIS_TEXT[id].label}
      </Link>
    ))}
  </span>
);

/** A row of chips for one value; `onChange(choice)`. */
export const Choice = ({ label, title, choices, value, onChange, format = (choice) => choice }) => (
  <span className={styles.control} title={title}>
    {label}
    {choices.map((choice) => (
      <button
        key={choice}
        type="button"
        className={choice === value ? styles.chipActive : styles.chip}
        aria-pressed={choice === value}
        aria-label={`${label} ${format(choice)}`}
        onClick={() => onChange(choice)}
      >
        {format(choice)}
      </button>
    ))}
  </span>
);

/**
 * Text box with a list of suggestions.
 *   options   [{ key, label, hint }] for the typed text (the caller computes or fetches them)
 *   onText    (text) => void   the typed text changed
 *   onChoose  (option) => void a suggestion was chosen
 *   onSubmit  (text) => void   Enter or the button without a suggestion (optional)
 */
export const Typeahead = ({ label, placeholder, initialValue = "", options = [], onText, onChoose, onSubmit, button = "Show", wide = false }) => {
  const listId = useId();
  const [text, setText] = useState(initialValue);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const boxRef = useRef(null);

  useEffect(() => setText(initialValue), [initialValue]);
  useEffect(() => setActive(0), [options]);

  useEffect(() => {
    const onDocumentClick = (event) => {
      if (boxRef.current && !boxRef.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocumentClick);
    return () => document.removeEventListener("mousedown", onDocumentClick);
  }, []);

  const change = (value) => {
    setText(value);
    setOpen(true);
    if (onText) onText(value);
  };

  const choose = (option) => {
    setOpen(false);
    setText(option.label);
    onChoose(option);
  };

  const submit = () => {
    if (open && options[active]) choose(options[active]);
    else if (onSubmit && text.trim()) {
      setOpen(false);
      onSubmit(text.trim());
    } else if (options[0]) choose(options[0]);
  };

  const onKeyDown = (event) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActive((index) => Math.min(index + 1, Math.max(options.length - 1, 0)));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      submit();
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  };

  const showList = open && options.length > 0;

  return (
    <div className={`${styles.typeahead} ${wide ? styles.typeaheadWide : ""}`} ref={boxRef}>
      <input
        className={styles.typeaheadInput}
        type="text"
        role="combobox"
        aria-label={label}
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        autoComplete="off"
        spellCheck={false}
        placeholder={placeholder}
        value={text}
        onChange={(event) => change(event.target.value)}
        onFocus={() => {
          setOpen(true);
          if (onText) onText(text);
        }}
        onKeyDown={onKeyDown}
      />
      <button type="button" className={styles.typeaheadGo} onClick={submit} disabled={!text.trim()}>
        {button}
      </button>
      {showList && (
        <ul className={styles.typeaheadList} id={listId} role="listbox">
          {options.map((option, index) => (
            <li
              key={option.key}
              role="option"
              aria-selected={index === active}
              className={`${styles.typeaheadOption} ${index === active ? styles.typeaheadOptionActive : ""}`}
              onMouseEnter={() => setActive(index)}
              onMouseDown={(event) => {
                event.preventDefault();
                choose(option);
              }}
            >
              <span>{option.label}</span>
              {option.hint && <span className={styles.typeaheadHint}>{option.hint}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

/** A value that follows `value` after it has been stable for `delay` ms. */
export const useDebounced = (value, delay = 250) => {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return settled;
};
