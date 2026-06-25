export default {
  mutate: [
    "src/homeassistant_custom_refrigerator_card.js:172-245",
    "src/homeassistant_custom_refrigerator_card.js:314-365"
  ],
  testRunner: "command",
  commandRunner: {
    command: "npm run test:unit",
  },
  coverageAnalysis: "off",
  reporters: ["clear-text", "html", "json"],
  thresholds: {
    high: 80,
    low: 65,
    break: 65,
  },
  concurrency: "50%",
  timeoutMS: 10000,
  htmlReporter: {
    fileName: "reports/mutation/mutation.html",
  },
  jsonReporter: {
    fileName: "reports/mutation/mutation.json",
  },
  ignorePatterns: ["coverage", "dist", "reports"],
};
