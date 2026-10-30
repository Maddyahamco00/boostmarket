import next from "eslint-config-next";

const eslintConfig = [
  {
    ignores: ["**/dist/**", ".next/**", "node_modules/**"],
  },
  ...next,
  {
    rules: {
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "prefer-const": "error",
      "no-console": ["warn", { allow: ["warn", "error", "info", "log"] }],
    },
  },
];

export default eslintConfig;
