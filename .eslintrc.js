module.exports = {
  env: {
    browser: true,
    es2021: true,
  },
  extends: [
    'airbnb-base',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 12,
    sourceType: 'module',
  },
  ignorePatterns: 'dist/**/*',
  plugins: [
    '@typescript-eslint',
  ],
  rules: {
    'no-console': 0,
  },
};
