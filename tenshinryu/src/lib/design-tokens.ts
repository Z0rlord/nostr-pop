// Design Tokens for Tenshinryu App
// Centralized design values for consistent UI

export const tokens = {
  colors: {
    // Brand colors
    primary: {
      DEFAULT: "#ff4444", // Mars red
      dark: "#cc3333",
      light: "#ff6666",
      muted: "rgba(255, 68, 68, 0.1)",
    },
    // Background colors
    background: {
      DEFAULT: "#0a0a0f", // Space charcoal
      card: "#12121a",
      surface: "#1a1a24",
      elevated: "#222230",
    },
    // Text colors
    foreground: {
      DEFAULT: "#f5f5f5",
      muted: "#888899",
      subtle: "#555566",
      inverse: "#0a0a0f",
    },
    // Semantic colors
    success: {
      DEFAULT: "#22c55e",
      muted: "rgba(34, 197, 94, 0.1)",
    },
    error: {
      DEFAULT: "#ef4444",
      muted: "rgba(239, 68, 68, 0.1)",
    },
    warning: {
      DEFAULT: "#f59e0b",
      muted: "rgba(245, 158, 11, 0.1)",
    },
    info: {
      DEFAULT: "#3b82f6",
      muted: "rgba(59, 130, 246, 0.1)",
    },
    // Border colors
    border: {
      DEFAULT: "#2a2a3a",
      subtle: "#1f1f2e",
      strong: "#3a3a4a",
    },
  },
  
  spacing: {
    xs: "0.25rem",   // 4px
    sm: "0.5rem",    // 8px
    md: "1rem",      // 16px
    lg: "1.5rem",    // 24px
    xl: "2rem",      // 32px
    "2xl": "3rem",   // 48px
    "3xl": "4rem",   // 64px
  },
  
  borderRadius: {
    sm: "0.25rem",   // 4px
    DEFAULT: "0.5rem", // 8px
    md: "0.75rem",   // 12px
    lg: "1rem",      // 16px
    xl: "1.5rem",    // 24px
    full: "9999px",
  },
  
  typography: {
    fontFamily: {
      sans: "var(--font-geist-sans), system-ui, sans-serif",
      mono: "var(--font-geist-mono), monospace",
    },
    fontSize: {
      xs: "0.75rem",   // 12px
      sm: "0.875rem",  // 14px
      base: "1rem",    // 16px
      lg: "1.125rem",  // 18px
      xl: "1.25rem",   // 20px
      "2xl": "1.5rem", // 24px
      "3xl": "1.875rem", // 30px
      "4xl": "2.25rem",  // 36px
    },
    fontWeight: {
      normal: "400",
      medium: "500",
      semibold: "600",
      bold: "700",
      black: "900",
    },
    letterSpacing: {
      tight: "-0.025em",
      normal: "0",
      wide: "0.025em",
      wider: "0.05em",
      widest: "0.2em",
    },
  },
  
  animation: {
    duration: {
      fast: "150ms",
      normal: "300ms",
      slow: "500ms",
    },
    easing: {
      DEFAULT: "cubic-bezier(0.4, 0, 0.2, 1)",
      bounce: "cubic-bezier(0.68, -0.55, 0.265, 1.55)",
    },
  },
  
  shadows: {
    sm: "0 1px 2px rgba(0, 0, 0, 0.3)",
    DEFAULT: "0 4px 6px -1px rgba(0, 0, 0, 0.4)",
    md: "0 6px 12px -2px rgba(0, 0, 0, 0.5)",
    lg: "0 10px 20px -4px rgba(0, 0, 0, 0.6)",
    glow: "0 0 20px rgba(255, 68, 68, 0.3)",
    "glow-strong": "0 0 30px rgba(255, 68, 68, 0.5)",
  },
};

export type Tokens = typeof tokens;
