// .eslintrc.js (frontend)
module.exports = {
  env: { browser: true, es2021: true },
  parserOptions: { ecmaFeatures: { jsx: true }, sourceType: 'module' },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:prettier/recommended',
  ],
  plugins: ['react', 'react-hooks', 'prettier'],
  settings: { react: { version: 'detect' } },
  rules: {
    'prettier/prettier': 'error',
    // CRA/React 17+ doesn’t need React in scope:
    'react/react-in-jsx-scope': 'off',
  },
};
