module.exports = {
  env: {
    node: true,
    es2021: true,
  },
  extends: [
    "eslint:recommended",
    "plugin:prettier/recommended", // 💅 Enables prettier plugin + turns off conflicting rules
  ],
  plugins: ["prettier"],
  rules: {
    "prettier/prettier": "error", // 🔥 Show prettier violations as ESLint errors
  },
};
