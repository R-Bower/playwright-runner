import {test} from "@playwright/test"

import {baseUrl, getPlantData, writeData} from "./plant-utils"

test.skip("Single plant", async ({page}) => {
  await page.goto(
    `${baseUrl}/collections/all-plants/products/victoria-red-splender-ionantha-x-brachycaulos-air-plant`,
  )

  const data = await getPlantData(page)

  if (data) {
    writeData("debug.json", [data])
  }
})
