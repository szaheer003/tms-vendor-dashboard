import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
      },
      fontSize: {
        micro: ["11px", { lineHeight: "1.4", letterSpacing: "0.01em" }],
        caption: ["12px", { lineHeight: "1.4" }],
        body: ["14px", { lineHeight: "1.6" }],
        "body-lg": ["16px", { lineHeight: "1.7", letterSpacing: "-0.01em" }],
        h3: ["20px", { lineHeight: "1.4" }],
        h2: ["28px", { lineHeight: "1.3", letterSpacing: "-0.02em" }],
        h1: ["40px", { lineHeight: "1.2", letterSpacing: "-0.02em" }],
        display: ["56px", { lineHeight: "1.1", letterSpacing: "-0.03em" }],
      },
      fontWeight: {
        normal: "400",
        medium: "500",
        semibold: "650",
        bold: "700",
      },
      colors: {
        surface: {
          DEFAULT: "#FAFAFA",
          raised: "#FFFFFF",
          sunken: "#F8FAFC",
          overlay: "rgba(15, 23, 42, 0.04)",
        },
        ink: {
          DEFAULT: "#0F172A",
          secondary: "#64748B",
          tertiary: "#94A3B8",
          faint: "#CBD5E1",
        },
        border: {
          DEFAULT: "#E2E8F0",
          subtle: "#F1F5F9",
          strong: "#CBD5E1",
        },
        accent: "#0F172A",
        positive: "#059669",
        warning: "#D97706",
        negative: "#DC2626",
        vendor: {
          cognizant: "#1E3A5F",
          genpact: "#059669",
          exl: "#EA580C",
          ibm: "#1E40AF",
          sutherland: "#4B5563",
          ubiquity: "#DC2626",
        },
      },
      borderRadius: {
        card: "12px",
        btn: "8px",
        chip: "9999px",
        badge: "6px",
      },
      boxShadow: {
        subtle: "0 1px 2px rgba(0,0,0,0.03)",
        card: "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)",
        "card-hover": "0 4px 12px rgba(0,0,0,0.05), 0 1px 3px rgba(0,0,0,0.03)",
        raised: "0 4px 12px rgba(0,0,0,0.05), 0 1px 3px rgba(0,0,0,0.03)",
        elevated: "0 8px 24px rgba(0,0,0,0.08), 0 4px 8px rgba(0,0,0,0.04)",
        popover: "0 8px 30px rgba(0,0,0,0.08), 0 2px 6px rgba(0,0,0,0.03)",
        modal: "0 20px 60px rgba(0,0,0,0.12), 0 4px 16px rgba(0,0,0,0.06)",
      },
      maxWidth: {
        board: "1440px",
        memo: "720px",
      },
      animation: {
        "page-in": "pageIn 200ms ease-out",
        "fade-in": "fadeIn 200ms ease-out",
        "slide-up": "slideUp 250ms ease-out",
      },
      keyframes: {
        pageIn: {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-400px 0" },
          "100%": { backgroundPosition: "400px 0" },
        },
        pulseHighlight: {
          "0%, 100%": { backgroundColor: "transparent" },
          "50%": { backgroundColor: "#FEF9C3" },
        },
        pulseRowRing: {
          "0%, 100%": { boxShadow: "inset 0 0 0 0 rgba(15, 23, 42, 0)" },
          "50%": { boxShadow: "inset 0 0 0 2px rgba(15, 23, 42, 0.2)" },
        },
      },
      spacing: {
        "4.5": "18px",
      },
      transitionDuration: {
        DEFAULT: "120ms",
      },
    },
  },
  plugins: [],
};

export default config;
