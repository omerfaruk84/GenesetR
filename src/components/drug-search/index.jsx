import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaSearch } from "react-icons/fa";
import { searchDrugs } from "../../store/api/drugs";
import { drugPagePath } from "../../utils/perturbationKind";
import styles from "../gene-search/gene-search.module.scss";
import own from "./drug-search.module.scss";

const MATCH_LABEL = { target: "target", mechanism: "mechanism" };

/** Second line of a suggestion: mechanism and annotated targets. */
const about = (drug) =>
  [
    drug.moaFine || drug.moaBroad,
    drug.targets?.length > 0 ? `targets ${drug.targets.slice(0, 4).join(", ")}${drug.targets.length > 4 ? "…" : ""}` : "",
  ]
    .filter(Boolean)
    .join(" · ");

/**
 * Search box for drugs: by name, by target gene or by mechanism. Choosing a
 * drug opens its drug page, or calls `onSelect(drug)` when given (the box is
 * then cleared, so several drugs can be added one after the other).
 */
const DrugSearch = ({
  placeholder = "Search a drug, a target or a mechanism, e.g. bortezomib",
  autoFocus = false,
  initialValue = "",
  onSelect,
  size = "md",
  buttonLabel = "Open",
}) => {
  const navigate = useNavigate();
  const [text, setText] = useState(initialValue);
  const [results, setResults] = useState([]);
  const [searched, setSearched] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const boxRef = useRef(null);

  useEffect(() => setText(initialValue), [initialValue]);

  // Fetch suggestions shortly after the user stops typing
  useEffect(() => {
    const query = text.trim();
    if (!query || !open) {
      setResults([]);
      return undefined;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      searchDrugs(query, { signal: controller.signal })
        .then((rows) => {
          setResults(rows);
          setSearched(query);
          setActive(0);
        })
        .catch(() => {});
    }, 150);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [text, open]);

  useEffect(() => {
    const onDocumentClick = (event) => {
      if (boxRef.current && !boxRef.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocumentClick);
    return () => document.removeEventListener("mousedown", onDocumentClick);
  }, []);

  const choose = (drug) => {
    if (!drug?.id) return;
    setOpen(false);
    if (onSelect) {
      setText("");
      onSelect(drug);
    } else {
      setText(drug.name || drug.id);
      navigate(drugPagePath(drug.id));
    }
  };

  // Enter or the button without a highlighted suggestion: the best match, or
  // the typed text as an id (the drug page says so when it is unknown).
  const chooseTyped = () => {
    if (results[active]) {
      choose(results[active]);
      return;
    }
    const typed = text.trim();
    if (!typed) return;
    if (!onSelect) {
      setOpen(false);
      navigate(drugPagePath(typed.replace(/\s+/g, "-")));
    }
  };

  const onKeyDown = (event) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, Math.max(results.length - 1, 0)));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      chooseTyped();
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  };

  const showList = open && results.length > 0;
  const nothingFound = open && results.length === 0 && searched && searched === text.trim();

  return (
    <div
      className={`${styles.box} ${size === "lg" ? styles.large : ""} ${size === "sm" ? own.small : ""}`}
      ref={boxRef}
    >
      <FaSearch className={styles.icon} aria-hidden="true" />
      <input
        className={styles.input}
        type="text"
        role="combobox"
        aria-label="Search a drug"
        aria-expanded={showList}
        aria-controls="drug-search-list"
        aria-autocomplete="list"
        autoComplete="off"
        spellCheck={false}
        autoFocus={autoFocus}
        placeholder={placeholder}
        value={text}
        onChange={(event) => {
          setText(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
      />
      <button type="button" className={styles.go} onClick={chooseTyped} disabled={!text.trim()}>
        {buttonLabel}
      </button>
      {showList && (
        <ul className={styles.list} id="drug-search-list" role="listbox">
          {results.map((drug, index) => (
            <li
              key={drug.id}
              role="option"
              aria-selected={index === active}
              className={`${styles.option} ${own.option} ${index === active ? styles.optionActive : ""}`}
              onMouseEnter={() => setActive(index)}
              onMouseDown={(event) => {
                event.preventDefault();
                choose(drug);
              }}
            >
              <span className={styles.symbol}>
                {drug.name || drug.id}
                {MATCH_LABEL[drug.match] && <span className={own.match}>matched by {MATCH_LABEL[drug.match]}</span>}
              </span>
              <span className={`${styles.meta} ${own.meta}`}>{about(drug) || "No annotated target"}</span>
            </li>
          ))}
        </ul>
      )}
      {nothingFound && (
        <div className={`${styles.list} ${own.empty}`} role="status">
          No drug matches “{searched}”.
        </div>
      )}
    </div>
  );
};

export { DrugSearch };
