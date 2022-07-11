import {Page} from "@playwright/test"
import {paramCase} from "change-case"
import {ensureDirSync, writeJsonSync} from "fs-extra"
import {resolve} from "path"
import {range, trim} from "rambda"

const waitTimeout = 500

// #######################
// # CONSTANTS AND TYPES #
// #######################
export const baseUrl = "https://www.livelyroot.com"

export const productListUrl = `${baseUrl}/collections/all-plants?page=7`

// sizes
type PlantSize =
  | "small"
  | "medium"
  | "large"
  | "extra-large"
  | "oneGallon"
  | "fiveGallon"

const sizes: PlantSize[] = [
  "oneGallon",
  "fiveGallon",
  "small",
  "medium",
  "large",
  "extra-large",
]

const plantSizeLabels: Record<PlantSize, string> = {
  "extra-large": "XL",
  fiveGallon: "5G",
  large: "L",
  medium: "M",
  oneGallon: "1G",
  small: "S",
}

// planters
type PlanterId =
  | "grower"
  | "planter-eco-planter"
  | "planter-naturals-basket"
  | "planter-ceramic"

const planterVariants: PlanterId[] = [
  "grower",
  "planter-eco-planter",
  "planter-naturals-basket",
  "planter-ceramic",
]

const planterLabels: Record<PlanterId, string> = {
  grower: "Grower",
  "planter-ceramic": "Ceramic",
  "planter-eco-planter": "Eco Pot",
  "planter-naturals-basket": "Baskets",
}

// metadata
export interface PlantMetadata {
  id: string
  label: string
  value: string
}

// aggregate data
export interface Planter {
  imgSrc: string | null
  planterId: PlanterId
  planterLabel: string
  price: string
}

export type PlantVariant =
  | {
      planters: Planter[]
      sizeId: PlantSize
      sizeLabel: string
    }
  | {imgSrc: string | null; price: string}

export interface Plant {
  description: string[]
  metadata: PlantMetadata[]
  title: string
  variants: PlantVariant[]
}

// #####################
// # Utility Functions #
// #####################
export const outDir = resolve(__dirname, "./out")

export function writeData(fileName: string, data: any): void {
  ensureDirSync(outDir)
  writeJsonSync(resolve(outDir, fileName), {data}, {spaces: 2})
}

// #####################
// # Scraper Functions #
// #####################

export async function handleModal(page: Page): Promise<void> {
  return page
    .waitForSelector(`button[data-dismiss="modal"]`, {timeout: 3000})
    .then((el) => el.click())
    .catch(() => {
      console.debug("No modal, continuing")
    })
}

async function getPlanterData(
  page: Page,
  planterId: PlanterId,
): Promise<Planter | null> {
  const el = await page
    .locator(`label[for="${planterId}"]`)
    .click({timeout: 500})
    .then(() => true)
    .catch(() => {
      return false
    })

  if (!el) {
    return null
  }

  try {
    await page.waitForTimeout(waitTimeout)
    const price = await page.locator("span.product-price").nth(0).innerText()
    const li = await page.locator(
      "li.js-config-image-slide.keen-slider__slide.active",
    )

    const imgSrc = await li
      .locator(`a[data-fancybox="images"]`)
      .getAttribute("href")
    return {imgSrc, planterId, planterLabel: planterLabels[planterId], price}
  } catch (e) {
    return null
  }
}

async function getPlanters(
  page: Page,
  plantSize: PlantSize,
): Promise<Planter[] | false> {
  const sizeEl = await page
    .waitForSelector(`label[for="plant-${plantSize}"]`, {
      timeout: waitTimeout,
    })
    .then(async (el) => {
      await el.click()
      return true
    })
    .catch(() => {
      return false
    })

  if (!sizeEl) {
    return false
  }

  const planters: Planter[] = []

  for (let i = 0; i < planterVariants.length; i++) {
    const planterData = await getPlanterData(page, planterVariants[i])
    await page.waitForTimeout(waitTimeout)
    if (planterData?.price && planterData?.planterId) {
      planters.push(planterData)
    }
  }

  return planters
}

async function getPlantMetadata(page: Page): Promise<PlantMetadata[]> {
  const plantMeta: PlantMetadata[] = []

  const metaTitles = await page.locator("p.feature-item__title")
  const metaLabels = await page.locator("span.feature-item__label")

  const count = await metaTitles.count()

  for (const i of range(0, count)) {
    const labelText = (await metaLabels.nth(i).innerText()) ?? ""
    const metaItem = (await metaTitles.nth(i).textContent()) ?? ""
    const value = metaItem
      .replace(labelText, "")
      .split(" ")
      .map(trim)
      .filter(Boolean)
      .join(" ")

    const label = labelText.replace(":", "").trim()

    plantMeta.push({id: paramCase(label), label: label.replace(":", ""), value})
  }

  return plantMeta
}

export async function getPlantData(page: Page): Promise<Plant | null> {
  await handleModal(page)

  const title = await page.locator("h1.product-overview__title").innerText()
  const descriptionEl = await page.locator(
    "article.product-overview__description.read-more * p",
  )

  const description: string[] = []

  const pElCount = await descriptionEl.count()

  for (const i of range(0, pElCount)) {
    const text = await descriptionEl
      .nth(i)
      .textContent({timeout: 1000})
      .catch((err) => {
        console.debug("Failed to parse description")
        console.debug(err)
      })
    if (text) {
      description.push(text.trim().replaceAll(" ", " "))
    }
  }

  if (!title) {
    throw new Error("Plant title not found")
  }

  if (!description) {
    throw new Error("Plant description not found")
  }

  const metadata = await getPlantMetadata(page)

  const variants: PlantVariant[] = []
  for (const i of range(0, sizes.length)) {
    const size = sizes[i]
    const planters = await getPlanters(page, size)

    if (planters && planters.length) {
      variants.push({planters, sizeId: size, sizeLabel: plantSizeLabels[size]})
    }

    // The Grower planter is available in every size, but not every planter
    // comes in every size. Selecting a "ceramic" planter may limit the
    // available sizes, which halts this script prematurely.  To prevent this,
    // we reset the planter back to "grower" after all of the planters are
    // collected.
    await page
      .locator(`label[for="grower"]`)
      .click({timeout: 500})
      .then(() => true)
      .catch(() => {
        return false
      })
    await page.waitForTimeout(waitTimeout)
  }

  // some plants don't have planters and only come in one size
  if (!variants.length) {
    const price = await page
      .locator("span.product-price")
      .nth(0)
      .innerText()
      .catch(() => false)

    const li = await page.locator("li.keen-slider__slide.featured.active")

    const imgSrc = await li
      .locator(`a[data-fancybox="images"]`)
      .getAttribute("href")
      .catch(() => false)

    if (imgSrc && price) {
      variants.push({imgSrc: imgSrc as string, price: price as string})
    }
  }

  return {
    description,
    metadata,
    title: title ? title.trim() : "",
    variants,
  }
}
