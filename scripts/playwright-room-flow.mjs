import fs from 'node:fs/promises'
import path from 'node:path'
import { chromium } from 'playwright'

const baseUrl = process.env.E2E_BASE_URL || 'http://127.0.0.1:4173'
const accounts = ['sha', 'nian', 'long', 'abi']
const password = '123456'
const artifactDir = path.resolve('artifacts', 'playwright-room-flow')
const captureScreenshots = process.env.E2E_CAPTURE_SCREENSHOTS === '1'
const printSummary = process.env.E2E_PRINT_SUMMARY === '1'
const maxEventCount = Number(process.env.E2E_MAX_EVENT_COUNT || 120)

function shouldTrackBrowserUrl(url) {
  try {
    const parsed = new URL(url)
    return parsed.pathname.startsWith('/room/')
      || parsed.pathname === '/mahjong'
      || parsed.pathname.startsWith('/api/room')
      || parsed.pathname.startsWith('/api/mahjong')
      || parsed.pathname.startsWith('/api/ws')
  } catch {
    return false
  }
}

function pushEvent(events, entry) {
  if (events.length >= maxEventCount) return
  events.push(entry)
}

async function ensureArtifactDir() {
  await fs.mkdir(artifactDir, { recursive: true })
}

async function attachDebugHooks(page, account, events) {
  page.on('console', message => {
    if (message.type() === 'error') {
      pushEvent(events, `[${account}] console:${message.text()}`)
    }
  })

  page.on('pageerror', error => {
    pushEvent(events, `[${account}] pageerror:${error.message}`)
  })

  page.on('response', response => {
    if (response.status() < 400) return
    const url = response.url()
    if (!shouldTrackBrowserUrl(url)) return
    pushEvent(events, `[${account}] response:${response.status()} ${url}`)
  })
}

async function screenshot(page, name) {
  if (!captureScreenshots) return
  await page.screenshot({
    path: path.join(artifactDir, `${name}.png`),
    fullPage: false,
    timeout: 10000
  })
}

async function safeScreenshot(page, name, account, events) {
  try {
    await screenshot(page, name)
  } catch (error) {
    pushEvent(events, `[${account}] screenshot-failed:${error instanceof Error ? error.message : String(error)}`)
  }
}

async function login(page, account, events) {
  await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded' })
  await page.locator('input[type="text"]').fill(account)
  await page.locator('input[type="password"]').fill(password)
  await page.getByRole('button', { name: '立即登录' }).click()
  await page.waitForURL('**/lobby', { timeout: 15000 })
  pushEvent(events, `[${account}] login-ok`)
}

async function createRoom(page, account, events) {
  await page.getByRole('button', { name: '创建房间' }).first().click()
  await page.waitForURL('**/room/*', { timeout: 15000 })
  const match = page.url().match(/\/room\/([^/?#]+)/)
  if (!match) {
    throw new Error('未能从 URL 提取 roomId')
  }
  const roomId = decodeURIComponent(match[1])
  pushEvent(events, `[${account}] create-room:${roomId}`)
  return roomId
}

async function joinRoom(page, account, roomId, events) {
  await page.goto(`${baseUrl}/lobby`, { waitUntil: 'domcontentloaded' })
  const roomCard = page.locator('.room-item').filter({ hasText: roomId }).first()

  for (let attempt = 0; attempt < 6; attempt++) {
    if (await roomCard.count()) break
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(400)
  }

  if (!await roomCard.count()) {
    throw new Error(`大厅未出现房间 ${roomId}`)
  }

  await roomCard.getByRole('button', { name: '加入' }).click()
  await page.waitForURL(`**/room/${roomId}`, { timeout: 15000 })
  pushEvent(events, `[${account}] join-room:${roomId}`)
}

async function markReady(page, account, events) {
  const readyButton = page.getByRole('button', { name: '我已准备' })
  await readyButton.click()
  await page.waitForTimeout(600)
  pushEvent(events, `[${account}] ready-clicked`)
}

async function waitForRoomFilled(page, roomId, account, events) {
  await page.waitForURL(`**/room/${roomId}`, { timeout: 15000 })
  await page.getByText('4/4').waitFor({ timeout: 20000 })
  pushEvent(events, `[${account}] room-filled`)
}

async function startGame(page, account, events) {
  const startButton = page.getByRole('button', { name: '房主开始' })
  await startButton.waitFor({ timeout: 15000 })
  await startButton.click()
  pushEvent(events, `[${account}] start-clicked`)
}

async function waitForMahjong(page, account, events) {
  await page.waitForURL('**/mahjong**', { timeout: 20000 })
  await page.getByText('棋牌乐园').first().waitFor({ timeout: 10000 })
  pushEvent(events, `[${account}] mahjong-entered`)
}

async function readRoomMessage(page) {
  try {
    const locator = page.locator('.room-message').first()
    return await locator.count() ? (await locator.textContent())?.trim() || '' : ''
  } catch {
    return ''
  }
}

function readPageUrl(page) {
  try {
    return page.url()
  } catch {
    return ''
  }
}

async function main() {
  await ensureArtifactDir()

  const browser = await chromium.launch({
    headless: true,
    args: [
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--disable-extensions',
      '--disable-background-networking',
      '--disable-background-timer-throttling',
      '--disable-renderer-backgrounding',
      '--disable-features=Translate,BackForwardCache,MediaRouter'
    ]
  })
  const contexts = []
  const pages = []
  const events = []

  try {
    for (const account of accounts) {
      const context = await browser.newContext({
        viewport: { width: 1280, height: 720 }
      })
      const page = await context.newPage()
      page.setDefaultTimeout(15000)
      page.setDefaultNavigationTimeout(20000)
      await attachDebugHooks(page, account, events)
      contexts.push(context)
      pages.push({ account, page })
    }

    for (const { account, page } of pages) {
      await login(page, account, events)
      await safeScreenshot(page, `${account}-lobby`, account, events)
    }

    const roomId = await createRoom(pages[0].page, pages[0].account, events)
    await safeScreenshot(pages[0].page, `${pages[0].account}-room-created`, pages[0].account, events)

    for (const { account, page } of pages.slice(1)) {
      await joinRoom(page, account, roomId, events)
      await safeScreenshot(page, `${account}-room-joined`, account, events)
    }

    for (const { account, page } of pages) {
      await waitForRoomFilled(page, roomId, account, events)
    }

    for (const { account, page } of pages) {
      await markReady(page, account, events)
    }

    await pages[0].page.waitForTimeout(1500)
    await startGame(pages[0].page, pages[0].account, events)

    const results = []
    for (const { account, page } of pages) {
      try {
        await waitForMahjong(page, account, events)
        await safeScreenshot(page, `${account}-mahjong`, account, events)
        results.push({ account, status: 'mahjong', url: readPageUrl(page) })
      } catch (error) {
        await safeScreenshot(page, `${account}-failed`, account, events)
        results.push({
          account,
          status: 'failed',
          url: readPageUrl(page),
          roomMessage: await readRoomMessage(page),
          error: error instanceof Error ? error.message : String(error)
        })
      }
    }

    const summary = {
      baseUrl,
      roomId,
      results,
      events
    }

    const summaryPath = path.join(artifactDir, 'summary.json')
    await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2), 'utf8')

    if (printSummary) {
      console.log(JSON.stringify(summary, null, 2))
    } else {
      const successCount = results.filter(item => item.status === 'mahjong').length
      console.log(`summary saved: ${summaryPath}`)
      console.log(`roomId: ${roomId}`)
      console.log(`success: ${successCount}/${results.length}`)
    }
  } finally {
    await Promise.all(contexts.map(context => context.close().catch(() => {})))
    await browser.close().catch(() => {})
  }
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})