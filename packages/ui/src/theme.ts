import { createTheme } from "@mantine/core";

export const fondoTheme = createTheme({
  primaryColor: "signal",
  primaryShade: { light: 6, dark: 5 },
  fontFamily: "Manrope, Avenir Next, sans-serif",
  headings: {
    fontFamily: "Manrope, Avenir Next, sans-serif",
    fontWeight: "700",
  },
  fontFamilyMonospace: "IBM Plex Mono, SFMono-Regular, Consolas, monospace",
  defaultRadius: "md",
  radius: {
    xs: "5px",
    sm: "8px",
    md: "12px",
    lg: "18px",
    xl: "24px",
  },
  spacing: {
    xs: "0.5rem",
    sm: "0.75rem",
    md: "1rem",
    lg: "1.5rem",
    xl: "2rem",
  },
  colors: {
    signal: [
      "#e4fffe",
      "#c7fbfa",
      "#91f2f0",
      "#5be6e4",
      "#2ad6d7",
      "#0fc0c6",
      "#08a5ad",
      "#07828b",
      "#096872",
      "#095661",
    ],
    ink: [
      "#f5fbfb",
      "#d9e8e9",
      "#b3c5c7",
      "#8a9fa1",
      "#6a7d80",
      "#536568",
      "#3e4e51",
      "#2d3b3d",
      "#202b2e",
      "#151e20",
    ],
  },
  shadows: {
    md: "0 14px 40px rgba(0, 0, 0, 0.24)",
    xl: "0 24px 80px rgba(0, 0, 0, 0.3)",
  },
  components: {
    Card: {
      styles: {
        root: {
          backgroundColor: "var(--fondo-surface)",
          borderColor: "var(--fondo-border)",
        },
      },
    },
    Button: {
      defaultProps: {
        fw: 700,
      },
    },
  },
});
