import {devices, type PlaywrightTestConfig} from "@playwright/test"

const config: PlaywrightTestConfig = {
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        headless: false,
        launchOptions: {slowMo: 10},
      },
    },
  ],
  use: {
    trace: "on-first-retry",
  },
}
export default config
