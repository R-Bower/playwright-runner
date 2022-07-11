import {test} from "@playwright/test"
import {ensureDirSync, existsSync, readJsonSync} from "fs-extra"
import {resolve} from "path"
import {range} from "rambda"

import {
  baseUrl,
  getPlantData,
  handleModal,
  outDir,
  productListUrl,
  writeData,
} from "./plant-utils"

test.setTimeout(120000)

test.describe.configure({mode: "parallel"})

test.skip("Plant links scraper", async ({page}) => {
  await page.goto(productListUrl)
  const products = await page.locator("card-product")
  const count = await products.count()

  await page.waitForTimeout(2000)
  await handleModal(page)

  const links: string[] = []

  for (const i of range(0, count)) {
    const link = (await products.nth(i).locator("a").getAttribute("href")) ?? ""
    links.push(link)
  }
  writeData("links.json", links)
})

if (existsSync(resolve(outDir, "./links.json"))) {
  ensureDirSync(resolve(outDir, "plants"))
  const jsonLinks = readJsonSync(resolve(outDir, "./links.json"), {
    encoding: "utf-8",
  })
  const links: string[] = jsonLinks.data
  for (const i of range(0, links.length)) {
    const link = links[i]
    test(link, async ({page}) => {
      await page.goto(`${baseUrl}${link}`)
      const data = await getPlantData(page)
      if (data) {
        writeData(`plants/plant-${i}.json`, data)
      }
    })
  }
}
