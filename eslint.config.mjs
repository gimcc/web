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
    rules: {
      'react-hooks-extra/no-direct-set-state-in-use-effect': 'off',
      'react/no-array-index-key': 'off',
    },
  },
  {
    files: ['pnpm-workspace.yaml'],
    rules: {
      'pnpm/yaml-enforce-settings': 'off',
    },
  },
)
