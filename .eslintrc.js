module.exports = {
  root: true,
  extends: ['@resume-vita/eslint-config'],
  ignorePatterns: [
    'node_modules/',
    '.next/',
    'dist/',
    'build/',
    '.turbo/',
    '*.config.js',
  ],
};