import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  corePlugins: {
    preflight: false
  },
  theme: {
    // NOTE: do not override `theme.spacing` with a restricted subset. Doing so
    // silently drops every class outside the subset (m-0, gap-5, pb-24, py-0.5,
    // …) — Tailwind emits no CSS for them — which was the cause of widespread
    // inconsistent spacing. Keep the full default 4px scale; enforce rhythm by
    // convention (gap-8 pages, gap-6 focused views, gap-4 sections), not by
    // pruning the scale.
    colors: {
      bg: "var(--bg)",
      surface: "var(--surface)",
      "surface-muted": "var(--surface-muted)",
      border: "var(--border)",
      text: "var(--text)",
      "text-muted": "var(--text-muted)",
      "text-subtle": "var(--text-subtle)",
      accent: "var(--accent)",
      "accent-foreground": "var(--accent-foreground)",
      danger: "var(--danger)",
      highlight: "var(--highlight)"
    },
    borderRadius: {
      none: "0px",
      sm: "4px",
      DEFAULT: "8px",
      md: "8px",
      lg: "12px",
      xl: "16px",
      full: "9999px"
    },
    fontFamily: {
      sans: [
        "Inter",
        "ui-sans-serif",
        "system-ui",
        "-apple-system",
        "BlinkMacSystemFont",
        "Segoe UI",
        "sans-serif"
      ]
    },
    fontSize: {
      label: ["12px", { lineHeight: "1.5" }],
      "body-sm": ["13px", { lineHeight: "1.5" }],
      body: ["14px", { lineHeight: "1.5" }],
      lead: ["16px", { lineHeight: "1.5" }],
      h3: ["18px", { lineHeight: "1.25" }],
      h2: ["22px", { lineHeight: "1.25" }],
      h1: ["26px", { lineHeight: "1.25" }]
    },
    fontWeight: {
      normal: "400",
      medium: "500",
      semibold: "600"
    },
    boxShadow: {
      popover: "0 8px 24px rgb(23 32 27 / 0.12)"
    },
    extend: {
      height: {
        control: "40px",
        nav: "36px"
      },
      maxWidth: {
        content: "1120px"
      }
    }
  },
  plugins: []
};

export default config;
