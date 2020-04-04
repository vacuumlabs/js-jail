module.exports = {
  extends: 'vacuumlabs',
  env: {
    browser: true,
    node: true,
    mocha: true,
  },
  settings: {
    'import/resolver': {
      node: {
        paths: ['.'],
        extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
      },
    },
  },
  parserOptions: {
    ecmaVersion: 9,
    ecmaFeatures: {
      jsx: true,
      impliedStrict: true,
      globalReturn: false,
    },
  },
  globals: {
    Reflect: true,
    Proxy: true,
    WeakMap: true,
    Symbol: true,
  },
  root: true,
  reportUnusedDisableDirectives: true,
  rules: {
    'max-len': [
      'error',
      {
        comments: 100,
        code: 100,
        tabWidth: 2,
        ignoreUrls: true,
        ignoreStrings: true,
        ignoreTemplateLiterals: true,
        ignoreRegExpLiterals: true,
      },
    ],
    'no-constant-condition': 0,
    'no-console': 0,
    'comma-dangle': 0,
    'guard-for-in': 0,
    'no-empty': 0,
    'no-eval': 0,
    'no-loop-func': 0,
    'camelcase': 0,
    'no-empty-function': 0,
    'prefer-const': 1,
    'space-infix-ops': 1,
    'prefer-template': 1,
    'quotes': 1,
    'indent': 0,
    'curly': 0,
    'no-unused-vars': 0,
  },
  reportUnusedDisableDirectives: false,
}
