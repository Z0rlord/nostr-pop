import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        frame: "var(--frame)",
        text: {
          DEFAULT: "var(--foreground)",
          secondary: "var(--muted-foreground)",
        },
        surface: {
          DEFAULT: "var(--surface)",
          card: "var(--surface-card)",
          elevated: "var(--surface-elevated)",
          dark: "var(--surface-dark)",
          border: "var(--border)",
        },
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
          container: "var(--primary-container)",
          "container-foreground": "var(--primary-container-foreground)",
          dark: "var(--primary-dark)",
          deep: "var(--primary-deep)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
          container: "var(--secondary-container)",
          "container-foreground": "var(--secondary-container-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        success: {
          DEFAULT: "var(--success)",
          foreground: "var(--success-foreground)",
        },
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        border: "var(--border)",
        "border-strong": "var(--border-strong)",
        input: "var(--input)",
        ring: "var(--ring)",
        crimson: {
          DEFAULT: "#a83f3f",
          dark: "#8b3232",
          deep: "#752f2f",
        },
      },
      fontFamily: {
        display: ["var(--font-fjalla)", "var(--font-lato)", "sans-serif"],
        body: ["var(--font-lato)", "Yu Gothic", "Hiragino Kaku Gothic Pro", "sans-serif"],
        heading: ["var(--font-fjalla)", "var(--font-lato)", "sans-serif"],
      },
      maxWidth: {
        kiwami: "1170px",
      },
      borderRadius: {
        button: "var(--radius-button)",
        card: "var(--radius-card)",
      },
      boxShadow: {
        card: "var(--shadow-card)",
        elevated: "var(--shadow-elevated)",
        modal: "var(--shadow-modal)",
      },
    },
  },
  plugins: [],
};

export default config;
