import { mkdir } from "node:fs/promises";
import { spawn } from "node:child_process";

await Promise.all([
  mkdir("coverage", { recursive: true }),
  mkdir("reports/junit", { recursive: true }),
]);

const args = [
  "--test",
  "--experimental-test-coverage",
  "--test-coverage-include=src/**/*.js",
  "--test-reporter=spec",
  "--test-reporter-destination=stdout",
  "--test-reporter=junit",
  "--test-reporter-destination=reports/junit/unit-tests.xml",
  "--test-reporter=lcov",
  "--test-reporter-destination=coverage/lcov.info",
];

const child = spawn(process.execPath, args, {
  stdio: "inherit",
  env: process.env,
});

child.on("error", (error) => {
  console.error("Unable to start Node.js test runner", error);
  process.exitCode = 1;
});

child.on("exit", (code, signal) => {
  if (signal) {
    console.error(`Node.js test runner terminated by ${signal}`);
    process.exitCode = 1;
    return;
  }
  process.exitCode = code ?? 1;
});
