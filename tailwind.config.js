/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        // Minimal monochrome palette
        primary: '#0F0F10',      // Main CTAs and strong emphasis
        secondary: '#2A2A2E',    // Secondary emphasis
        accent: '#3A3A40',       // Subtle highlights
        neutral: {
          50: '#F7F7F8',        // Page background
          100: '#EFEFF1',       // Cards
          200: '#DCDDDF',       // Borders
          300: '#C4C5C9',       // Disabled surfaces
          400: '#9A9CA3',       // Muted text
          500: '#73757D',       // Secondary text
          600: '#575A62',       // Body text
          700: '#3C3F46',       // Heading text on light bg
          800: '#23252B',       // Dark surfaces
          900: '#111215',       // Highest contrast
        },
        warning: '#5C5F67',
        error: '#2B2D33',
        info: '#4A4D56',
        success: '#3A3D45',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
        poppins: ['Poppins', 'sans-serif'],
        montserrat: ['Montserrat', 'sans-serif'],
        roboto: ['Roboto', 'sans-serif'],
        openSans: ['Open Sans', 'sans-serif'],
      },
      borderRadius: {
        'xl': '1rem',            // For cards, buttons
        '2xl': '1.5rem',         // Larger UI elements
      },
      boxShadow: {
        sm: '0 1px 2px 0 rgba(0,0,0,0.05)',
        DEFAULT: '0 1px 3px 0 rgba(0,0,0,0.1), 0 1px 2px 0 rgba(0,0,0,0.06)',
        md: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)',
        lg: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)',
      }
    },
  },
  plugins: [],
  darkMode: 'class',  // Optional dark mode
}
