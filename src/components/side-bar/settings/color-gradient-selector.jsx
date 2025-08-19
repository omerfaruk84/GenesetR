import React, { useState } from "react";

const colorGradients = {
  BuWhRd: {
    start: { r: 33, g: 113, b: 181 },
    middle: { r: 255, g: 255, b: 255 },
    end: { r: 215, g: 25, b: 28 },
  },
  YlGn: { start: { r: 255, g: 255, b: 204 }, end: { r: 35, g: 132, b: 67 } },
  GnBu: { start: { r: 240, g: 249, b: 232 }, end: { r: 43, g: 140, b: 190 } },
  BuGn: { start: { r: 237, g: 248, b: 251 }, end: { r: 35, g: 139, b: 69 } },
  PuBu: { start: { r: 241, g: 238, b: 246 }, end: { r: 5, g: 112, b: 176 } },
  BuPu: { start: { r: 237, g: 248, b: 251 }, end: { r: 136, g: 65, b: 157 } },
  RdPu: { start: { r: 254, g: 235, b: 226 }, end: { r: 174, g: 1, b: 126 } },
  PuRd: { start: { r: 241, g: 238, b: 246 }, end: { r: 206, g: 18, b: 86 } },
  OrRd: { start: { r: 254, g: 240, b: 217 }, end: { r: 215, g: 48, b: 31 } },
  Purples2: {
    start: { r: 242, g: 240, b: 247 },
    end: { r: 106, g: 81, b: 163 },
  },
  Blues: { start: { r: 239, g: 243, b: 255 }, end: { r: 33, g: 113, b: 181 } },
  Greens: { start: { r: 237, g: 248, b: 233 }, end: { r: 35, g: 139, b: 69 } },
  Oranges: { start: { r: 254, g: 237, b: 222 }, end: { r: 217, g: 71, b: 1 } },
  Reds: { start: { r: 254, g: 229, b: 217 }, end: { r: 203, g: 24, b: 29 } },
  Greys: { start: { r: 247, g: 247, b: 247 }, end: { r: 82, g: 82, b: 82 } },
  PuOr: { start: { r: 230, g: 97, b: 1 }, end: { r: 94, g: 60, b: 153 } },
  BrBG: { start: { r: 166, g: 97, b: 26 }, end: { r: 1, g: 133, b: 113 } },
  RdBu: { start: { r: 202, g: 0, b: 32 }, end: { r: 5, g: 113, b: 176 } },
  RdGy: { start: { r: 202, g: 0, b: 32 }, end: { r: 64, g: 64, b: 64 } },
  BuYl: { start: { r: 5, g: 113, b: 176 }, end: { r: 250, g: 233, b: 42 } },

  // Three-color gradients
  YlOrR: {
    start: { r: 255, g: 255, b: 178 },
    middle: { r: 204, g: 76, b: 2 },
    end: { r: 227, g: 26, b: 28 },
  },
  YlOrB: {
    start: { r: 255, g: 255, b: 212 },
    middle: { r: 204, g: 76, b: 2 },
    end: { r: 5, g: 112, b: 176 },
  },
  PRGn2: {
    start: { r: 123, g: 50, b: 148 },
    middle: { r: 202, g: 0, b: 32 },
    end: { r: 0, g: 136, b: 55 },
  },
  PiYG2: {
    start: { r: 208, g: 28, b: 139 },
    middle: { r: 255, g: 255, b: 178 },
    end: { r: 77, g: 172, b: 38 },
  },
  YlGnBu: {
    start: { r: 255, g: 255, b: 204 },
    middle: { r: 35, g: 132, b: 67 },
    end: { r: 34, g: 94, b: 168 },
  },
  RdYlBu: {
    start: { r: 215, g: 25, b: 28 },
    middle: { r: 255, g: 255, b: 178 },
    end: { r: 44, g: 123, b: 182 },
  },
  RdYlGn: {
    start: { r: 215, g: 25, b: 28 },
    middle: { r: 255, g: 255, b: 178 },
    end: { r: 26, g: 150, b: 65 },
  },
  RdLrBu: {
    start: { r: 215, g: 25, b: 28 },
    middle: { r: 254, g: 229, b: 217 },
    end: { r: 44, g: 123, b: 182 },
  },
  RdBkGr: {
    start: { r: 215, g: 25, b: 28 },
    middle: { r: 0, g: 0, b: 0 },
    end: { r: 35, g: 139, b: 69 },
  },
  RdLrGr: {
    start: { r: 215, g: 25, b: 28 },
    middle: { r: 254, g: 229, b: 217 },
    end: { r: 35, g: 139, b: 69 },
  },
};

/** Convert { r, g, b } to an rgb(...) string */
function rgbToString({ r, g, b }) {
  return `rgb(${r}, ${g}, ${b})`;
}

/**
 * Given a gradient object with start/end or start/middle/end,
 * build the `linear-gradient(...)` CSS.
 */
function buildGradientCSS(gradientObj) {
  const start = rgbToString(gradientObj.start);

  if (gradientObj.middle) {
    // three-color gradient
    const middle = rgbToString(gradientObj.middle);
    const end = rgbToString(gradientObj.end);
    return `linear-gradient(to right, ${start}, ${middle}, ${end})`;
  } else {
    // two-color gradient
    const end = rgbToString(gradientObj.end);
    return `linear-gradient(to right, ${start}, ${end})`;
  }
}

/**
 * A minimal working color gradient selector using local state.
 */
function ColorGradientSelector({ colorScale, onChange }) {
  const gradientKeys = Object.keys(colorGradients);

  // Find the index of the current color scale
  const initialIndex =
    gradientKeys.indexOf(colorScale) >= 0
      ? gradientKeys.indexOf(colorScale)
      : 0;

  // Local state: which key is currently selected?
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  // Dropdown open/closed state
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const currentKey = gradientKeys[currentIndex];
  const currentGradient = colorGradients[currentKey];
  const currentCSS = buildGradientCSS(currentGradient);

  // Go left
  const handleLeft = () => {
    const newIndex =
      (currentIndex - 1 + gradientKeys.length) % gradientKeys.length;
    setCurrentIndex(newIndex);
    onChange({
      color: gradientKeys[newIndex],
      values: colorGradients[gradientKeys[newIndex]],
    });
  };

  // Go right
  const handleRight = () => {
    const newIndex = (currentIndex + 1) % gradientKeys.length;
    setCurrentIndex(newIndex);
    onChange({
      color: gradientKeys[newIndex],
      values: colorGradients[gradientKeys[newIndex]],
    });
  };

  // Toggle dropdown
  const toggleDropdown = () => {
    setDropdownOpen((prev) => !prev);
  };

  // When picking from the dropdown, jump to that index
  const handlePick = (idx) => {
    setCurrentIndex(idx);
    setDropdownOpen(false);
    onChange({
      color: gradientKeys[idx],
      values: colorGradients[gradientKeys[idx]],
    });
  };

  // Some basic inline styles:
  const containerStyle = {
    display: "flex",
    alignItems: "center",
    position: "relative",
    width: "100%", // ensure container can stretch
    marginBottom: "1rem", // just for spacing
    height: "36px",
  };

  const arrowStyle = {
    cursor: "pointer",
    backgroundColor: "#ddd",
    border: "none",
    borderRadius: "1px",
    fontSize: "16px",
    padding: "8px 12px",
    height: "36px",
    width: "42px",
  };

  const previewStyle = {
    height: "36px",
    flexGrow: 1,
    border: "1px solid #999",
    borderRadius: "1px",
    cursor: "pointer",
    background: currentCSS,
  };

  const dropdownContainerStyle = {
    position: "absolute",

    width: "calc(100% - 84px)",
    left: "42px",
    top: "calc(100% + 0.1rem)", // 100%",
    border: "1px solid #ccc",
    borderRadius: "4px",
    backgroundColor: "#fff",
    boxShadow: "0 2px 5px rgba(0,0,0,0.15)",
    zIndex: 999,
    display: dropdownOpen ? "block" : "none",
    maxHeight: "200px",
    overflowY: "auto",
  };

  const dropdownOptionStyle = {
    padding: "8px",
    cursor: "pointer",
    backgroundColor: "#fff",
    height: "28px",
  };

  return (
    <div style={{ position: "relative" }}>
      {/* The row with arrows and preview */}
      <div style={containerStyle}>
        <button style={arrowStyle} onClick={handleLeft}>
          &#9664; {/* left arrow */}
        </button>

        <div style={previewStyle} onClick={toggleDropdown}></div>

        <button style={arrowStyle} onClick={handleRight}>
          &#9654; {/* right arrow */}
        </button>
      </div>

      {/* The dropdown (only visible if dropdownOpen is true) */}
      <div style={dropdownContainerStyle}>
        {gradientKeys.map((key, idx) => {
          const css = buildGradientCSS(colorGradients[key]);
          return (
            <div
              key={key}
              style={{ ...dropdownOptionStyle, background: css }}
              onClick={() => handlePick(idx)}
            >
              {key}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ColorGradientSelector;
