import { defineConfig } from 'eslint/config'

export default defineConfig([
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        require: true,
        module: true,
        process: true,
        __dirname: true
      }
    },
    rules: {
      'comma-dangle': ['error'],
      'eol-last': ['error', 'always'],
      'no-trailing-spaces': 'error',
      'no-unused-vars': 'warn',
      'prefer-const': 'error',
      'quote-props': ['error', 'as-needed'],
      indent: ['error', 2, { SwitchCase: 2 }],
      quotes: ['error', 'single'],
      semi: ['error', 'never']
    }
  }
])
