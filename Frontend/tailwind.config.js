module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        // LUXURY WARM PALETTE
        'cream': '#fdfcfb',           // Main background
        'ivory': '#f4f1ee',           // Secondary background
        'beige': '#e8e4df',           // Tertiary background
        'warm-gray': '#ccc4bc',       // Borders & dividers
        'stone': '#a39992',           // Muted accents
        'charcoal': '#1a1817',        // Text - dark
        'deep-brown': '#121110',      // Text - darker
        'warm-taupe': '#5c5550',      // Secondary text
        'gold-accent': '#ca8a04',     // Vivid amber-orange (kept for existing components)
        'sage': '#5a6a4d',            // Sage green
        'powder-blue': '#7a8ba3',     // Powder blue
        'rose-dust': '#947585',       // Rose dust
        // REFERENCE DESIGN ADDITIONS
        'terracotta': '#c65d2c',      // Primary CTA - burnt orange
        'terracotta-dark': '#b65126', // Hover state
        'terracotta-deep': '#8d401d', // Label text on light
        'terracotta-light': '#f7d0b8',// Text on dark backgrounds
        'cobalt': '#295a74',          // Accent blue for orbs
      },
      backgroundColor: {
        'glass': 'rgba(255, 255, 255, 1)',
        'glass-dark': 'rgba(0, 0, 0, 0.04)',
      },
      backdropBlur: {
        'xs': '2px',
        'sm': '4px',
        'md': '12px',
        'lg': '24px',
        'xl': '40px',
      },
      boxShadow: {
        'luxury': '0 8px 24px rgba(0, 0, 0, 0.08)',
        'luxury-lg': '0 12px 48px rgba(0, 0, 0, 0.1)',
        'premium': '0 4px 12px rgba(196, 169, 98, 0.1)',
        'soft': '0 24px 60px rgba(20, 16, 12, 0.12)',
        'terracotta': '0 4px 16px rgba(198, 93, 44, 0.25)',
      },
      animation: {
        'float': 'float 3s ease-in-out infinite',
        'shimmer': 'shimmer 2s infinite',
        'fade-in': 'fadeIn 0.6s ease-out',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      backgroundImage: {
        'gradient-gold': 'linear-gradient(135deg, #ca8a04 0%, #d9a405 100%)',
        'gradient-terracotta': 'linear-gradient(135deg, #c65d2c 0%, #df6c37 100%)',
        'gradient-sage': 'linear-gradient(135deg, #5a6a4d 0%, #6b7d5e 100%)',
        'gradient-powder': 'linear-gradient(135deg, #7a8ba3 0%, #8397b1 100%)',
        'gradient-rose': 'linear-gradient(135deg, #947585 0%, #826875 100%)',
      },
      fontFamily: {
        'sans': ['Space Grotesk', 'Inter', '-apple-system', 'system-ui', 'sans-serif'],
        'serif': ['EB Garamond', 'Georgia', 'serif'],
        'display': ['Space Grotesk', 'Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
