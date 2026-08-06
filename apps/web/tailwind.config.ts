import type { Config } from 'tailwindcss';

const semanticColor = (variable: string) => `hsl(var(${variable}) / <alpha-value>)`;

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        canvas: semanticColor('--canvas'),
        surface: {
          DEFAULT: semanticColor('--surface'),
          subtle: semanticColor('--surface-subtle'),
          raised: semanticColor('--surface-raised'),
          hover: semanticColor('--surface-hover'),
        },
        content: {
          DEFAULT: semanticColor('--text'),
          strong: semanticColor('--text-strong'),
          muted: semanticColor('--text-muted'),
          disabled: semanticColor('--text-disabled'),
        },
        line: {
          DEFAULT: semanticColor('--line'),
          strong: semanticColor('--line-strong'),
        },
        accent: {
          DEFAULT: semanticColor('--accent'),
          hover: semanticColor('--accent-hover'),
          pressed: semanticColor('--accent-pressed'),
          foreground: semanticColor('--accent-foreground'),
        },
        focus: semanticColor('--focus'),
        feedback: {
          success: semanticColor('--feedback-success'),
          warning: semanticColor('--feedback-warning'),
          danger: semanticColor('--feedback-danger'),
          info: semanticColor('--feedback-info'),
        },

        /* Compatibility names for pages that have not migrated yet. */
        border: semanticColor('--border'),
        background: semanticColor('--background'),
        foreground: semanticColor('--foreground'),
        primary: {
          DEFAULT: semanticColor('--primary'),
          foreground: semanticColor('--primary-foreground'),
        },
      },
      spacing: {
        page: 'var(--space-page)',
        section: 'var(--space-section)',
      },
      fontSize: {
        'page-title': ['var(--type-page-title)', { lineHeight: '1.15' }],
        'section-title': ['var(--type-section-title)', { lineHeight: '1.35' }],
        operational: ['var(--type-body)', { lineHeight: '1.5' }],
        helper: ['var(--type-helper)', { lineHeight: '1.5' }],
        label: ['var(--type-label)', { lineHeight: '1.35' }],
      },
    },
  },
  plugins: [],
};

export default config;
