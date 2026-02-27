import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  use: {
    baseURL: "https://45.132.245.30.sslip.io/commons",
    screenshot: "on",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
  reporter: [["html", { open: "never" }], ["list"]],
});
