/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  rootDir: "src",
  testMatch: ["**/*.spec.ts"],
  moduleNameMapper: {
    "^@quri/agent$": "<rootDir>/../../../packages/agent/src/index.ts",
  },
};
