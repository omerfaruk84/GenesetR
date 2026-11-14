import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaSearch } from "react-icons/fa";
import { searchGenes } from "../../store/api/genes";
import { genePagePath } from "../../utils/geneLinks";
import styles from "./gene-search.module.scss";

/**
 * Search box with symbol suggestions. Choosing a gene opens its gene page
 * (or calls `onSelect(symbol)` when given).
 */
const GeneSearch = ({
  placeholder = "Search a gene, e.g. ATF4",
  autoFocus = false,
  initialValue = "",
  onSelect,
  size = "md",
}) => {
  const navigate = useNavigate();
  const [text, setText] = useState(initialValue);
  const [results, setResults] = useState([]);
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
      searchGenes(query, { signal: controller.signal })
        .then((rows) => {
          setResults(rows);
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

  const choose = (symbol) => {
    const chosen = String(symbol || "").trim().toUpperCase();
    if (!chosen) return;
    setOpen(false);
    setText(chosen);
    if (onSelect) onSelect(chosen);
    else navigate(genePagePath(chosen));
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
      choose(open && results[active] ? results[active].symbol : text);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  };

  const showList = open && results.length > 0;

  return (
    <div className={`${styles.box} ${size === "lg" ? styles.large : ""}`} ref={boxRef}>
      <FaSearch className={styles.icon} aria-hidden="true" />
      <input
        className={styles.input}
        type="text"
        role="combobox"
        aria-label="Search a gene"
        aria-expanded={showList}
        aria-controls="gene-search-list"
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
      <button type="button" className={styles.go} onClick={() => choose(text)} disabled={!text.trim()}>
        Open
      </button>
      {showList && (
        <ul className={styles.list} id="gene-search-list" role="listbox">
          {results.map((row, index) => (
            <li
              key={row.symbol}
              role="option"
              aria-selected={index === active}
              className={`${styles.option} ${index === active ? styles.optionActive : ""}`}
              onMouseEnter={() => setActive(index)}
              onMouseDown={(event) => {
                event.preventDefault();
                choose(row.symbol);
              }}
            >
              <span className={styles.symbol}>{row.symbol}</span>
              <span className={styles.meta}>
                perturbed in {row.perturbed_in} · measured in {row.measured_in} datasets
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export { GeneSearch };
