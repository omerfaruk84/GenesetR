/**
 * MUI theme (material-react-table, accordions, menus, dialogs) built from the
 * same palette as the rest of the page, for both colour themes.
 */
import { createTheme } from "@mui/material/styles";
import { paletteOf } from "./palette";

const cache = {};

export const muiThemeOf = (themeName) => {
  if (cache[themeName]) return cache[themeName];
  const p = paletteOf(themeName);
  const theme = createTheme({
    palette: {
      mode: p.mode,
      primary: { main: p.accent, contrastText: p.onAccent },
      secondary: { main: p.link },
      background: { default: p.surface, paper: p.surface },
      text: { primary: p.text, secondary: p.muted, disabled: p.faint },
      divider: p.border,
      action: { hover: p.hover, selected: p.selected },
    },
    shape: { borderRadius: 6 },
    typography: {
      fontFamily: "inherit",
      button: { textTransform: "none", fontWeight: 500 },
    },
    components: {
      MuiPaper: {
        styleOverrides: { root: { backgroundImage: "none" } },
      },
      // Help and option sections of the analysis pages
      MuiAccordion: {
        defaultProps: { disableGutters: true, elevation: 0 },
        styleOverrides: {
          root: {
            border: `1px solid ${p.border}`,
            borderRadius: 8,
            backgroundColor: p.surface,
            overflow: "hidden",
            "&:before": { display: "none" },
            "&:first-of-type, &:last-of-type": { borderRadius: 8 },
            "& + &": { marginTop: 8 },
          },
        },
      },
      MuiAccordionSummary: {
        styleOverrides: {
          root: {
            minHeight: 40,
            padding: "0 14px",
            fontWeight: 600,
            fontSize: 13.5,
            backgroundColor: p.surfaceAlt,
            "&.Mui-expanded": { borderBottom: `1px solid ${p.border}` },
          },
          content: { margin: "8px 0" },
        },
      },
      MuiAccordionDetails: {
        styleOverrides: { root: { padding: "12px 14px" } },
      },
      MuiTableCell: {
        styleOverrides: {
          root: { borderBottomColor: p.border, fontSize: 13, padding: "6px 10px" },
          head: {
            backgroundColor: p.surfaceAlt,
            color: p.muted,
            fontSize: 12,
            fontWeight: 600,
            whiteSpace: "nowrap",
          },
        },
      },
      MuiTab: {
        styleOverrides: { root: { minHeight: 40, fontSize: 13.5, fontWeight: 600 } },
      },
      MuiTabs: {
        styleOverrides: { root: { minHeight: 40, borderBottom: `1px solid ${p.border}` } },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: { fontSize: 12, backgroundColor: p.mode === "dark" ? "#3a4553" : "#2b3440" },
        },
      },
      MuiMenu: {
        styleOverrides: { paper: { border: `1px solid ${p.border}` } },
      },
      MuiMenuItem: {
        styleOverrides: { root: { fontSize: 13.5 } },
      },
      MuiDialog: {
        styleOverrides: { paper: { border: `1px solid ${p.border}` } },
      },
    },
  });
  cache[themeName] = theme;
  return theme;
};
