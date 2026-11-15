import React, { useState } from "react";
import {
  FaCheckCircle,
  FaChevronDown,
  FaExclamationCircle,
  FaExclamationTriangle,
  FaInfoCircle,
} from "react-icons/fa";
import styles from "./ui.module.scss";

const cx = (...names) => names.filter(Boolean).join(" ");

/** Class names of ui.module.scss, for elements that only need the look
 *  (`uiStyles.table`, `uiStyles.tableScroll`, `uiStyles.num`, `uiStyles.muted`,
 *  `uiStyles.chartFrame`, `uiStyles.sectionTitle`). */
export const uiStyles = styles;

/** Row of toolbar controls with consistent spacing. */
export const Toolbar = ({ className, children, ...rest }) => (
  <div className={cx(styles.toolbar, className)} {...rest}>
    {children}
  </div>
);

/**
 * The one button style for chart and table toolbars.
 * variant: "default" (outlined), "primary" (filled) or "ghost" (text only);
 * size: "md" or "sm"; `active` marks a pressed toggle.
 */
export const ToolbarButton = ({
  variant = "default",
  size = "md",
  icon = null,
  active = false,
  className,
  children,
  type = "button",
  ...rest
}) => (
  <button
    type={type}
    className={cx(
      styles.button,
      variant === "primary" && styles.primary,
      variant === "ghost" && styles.ghost,
      size === "sm" && styles.small,
      active && styles.active,
      className
    )}
    aria-pressed={active || undefined}
    {...rest}
  >
    {icon}
    {children}
  </button>
);

/**
 * Legend for charts whose colours are computed per point (so the chart
 * library cannot draw one itself).
 * items: [{ label, color, line?: "solid" | "dashed" | "dotted" }]
 */
export const ChartLegend = ({ items = [], note, label = "Chart legend" }) => (
  <div className={styles.legend} aria-label={label}>
    {items.map((item) => (
      <span key={item.label} className={styles.legendItem}>
        {item.line ? (
          <span
            className={styles.legendLine}
            style={{ borderTop: `3px ${item.line} ${item.color}` }}
          />
        ) : (
          <span className={styles.legendDot} style={{ background: item.color }} />
        )}
        {item.label}
      </span>
    ))}
    {note && <span className={styles.legendNote}>{note}</span>}
  </div>
);

/** Message for a table or chart that has nothing to show. */
export const EmptyState = ({ title, hint, children }) => (
  <div className={styles.empty} role="status">
    <div className={styles.emptyTitle}>{title}</div>
    {hint && <div className={styles.emptyHint}>{hint}</div>}
    {children}
  </div>
);

const NOTICE_ICONS = {
  info: FaInfoCircle,
  success: FaCheckCircle,
  warning: FaExclamationTriangle,
  danger: FaExclamationCircle,
};

/**
 * Coloured box for a tip, a state or a problem.
 * kind: "info" | "success" | "warning" | "danger"
 */
export const Notice = ({ kind = "info", title, className, style, children }) => {
  const Icon = NOTICE_ICONS[kind] || FaInfoCircle;
  return (
    <div
      className={cx(styles.notice, styles[kind] || styles.info, className)}
      style={style}
      role={kind === "danger" ? "alert" : "status"}
    >
      <Icon className={styles.noticeIcon} size={14} aria-hidden="true" />
      <div className={styles.noticeBody}>
        {title && <strong>{title} </strong>}
        {children}
      </div>
    </div>
  );
};

/**
 * Bordered surface for a chart, a table or a group of controls.
 * `title`, `subtitle` and `actions` make a header row; `flush` removes the
 * padding of the body (for tables and charts that go edge to edge).
 */
export const Panel = ({ title, subtitle, actions, flush = false, className, bodyClassName, children, ...rest }) => (
  <section className={cx(styles.panel, className)} {...rest}>
    {(title || actions) && (
      <div className={styles.panelHeader}>
        <h3 className={styles.panelTitle}>
          {title}
          {subtitle && <span className={styles.panelSubtitle}>{subtitle}</span>}
        </h3>
        {actions && <Toolbar>{actions}</Toolbar>}
      </div>
    )}
    <div className={cx(styles.panelBody, flush && styles.panelFlush, bodyClassName)}>{children}</div>
  </section>
);

/**
 * Introduction of an analysis module: what it does, shown above the result
 * area until the first result arrives. Collapsible.
 *   description  text, or an array of paragraphs
 *   features     array of short lines ("Key features")
 *   expanded / onChange   optional: controlled by the page
 */
export const ModuleIntro = ({
  title,
  description,
  features = [],
  expanded,
  onChange,
  defaultExpanded = true,
  children,
}) => {
  const [own, setOwn] = useState(defaultExpanded);
  const open = expanded === undefined ? own : expanded;
  const toggle = () => {
    if (expanded === undefined) setOwn(!open);
    if (onChange) onChange(!open);
  };
  const paragraphs = [].concat(description || []).filter(Boolean);
  return (
    <section className={styles.intro}>
      <button type="button" className={styles.introHeader} aria-expanded={open} onClick={toggle}>
        <h2 className={styles.introTitle}>{title}</h2>
        <FaChevronDown
          className={cx(styles.introChevron, open && styles.introChevronOpen)}
          size={12}
          aria-hidden="true"
        />
      </button>
      {open && (
        <div className={styles.introBody}>
          {paragraphs.map((text, index) => (
            <p key={index}>{text}</p>
          ))}
          {features.length > 0 && (
            <>
              <div className={styles.introFeaturesTitle}>Key features</div>
              <ul className={styles.introFeatures}>
                {features.map((feature, index) => (
                  <li key={index}>{feature}</li>
                ))}
              </ul>
            </>
          )}
          {children}
        </div>
      )}
    </section>
  );
};

/** Small rounded label. tone: "default" | "accent" | "up" | "down"; `label` is a muted prefix. */
export const Badge = ({ tone = "default", label, title, children }) => (
  <span
    className={cx(
      styles.badge,
      tone === "accent" && styles.badgeAccent,
      tone === "up" && styles.badgeUp,
      tone === "down" && styles.badgeDown
    )}
    title={title}
  >
    {label && <span className={styles.badgeKey}>{label}:</span>}
    {children}
  </span>
);
