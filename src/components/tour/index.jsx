import React, { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ROUTES } from "../../common/routes";
import styles from "./tour.module.scss";

/**
 * Steps of the guided tour. `target` is a CSS selector (elements carry
 * `data-tour` attributes); `route` is opened first when given. A step whose
 * target is not on the page is shown centred, without a highlight.
 */
const STEPS = [
  {
    route: ROUTES.HOME,
    target: '[data-tour="nav"]',
    title: "Start from your question",
    text: "The menu is organised by what you want to know: about one gene, about a gene list, across cell types, about mechanisms, or about your own data. Each entry says what the page does.",
  },
  {
    target: '[data-tour="home-search"]',
    title: "Look up a gene",
    text: "Type a symbol to open its gene page: what happens when it is knocked down, what changes its expression, and which perturbations look like it, in every dataset.",
  },
  {
    route: ROUTES.CORRELATION,
    target: '[data-tour="datasets"]',
    title: "Choose the dataset",
    text: "Every analysis page has its settings on the left. Pick the Perturb-seq dataset(s) here; the filter narrows the list and “About the datasets” opens the catalog.",
  },
  {
    target: '[data-tour="genelist"]',
    title: "Enter your genes",
    text: "Paste a gene list (one per line, or separated by commas). “Example” loads a curated set such as the Mediator complex, and unknown symbols are flagged below the box.",
  },
  {
    target: '[data-tour="run"]',
    title: "Run the analysis",
    text: "The button says what is still missing while it is disabled. Results appear on the right; clusters and selections there have a “Send to…” menu that opens them in another module.",
  },
  {
    target: '[data-tour="share"]',
    title: "Share and reproduce",
    text: "Copy a link that restores this page with all its settings, the request as a Python script or curl command, or a methods and citation text for your paper.",
  },
  {
    target: '[data-tour="workspace"]',
    title: "Keep your gene lists",
    text: "Saved gene lists live in the workspace and are available in every module. Export them to a file to keep a copy.",
  },
];

const PADDING = 6;

const rectOf = (selector) => {
  const element = selector ? document.querySelector(selector) : null;
  if (!element) return null;
  const rect = element.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return null;
  return { top: rect.top, left: rect.left, width: rect.width, height: rect.height };
};

/** Guided tour overlay. Rendered once (in the main view); start it with startTour(). */
const Tour = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [index, setIndex] = useState(-1);
  const [rect, setRect] = useState(null);
  const step = index >= 0 ? STEPS[index] : null;

  const stop = useCallback(() => setIndex(-1), []);

  useEffect(() => {
    const onStart = () => setIndex(0);
    window.addEventListener("genesetr:start-tour", onStart);
    return () => window.removeEventListener("genesetr:start-tour", onStart);
  }, []);

  // Open the page a step belongs to
  useEffect(() => {
    if (step?.route && step.route !== pathname) navigate(step.route);
  }, [step, pathname, navigate]);

  // Find the target (it may appear a moment after a page change) and follow it
  useLayoutEffect(() => {
    if (!step) return undefined;
    let attempts = 0;
    let timer = null;
    const locate = () => {
      const element = step.target ? document.querySelector(step.target) : null;
      if (element && attempts === 0) element.scrollIntoView({ block: "nearest", inline: "nearest" });
      const found = rectOf(step.target);
      setRect(found);
      attempts += 1;
      if (!found && attempts < 20) timer = setTimeout(locate, 150);
    };
    setRect(null);
    timer = setTimeout(locate, 60);
    const onResize = () => setRect(rectOf(step.target));
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
    };
  }, [step, pathname]);

  useEffect(() => {
    if (!step) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") stop();
      if (event.key === "ArrowRight") setIndex((i) => (i < STEPS.length - 1 ? i + 1 : -1));
      if (event.key === "ArrowLeft") setIndex((i) => Math.max(0, i - 1));
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [step, stop]);

  if (!step) return null;

  const last = index === STEPS.length - 1;
  const viewportW = window.innerWidth;
  const viewportH = window.innerHeight;
  const CARD_W = Math.min(360, viewportW - 24);
  let cardStyle = { top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: CARD_W };
  if (rect) {
    const below = rect.top + rect.height + PADDING + 12;
    const placeBelow = below + 190 < viewportH;
    const left = Math.max(12, Math.min(rect.left, viewportW - CARD_W - 12));
    cardStyle = placeBelow
      ? { top: below, left, width: CARD_W }
      : { top: Math.max(12, rect.top - PADDING - 12 - 200), left: rect.left + rect.width + 16 + CARD_W < viewportW ? rect.left + rect.width + 16 : left, width: CARD_W };
    // Tall targets (the sidebar blocks): put the card beside them
    if (!placeBelow && rect.left + rect.width + 16 + CARD_W < viewportW) {
      cardStyle = { top: Math.max(12, Math.min(rect.top, viewportH - 230)), left: rect.left + rect.width + 16, width: CARD_W };
    }
  }

  return (
    <div className={styles.layer} role="dialog" aria-modal="true" aria-label={`Tour, step ${index + 1} of ${STEPS.length}`}>
      {rect ? (
        <div
          className={styles.spotlight}
          style={{
            top: rect.top - PADDING,
            left: rect.left - PADDING,
            width: rect.width + PADDING * 2,
            height: rect.height + PADDING * 2,
          }}
        />
      ) : (
        <div className={styles.dim} />
      )}
      <div className={styles.card} style={cardStyle}>
        <div className={styles.progress}>
          Step {index + 1} of {STEPS.length}
        </div>
        <h3>{step.title}</h3>
        <p>{step.text}</p>
        <div className={styles.buttons}>
          <button type="button" className={styles.link} onClick={stop}>
            {last ? "Close" : "Skip the tour"}
          </button>
          <span className={styles.spacer} />
          {index > 0 && (
            <button type="button" className={styles.secondary} onClick={() => setIndex(index - 1)}>
              Back
            </button>
          )}
          {!last && (
            <button type="button" className={styles.primary} autoFocus onClick={() => setIndex(index + 1)}>
              Next
            </button>
          )}
          {last && (
            <button type="button" className={styles.primary} autoFocus onClick={stop}>
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

/** Start the guided tour from anywhere. */
export const startTour = () => window.dispatchEvent(new Event("genesetr:start-tour"));

export { Tour };
