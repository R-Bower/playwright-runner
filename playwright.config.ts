import {devices, type PlaywrightTestConfig} from "@playwright/test"

const config: PlaywrightTestConfig = {
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        headless: false,
        launchOptions: {slowMo: 10},
        viewport: {height: 1304, width: 1157},
      },
    },
  ],
  testMatch: "src/**/*.ts",
  use: {
    trace: "on-first-retry",
  },
}
export default config
