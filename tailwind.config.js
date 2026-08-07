/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        // Legacy (keep working)
        sans: ['Inter', 'system-ui', 'sans-serif'],
        'serif-display': ['"Playfair Display"', 'Georgia', 'serif'],
        // Semantic tokens (Part 2.4)
        display: ['var(--font-display)'],
        body:    ['var(--font-body)'],
        mono:    ['var(--font-mono)'],
        indic:   ['var(--font-indic)'],
      },
      fontSize: {
        // 8-step semantic scale (Part 2.4)
        'display-2xl': ['48px', { lineHeight: '56px', fontWeight: '700' }],
        'display-xl':  ['36px', { lineHeight: '44px', fontWeight: '700' }],
        'display-lg':  ['28px', { lineHeight: '36px', fontWeight: '600' }],
        'heading-lg':  ['20px', { lineHeight: '28px', fontWeight: '600' }],
        'heading-md':  ['17px', { lineHeight: '24px', fontWeight: '600' }],
        'body-lg':     ['16px', { lineHeight: '24px', fontWeight: '400' }],
        'body-md':     ['14px', { lineHeight: '20px', fontWeight: '400' }],
        'caption':     ['12px', { lineHeight: '16px', fontWeight: '500' }],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },
        brand: {
          DEFAULT: '#2F3E8F',
          dark: '#3B4DA6',
          darker: '#25327A',
          light: '#E8EDFF',
          lightest: '#E8EDFF',
        },
        heritage: {
          ivory: '#F8F6F1',
          'ivory-warm': '#F6F2EA',
          separator: '#F1ECE3',
          beige: '#EFE6D6',
          gold: '#C2A46D',
          'gold-accent': '#A8894F',
          'gold-light': '#EFE6D6',
          sand: '#E2DBCE',
          warm: '#ECE7DF',
        },
        success: '#107C10',
        warning: '#D83B01',
        // Semantic color tokens (Part 2.2) — prefer these for new code
        'surface-canvas':  'var(--color-surface-canvas)',
        'surface-raised':  'var(--color-surface-raised)',
        'surface-sunken':  'var(--color-surface-sunken)',
        'text-primary':    'var(--color-text-primary)',
        'text-secondary':  'var(--color-text-secondary)',
        'text-tertiary':   'var(--color-text-tertiary)',
        'text-inverse':    'var(--color-text-inverse)',
        'state-success':   'var(--color-state-success)',
        'state-warning':   'var(--color-state-warning)',
        'state-error':     'var(--color-state-error)',
        'state-info':      'var(--color-state-info)',
        'gender-male':     'var(--color-gender-male)',
        'gender-female':   'var(--color-gender-female)',
        'gender-neutral':  'var(--color-gender-neutral)',
        'brand-primary':   'var(--color-brand-primary)',
        'brand-accent':    'var(--color-brand-accent)',
        'brand-heritage':  'var(--color-brand-heritage)',
        'brand-warm':      'var(--color-brand-warm)',
      },
      boxShadow: {
        'fluent-4': '0 2px 4px rgba(0,0,0,0.14), 0 0 2px rgba(0,0,0,0.12)',
        'fluent-8': '0 4px 8px rgba(0,0,0,0.14), 0 0 2px rgba(0,0,0,0.12)',
        'fluent-16': '0 8px 16px rgba(0,0,0,0.14), 0 0 2px rgba(0,0,0,0.12)',
        // Semantic elevation tokens (Part 2.2)
        'elev-1': 'var(--elevation-1)',
        'elev-2': 'var(--elevation-2)',
        'elev-3': 'var(--elevation-3)',
        'elev-4': 'var(--elevation-4)',
        'elev-modal': 'var(--elevation-modal)',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
