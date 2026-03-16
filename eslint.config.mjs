import antfu from '@antfu/eslint-config'

export default antfu(
  {
    react: true,
    typescript: true,
    stylistic: {
      quotes: 'single',
    },
    ignores: [
      'dist',
      'node_modules',
      'coverage',
      '*.tsbuildinfo',
      'docs',
    ],
  },
  {
    files: ['pnpm-workspace.yaml'],
    rules: {
      'pnpm/yaml-enforce-settings': 'off',
    },
  },
)
