// Smoke tests for the GeneSetR frontend. The API is mocked (see tests/mockApi.js),
// so only the frontend has to run:
//   - locally: against the dev server if one is running on E2E_BASE_URL
//     (default http://localhost:3002), otherwise the production build is served
//   - in CI:   the production build (../build) served by serve-build.js
const { defineConfig, devices } = require("@playwright/test");

const baseURL = process.env.E2E_BASE_URL || "http://localhost:3002";
const port = Number(new URL(baseURL).port || 80);

module.exports = defineConfig({
  testDir: "./tests",
  timeout: 60000,
  expect: { timeout: 15000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    viewport: { width: 1400, height: 900 },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1400, height: 900 } } }],
  webServer: {
    command: `node serve-build.js ${port}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 60000,
  },
});
