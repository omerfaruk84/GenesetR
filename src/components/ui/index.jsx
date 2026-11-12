import React from "react";
import styles from "./ui.module.scss";

const cx = (...names) => names.filter(Boolean).join(" ");

/** Row of toolbar controls with consistent spacing. */
export const Toolbar = ({ className, children, ...rest }) => (
  <div className={cx(styles.toolbar, className)} {...rest}>
    {children}
  </div>
);

/**
 * The one button style for chart and table toolbars.
 * variant: "default" (outlined) or "primary" (filled); size: "md" or "sm".
 */
export const ToolbarButton = ({
  variant = "default",
  size = "md",
  icon = null,
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
      size === "sm" && styles.small,
      className
    )}
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
