/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // CodePulse brand colors
        brand: {
          50:  "hsl(262, 100%, 97%)",
          100: "hsl(262, 92%, 93%)",
          200: "hsl(262, 87%, 85%)",
          300: "hsl(263, 83%, 75%)",
          400: "hsl(264, 79%, 65%)",
          500: "hsl(265, 89%, 58%)",
          600: "hsl(266, 83%, 50%)",
          700: "hsl(267, 85%, 42%)",
          800: "hsl(268, 80%, 34%)",
          900: "hsl(269, 75%, 26%)",
          950: "hsl(270, 70%, 15%)",
        },
        cyber: {
          teal:    "hsl(180, 100%, 50%)",
          pink:    "hsl(320, 100%, 65%)",
          purple:  "hsl(265, 89%, 58%)",
          blue:    "hsl(210, 100%, 56%)",
          green:   "hsl(142, 76%, 55%)",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "monospace"],
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in-left": {
          from: { opacity: "0", transform: "translateX(-16px)" },
          to:   { opacity: "1", transform: "translateX(0)" },
        },
        "glow-pulse": {
          "0%, 100%": { boxShadow: "0 0 8px hsl(265 89% 58% / 0.4)" },
          "50%":       { boxShadow: "0 0 24px hsl(265 89% 58% / 0.8)" },
        },
        shimmer: {
          from: { backgroundPosition: "200% 0" },
          to:   { backgroundPosition: "-200% 0" },
        },
      },
      animation: {
        "accordion-down":  "accordion-down 0.2s ease-out",
        "accordion-up":    "accordion-up 0.2s ease-out",
        "fade-in":         "fade-in 0.4s cubic-bezier(0.19, 1, 0.22, 1)",
        "slide-in-left":   "slide-in-left 0.4s cubic-bezier(0.19, 1, 0.22, 1)",
        "glow-pulse":      "glow-pulse 2s ease-in-out infinite",
        shimmer:           "shimmer 2.5s linear infinite",
      },
      backgroundImage: {
        "grid-pattern":
          "linear-gradient(hsl(var(--border)/0.3) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border)/0.3) 1px, transparent 1px)",
        "brand-gradient":
          "linear-gradient(135deg, hsl(265,89%,58%) 0%, hsl(210,100%,56%) 100%)",
        "dark-gradient":
          "linear-gradient(180deg, hsl(240,10%,3.9%) 0%, hsl(240,10%,6%) 100%)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
