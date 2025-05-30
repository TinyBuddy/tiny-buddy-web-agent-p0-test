import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      keyframes: {
        ripple: {
          '0%': { transform: 'scale(1)', opacity: '0.1' },
          '100%': { transform: 'scale(2.5)', opacity: '0' },
        },
      },
      animation: {
        'ripple': 'ripple 1.5s ease-out forwards',
        'ripple-delay': 'ripple 1.5s ease-out 0.5s forwards',
        'ripple-delay-long': 'ripple 1.5s ease-out 1s forwards',
      },
    },
  },
  plugins: [],
};

export default config;
