/** @type {import("eslint").Linter.Config} */
module.exports = {
  root: true,
  ignorePatterns: [".eslintrc.cjs"],
  extends: ["@healseek/eslint-config/index.js"],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: true,
  },
  // Keep upstream shadcn-vue chart source unchanged. Its public chart config
  // intentionally accepts Chart.js' open-ended dataset/options shape.
  overrides: [
    {
      files: ["src/components/ui/chart/ChartPlugin.ts"],
      rules: { "@typescript-eslint/no-explicit-any": "off" },
    },
  ],
};
