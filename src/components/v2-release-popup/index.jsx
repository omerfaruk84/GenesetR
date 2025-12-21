import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "../../common/routes";
import styles from "./v2-release-popup.module.scss";

const STORAGE_KEY = "genesetr.v2.releasePopup.dismissed.v1";

const prefersReducedMotion = () => {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
};

const V2ReleasePopup = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [disableForThisBrowser, setDisableForThisBrowser] = useState(true);
  const modalRef = useRef(null);
  const canvasRef = useRef(null);

  const isDevEnv = process.env.NODE_ENV !== "production";
  const apiBaseUrl = useMemo(
    () => (isDevEnv ? "http://localhost:8443" : "https://genesetr.uio.no/api"),
    [isDevEnv]
  );

  useEffect(() => {
    try {
      const dismissed = localStorage.getItem(STORAGE_KEY) === "1";
      if (!dismissed) {
        const timer = setTimeout(() => setOpen(true), 350);
        return () => clearTimeout(timer);
      }
    } catch (e) {
      setOpen(true);
    }
  }, []);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e) => {
      if (e.key === "Escape") setOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (prefersReducedMotion()) return;

    const canvas = canvasRef.current;
    const container = modalRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let rafId = 0;
    let burstTimer = 0;
    let lastTs = 0;
    let width = 0;
    let height = 0;

    const particles = [];
    const palette = [
      "#ff4d6d",
      "#ffd166",
      "#06d6a0",
      "#4dabf7",
      "#b197fc",
      "#ff922b",
      "#f783ac",
    ];

    const resize = () => {
      const rect = container.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      const dpr = Math.max(1, window.devicePixelRatio || 1);
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();

    const createBurst = () => {
      const x = width * (0.15 + Math.random() * 0.7);
      const y = height * (0.15 + Math.random() * 0.35);
      const count = 60;

      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1.2 + Math.random() * 3.2;
        particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 600 + Math.random() * 650,
          age: 0,
          size: 1.5 + Math.random() * 2.2,
          color: palette[(Math.random() * palette.length) | 0],
        });
      }
    };

    const tick = (ts) => {
      if (!lastTs) lastTs = ts;
      const dt = Math.min(34, ts - lastTs);
      lastTs = ts;

      ctx.clearRect(0, 0, width, height);
      ctx.save();
      ctx.globalCompositeOperation = "lighter";

      const gravity = 0.004 * dt;
      const drag = Math.pow(0.993, dt);

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.age += dt;
        if (p.age >= p.life) {
          particles.splice(i, 1);
          continue;
        }

        p.vx *= drag;
        p.vy = p.vy * drag + gravity;
        p.x += p.vx * (dt / 16);
        p.y += p.vy * (dt / 16);

        const t = 1 - p.age / p.life;
        const alpha = Math.max(0, Math.min(1, t));

        ctx.beginPath();
        ctx.fillStyle = `${p.color}${Math.round(alpha * 255)
          .toString(16)
          .padStart(2, "0")}`;
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
      rafId = requestAnimationFrame(tick);
    };

    burstTimer = window.setInterval(createBurst, 950);
    createBurst();
    rafId = requestAnimationFrame(tick);

    const onResize = () => resize();
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      window.clearInterval(burstTimer);
      cancelAnimationFrame(rafId);
    };
  }, [open]);

  const dismiss = () => {
    if (disableForThisBrowser) {
      try {
        localStorage.setItem(STORAGE_KEY, "1");
      } catch (e) {
        // ignore
      }
    }
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div
      className={styles.backdrop}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
      aria-hidden={false}
    >
      <div className={styles.modal} ref={modalRef} role="dialog" aria-modal="true" aria-labelledby="v2-title">
        <canvas className={styles.fireworks} ref={canvasRef} />

        <div className={styles.content}>
          <div className={styles.header}>
            <div className={styles.badge}>Version 2</div>
            <h2 id="v2-title" className={styles.title}>
              GeneSetR v2 is here
            </h2>
            <button className={styles.close} onClick={() => setOpen(false)} aria-label="Close">
              {"\u00D7"}
            </button>
          </div>

          <p className={styles.subtitle}>
            New datasets, new modules, uploads, performance fixes, and programmatic API access.
          </p>

          <div className={styles.grid}>
            <div className={styles.card}>
              <div className={styles.cardTitle}>New whole-genome datasets</div>
              <div className={styles.cardBody}>
                HCT116 and HEK293 whole-genome Perturb-Seq datasets, plus new merged GWPS datasets (intersection/union)
                and a new K562GWPS analysis dataset.
              </div>
              <details className={styles.details}>
                <summary className={styles.summary}>More details</summary>
                <div className={styles.detailsBody}>
                  <ul>
                    <li>New whole-genome screens for HCT116 and HEK293.</li>
                    <li>
                      Two synthetic datasets generated from 3 GWPS datasets:
                      <ul>
                        <li>Intersection merge (shared genes/perturbations)</li>
                        <li>Union merge (maximal coverage)</li>
                      </ul>
                    </li>
                    <li>New analysis dataset for K562GWPS.</li>
                    <li>Use the dataset list (or whole-genome filters) to focus on GWPS datasets.</li>
                    <li>Works across the modules that support GWPS inputs.</li>
                  </ul>
                </div>
              </details>
            </div>
            <div className={styles.card}>
              <div className={styles.cardTitle}>GWPS integrated across modules</div>
              <div className={styles.cardBody}>
                Use the same GWPS datasets across correlation, DR/clustering, heatmap, gene regulation, and more for
                consistent comparisons.
              </div>
              <details className={styles.details}>
                <summary className={styles.summary}>More details</summary>
                <div className={styles.detailsBody}>
                  <ul>
                    <li>Reuse the same dataset selection across multiple analyses.</li>
                    <li>Faster iteration: fewer format conversions and fewer repeated steps.</li>
                    <li>More consistent results when comparing modules on the same underlying screen.</li>
                  </ul>
                </div>
              </details>
            </div>
            <div className={styles.card}>
              <div className={styles.cardTitle}>New modules</div>
              <div className={styles.cardBody}>
                MultiDataset Comparison, Gene Regulation+, Cell Cycle, Deregulated Genes.
              </div>
              <details className={styles.details}>
                <summary className={styles.summary}>More details</summary>
                <div className={styles.detailsBody}>
                  <ul>
                    <li>MultiDataset Comparison: compare signal across multiple GWPS datasets.</li>
                    <li>Gene Regulation+: enhanced regulation discovery with improved robustness.</li>
                    <li>Cell Cycle: compare perturbation vs. control cell-cycle impact.</li>
                    <li>Deregulated Genes: identify deregulated targets across datasets.</li>
                  </ul>
                </div>
              </details>
            </div>
            <div className={styles.card}>
              <div className={styles.cardTitle}>Upload your own datasets</div>
              <div className={styles.cardBody}>
                Bring your data to GeneSetR and analyze it alongside built-in datasets.
              </div>
              <details className={styles.details}>
                <summary className={styles.summary}>More details</summary>
                <div className={styles.detailsBody}>
                  <ul>
                    <li>Supports CSV/TSV/TXT up to 100 MB.</li>
                    <li>Genes on rows and perturbations on columns (or transposed).</li>
                    <li>Processed and stored temporarily (48 hours) for your session.</li>
                  </ul>
                </div>
              </details>
            </div>
            <div className={styles.card}>
              <div className={styles.cardTitle}>Stability improvements</div>
              <div className={styles.cardBody}>Many bug fixes, including major memory leak fixes.</div>
              <details className={styles.details}>
                <summary className={styles.summary}>More details</summary>
                <div className={styles.detailsBody}>
                  <ul>
                    <li>Improved stability for larger analyses and heavy visualizations.</li>
                    <li>Reduced crashes/freezing caused by memory leaks in prior versions.</li>
                  </ul>
                </div>
              </details>
            </div>
            <div className={styles.card}>
              <div className={styles.cardTitle}>Programmatic access</div>
              <div className={styles.cardBody}>
                REST API + Swagger docs. Request an API key via <a href="mailto:omerfk@uio.no">omerfk@uio.no</a>.
              </div>
              <details className={styles.details}>
                <summary className={styles.summary}>More details</summary>
                <div className={styles.detailsBody}>
                  <ul>
                    <li>Swagger docs: <a href={`${apiBaseUrl}/docs`} target="_blank" rel="noreferrer">/docs</a></li>
                    <li>Automate dataset listing and analyses from scripts and pipelines.</li>
                    <li>API keys can be enabled server-side; request access via email.</li>
                  </ul>
                </div>
              </details>
            </div>
          </div>

          <div className={styles.actions}>
            <button
              className={styles.primary}
              onClick={() => {
                setOpen(false);
                navigate(ROUTES.MULTIDATASET_COMPARISON);
              }}
            >
              Explore new modules
            </button>
            <button
              className={styles.secondary}
              onClick={() => {
                setOpen(false);
                navigate(ROUTES.UPLOAD_DATASET);
              }}
            >
              Upload a dataset
            </button>
            <a className={styles.linkBtn} href={`${apiBaseUrl}/docs`} target="_blank" rel="noreferrer">
              API docs
            </a>
          </div>

          <div className={styles.footer}>
            <label className={styles.checkbox}>
              <input
                type="checkbox"
                checked={disableForThisBrowser}
                onChange={(e) => setDisableForThisBrowser(e.target.checked)}
              />
              Don’t show this again
            </label>
            <button className={styles.dismiss} onClick={dismiss}>
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default V2ReleasePopup;
