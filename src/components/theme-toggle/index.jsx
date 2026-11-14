import React from "react";
import { FaMoon, FaSun } from "react-icons/fa";
import { setTheme, useTheme } from "../../utils/theme";

const buttonStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 34,
  height: 34,
  border: 0,
  borderRadius: 6,
  background: "none",
  color: "var(--gs-text)",
  cursor: "pointer",
};

/** Light / dark switch. The choice is remembered in this browser. */
const ThemeToggle = () => {
  const theme = useTheme();
  const next = theme === "dark" ? "light" : "dark";
  return (
    <button
      type="button"
      style={buttonStyle}
      aria-label={`Switch to ${next} mode`}
      title={`Switch to ${next} mode`}
      onClick={() => setTheme(next)}
    >
      {theme === "dark" ? <FaSun size={16} /> : <FaMoon size={16} />}
    </button>
  );
};

export { ThemeToggle };
