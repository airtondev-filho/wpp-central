export default {
  content: ['./index.html','./src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg:      '#0a0a0f',
        surface: 'rgba(255,255,255,0.04)',
        glass:   'rgba(255,255,255,0.07)',
        border:  'rgba(255,255,255,0.08)',
        accent:  '#a78bfa',
        normal:  '#3b82f6',
        alto:    '#f59e0b',
        critico: '#ef4444',
        // cor de primeiro plano adaptável ao tema (dark/light) — suporta os
        // modificadores de opacidade do Tailwind (ink/40, ink/80...)
        ink: 'rgb(var(--ink-rgb) / <alpha-value>)',
      },
      backdropBlur: { glass: '20px' },
    }
  },
  plugins: []
}
