module.exports = {
  content: [
    "./*.html",
    "./js/*.js",
    "./css/*.css"
  ],
  theme: {
    extend: {
      colors: {
        'charcoal': '#1A1412',
        'charcoal-light': '#2C211D',
        'champagne': '#D4A373',
        'champagne-light': '#E6C99D',
        'ivory': '#FAF7F2',
        'ivory-dark': '#2C1810',
        'luxury-bg': '#121210',
      },
      fontFamily: {
        'serif-display': ['Playfair Display', 'Georgia', 'serif'],
        'sans-body': ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'luxury-sm': '0 1px 3px rgba(26, 20, 18, 0.06)',
        'luxury-md': '0 4px 12px rgba(26, 20, 18, 0.08)',
        'luxury-lg': '0 10px 30px rgba(26, 20, 18, 0.12)',
        'luxury-xl': '0 20px 40px rgba(26, 20, 18, 0.15)',
      },
      borderRadius: {
        'luxury-sm': '8px',
        'luxury-md': '16px',
        'luxury-lg': '24px',
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.4s cubic-bezier(0.22, 1, 0.36, 1) both',
        'stagger-fade': 'staggerFade 0.3s ease both',
      },
      keyframes: {
        fadeInUp: {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        staggerFade: {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};