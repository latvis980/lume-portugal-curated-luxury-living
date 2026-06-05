import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate"; // ← replaces require() at the bottom

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
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
      fontFamily: {
        display: ['"Cormorant Garamond"', 'serif'],
        body: ['Raleway', 'sans-serif'],
        script: ['Caveat', 'cursive'],
        serif: ['Georgia', 'serif'], // ← added: enables font-serif in the navbar subtitle
        spectral: ['Spectral', 'Georgia', 'serif'],
        hanken: ['"Hanken Grotesk"', 'system-ui', 'sans-serif'],
      },
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
        sand: {
          DEFAULT: "hsl(var(--sand))",
          light: "hsl(var(--sand-light))",
        },
        ocean: {
          DEFAULT: "hsl(var(--ocean))",
          light: "hsl(var(--ocean-light))",
        },
        sun: {
          DEFAULT: "hsl(var(--sun))",
          light: "hsl(var(--sun-light))",
        },
        charcoal: "hsl(var(--charcoal))",
        "warm-white": "hsl(var(--warm-white))",
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        lume: {
          cream: "#F7F1E5",
          "cream-2": "#FBF6EC",
          sand: "#EBDEC4",
          "sand-deep": "#E4D6B7",
          espresso: "#241B12",
          "espresso-2": "#1B140C",
          navy: "#15273B",
          gold: "#B98E2C",
          "gold-2": "#C9982E",
          "gold-bright": "#E2B44E",
          ink: "#2C281F",
          "ink-soft": "#4A4334",
          muted: "#8B7F69",
          "muted-2": "#A89C84",
          line: "#DCCFB4",
          "line-soft": "#E6DBC4",
        },
        admin: {
          bg: "hsl(var(--admin-bg))",
          surface: "hsl(var(--admin-surface))",
          "surface-hover": "hsl(var(--admin-surface-hover))",
          text: "hsl(var(--admin-text))",
          "text-secondary": "hsl(var(--admin-text-secondary))",
          "text-muted": "hsl(var(--admin-text-muted))",
          border: "hsl(var(--admin-border))",
          "border-light": "hsl(var(--admin-border-light))",
          accent: "hsl(var(--admin-accent))",
          "accent-soft": "hsl(var(--admin-accent-soft))",
          btn: "hsl(var(--admin-btn))",
          "btn-hover": "hsl(var(--admin-btn-hover))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
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
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(30px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "slide-reveal": {
          "0%": { transform: "translateY(100%)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "golden-line": {
          "0%": { width: "0" },
          "100%": { width: "4rem" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-up": "fade-up 0.8s ease-out forwards",
        "fade-in": "fade-in 0.6s ease-out forwards",
        "slide-reveal": "slide-reveal 0.6s ease-out forwards",
        "golden-line": "golden-line 1s ease-out forwards",
      },
    },
  },
  plugins: [animate], // ← uses the ESM import instead of require()
} satisfies Config;