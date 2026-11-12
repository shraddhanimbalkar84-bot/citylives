/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        civic: {
          dark: "#0F172A",
          darker: "#090D16",
          sidebar: "#1E293B",
          card: "#FFFFFF",
          surface: "#F8FAFC",
          border: "#E2E8F0",
          teal: {
            DEFAULT: "#0D9488",
            light: "#14B8A6",
            dark: "#0F766E",
            50: "#F0FDFA",
            100: "#CCFBF1",
          },
          emerald: {
            DEFAULT: "#10B981",
            light: "#34D399",
            dark: "#059669",
            50: "#ECFDF5",
            100: "#D1FAE5",
          },
          amber: {
            DEFAULT: "#F59E0B",
            light: "#FBBF24",
            50: "#FFFBEB",
            100: "#FEF3C7",
          },
          orange: {
            DEFAULT: "#F97316",
            50: "#FFF7ED",
            100: "#FFEDD5",
          },
          rose: {
            DEFAULT: "#EF4444",
            light: "#F87171",
            dark: "#DC2626",
            50: "#FEF2F2",
            100: "#FEE2E2",
          }
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'civic': '0 1px 3px 0 rgba(15, 23, 42, 0.08), 0 1px 2px -1px rgba(15, 23, 42, 0.08)',
        'civic-md': '0 4px 6px -1px rgba(15, 23, 42, 0.08), 0 2px 4px -2px rgba(15, 23, 42, 0.08)',
        'civic-lg': '0 10px 15px -3px rgba(15, 23, 42, 0.08), 0 4px 6px -4px rgba(15, 23, 42, 0.08)',
      }
    },
  },
  plugins: [],
}
