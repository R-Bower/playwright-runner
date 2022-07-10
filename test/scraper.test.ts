import {Page, test} from "@playwright/test"

test("Runs", async ({page}) => {
  await page.goto("https://www.livelyroot.com/collections/all-plants")
  const products = await page.locator("card-product")

  console.debug(products)
  const count = await products.count()

  const items: any[] = []

  console.debug(count)

  for (let i = 0; i < 1; i++) {
    const imgSrc = await products.nth(i).locator("img").getAttribute("src")
    console.debug(imgSrc)

    await products.nth(i).click()
    await page.waitForNavigation({
      timeout: 5000,
      url: "https://www.thesill.com/products/*",
    })
  }
})

function exit() {
  throw new Error("Failed to find product information")
}

const planterVariants = [
  "grower",
  "planter-eco-planter",
  "planter-naturals-basket",
  "planter-ceramic",
]

const sizes = ["small", "medium", "large", "extra-large"]

const waitTimeout = 500

async function getPlanter(page: Page, planter: string): Promise<any> {
  const planterExists = await page.$(`label[for="${planter}"]`)
  if (!planterExists) {
    console.debug("none")
    return {}
  }

  try {
    const el = await page
      .locator(`label[for="${planter}"]`)
      .click({timeout: 500})
      .then(() => true)
      .catch(() => {
        return false
      })

    if (!el) {
      return {}
    }
    await page.waitForTimeout(waitTimeout)
    const price = await page.locator("span.product-price").nth(0).innerText()
    const li = await page.locator(
      "li.js-config-image-slide.keen-slider__slide.active",
    )

    const imgSrc = await li
      .locator(`a[data-fancybox="images"]`)
      .getAttribute("href")
    console.debug(imgSrc)
    return {imgSrc, planter, price}
  } catch (e) {
    console.debug(e)
    return {}
  }
}

async function getPlantData(page: Page, sizeStr: string): Promise<any> {
  const size = await page.locator(`label[for="plant-${sizeStr}"]`)
  const count = await size.count()
  if (!count) {
    return {}
  }

  size.click()

  const planters: any[] = []
  for (let i = 0; i < planterVariants.length; i++) {
    const planterData = await getPlanter(page, planterVariants[i])
    await page.waitForTimeout(waitTimeout)
    if (planterData.price) {
      planters.push(planterData)
    }
  }

  return {planters, size: sizeStr}
}

async function getData(page: Page) {
  const items: any[] = []
  for (let i = 0; i < sizes.length; i++) {
    const res = await getPlantData(page, sizes[i])
    await page.waitForTimeout(waitTimeout)
    items.push(res)
  }

  return items
}

test.only("single plant", async ({page}) => {
  await page.goto(
    "https://www.livelyroot.com/collections/all-plants/products/money-tree?variant=39389423075410",
  )
  const title = await page.locator("h1.product-overview__title").innerText()

  const productContent = await page.locator(
    "div.product-overview__content-body",
  )
  if (!productContent) {
    return exit()
  }

  const btn = await page.waitForSelector(`button[data-dismiss="modal"]`)
  await btn.click()

  const data = await getData(page)
  console.debug(JSON.stringify({data, title}, null, 2))
})
