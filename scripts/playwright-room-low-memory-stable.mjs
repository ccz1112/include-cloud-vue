import fs from 'node:fs/promises'
import path from 'node:path'
import { chromium } from 'playwright'

const webBase = process.env.E2E_BASE_URL || 'http://127.0.0.1:4174'
const apiBase = process.env.E2E_API_BASE_URL || 'http://127.0.0.1:9998'
const artifactDir = path.resolve('artifacts', 'playwright-room-low-memory-stable')
const username = process.env.E2E_USERNAME || 'nian'
const password = process.env.E2E_PASSWORD || '123456'

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

async function ensureArtifactDir() {
  await fs.mkdir(artifactDir, { recursive: true })
}

async function writeSummary(summary) {
  const summaryPath = path.join(artifactDir, 'summary.json')
  await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2), 'utf8')
  return summaryPath
}

async function flushSummary(summary) {
  await writeSummary(summary).catch(() => {})
}

async function safeBodyText(page) {
  try {
    const text = await page.locator('body').innerText()
    return text.replace(/\s+/g, ' ').slice(0, 500)
  } catch {
    return ''
  }
}

async function safeHtmlSnippet(page) {
  try {
    const html = await page.content()
    return html.replace(/\s+/g, ' ').slice(0, 1200)
  } catch {
    return ''
  }
}

async function safeScreenshot(page, name) {
  try {
    await page.screenshot({
      path: path.join(artifactDir, `${name}.png`),
      fullPage: false,
      timeout: 10000
    })
  } catch {
  }
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, options)
  const text = await response.text()
  const json = text ? JSON.parse(text) : null
  return {
    ok: response.ok,
    status: response.status,
    json
  }
}

async function postJson(pathname, body) {
  return requestJson(`${apiBase}${pathname}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
}

async function getJson(pathname) {
  return requestJson(`${apiBase}${pathname}`)
}

async function probeServices() {
  const [frontend, backend] = await Promise.all([
    fetch(`${webBase}/login`, { method: 'GET' }).then(response => response.ok).catch(() => false),
    fetch(`${apiBase}/room/list?gameCode=SHANDONG_MAHJONG&pageNo=1&pageSize=1`, { method: 'GET' }).then(response => response.ok).catch(() => false)
  ])

  return { frontend, backend }
}

function pushEvent(events, message) {
  events.push(message)
}

async function login(page, events) {
  await page.goto(`${webBase}/login`, { waitUntil: 'domcontentloaded' })
  await page.locator('input[type="text"]').fill(username)
  await page.locator('input[type="password"]').fill(password)
  await page.getByRole('button', { name: '立即登录' }).click()
  await page.waitForURL('**/lobby', { timeout: 15000 })
  pushEvent(events, `login-ok:${username}`)
}

async function createRoomAndFill(events) {
  const createResult = await postJson('/room/create', {
    roomName: 'low-memory-stable',
    hostPlayerId: 'sha',
    hostPlayerName: 'sha',
    gameCode: 'SHANDONG_MAHJONG',
    maxPlayerCount: 4
  })

  const roomId = createResult.json?.data?.room?.roomId || ''
  if (!roomId) {
    throw new Error(`创建房间失败: ${JSON.stringify(createResult.json || {})}`)
  }

  for (const playerId of ['nian', 'long', 'abi']) {
    const joinResult = await postJson(`/room/${roomId}/join`, { playerId, playerName: playerId })
    if (!joinResult.ok || joinResult.json?.code !== 200) {
      throw new Error(`加入房间失败(${playerId}): ${JSON.stringify(joinResult.json || {})}`)
    }
  }

  pushEvent(events, `room-created:${roomId}`)
  return roomId
}

async function openRoomAsObserver(page, roomId, events) {
  await page.goto(`${webBase}/room/${roomId}`, { waitUntil: 'domcontentloaded' })
  await page.locator('.room-content').waitFor({ timeout: 15000 })
  const roomText = (await page.locator('.room-content').innerText()).replace(/\s+/g, ' ').slice(0, 200)
  pushEvent(events, `room-opened:${roomText}`)
}

async function readyAll(roomId, page, events) {
  const hostReadyResult = await postJson(`/room/${roomId}/ready`, { playerId: 'sha', ready: true })
  if (!hostReadyResult.ok || hostReadyResult.json?.code !== 200) {
    throw new Error(`房主准备失败: ${JSON.stringify(hostReadyResult.json || {})}`)
  }

  await page.getByRole('button', { name: '我已准备' }).click()
  await page.waitForTimeout(500)

  for (const playerId of ['long', 'abi']) {
    const readyResult = await postJson(`/room/${roomId}/ready`, { playerId, ready: true })
    if (!readyResult.ok || readyResult.json?.code !== 200) {
      throw new Error(`玩家准备失败(${playerId}): ${JSON.stringify(readyResult.json || {})}`)
    }
  }

  pushEvent(events, 'all-ready')
}

async function fetchRoomDetail(roomId, viewerPlayerId) {
  const result = await getJson(`/room/${roomId}?viewerPlayerId=${encodeURIComponent(viewerPlayerId)}`)
  return result.json
}

async function startGame(roomId, events) {
  const startResult = await postJson(`/room/${roomId}/start`, { playerId: 'sha' })
  if (!startResult.ok || startResult.json?.code !== 200) {
    throw new Error(`房主开局失败: ${JSON.stringify(startResult.json || {})}`)
  }
  pushEvent(events, 'host-started')
  return startResult.json
}

async function waitForMahjong(page, events) {
  await page.waitForURL('**/mahjong**', { timeout: 15000 })
  await page.getByText('棋牌乐园').first().waitFor({ timeout: 15000 })
  pushEvent(events, `mahjong-entered:${page.url()}`)
}

async function reloadMahjong(page, events) {
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.getByText('棋牌乐园').first().waitFor({ timeout: 15000 })
  pushEvent(events, `mahjong-reloaded:${page.url()}`)
}

async function main() {
  await ensureArtifactDir()
  const runSummary = {
    webBase,
    apiBase,
    serviceState: null,
    stage: 'init',
    snapshots: {},
    events: []
  }

  const markStage = async stage => {
    runSummary.stage = stage
    await flushSummary(runSummary)
  }

  const serviceState = await probeServices()
  runSummary.serviceState = serviceState
  await flushSummary(runSummary)

  if (!serviceState.frontend || !serviceState.backend) {
    runSummary.error = 'frontend-or-backend-unavailable'
    const summaryPath = await writeSummary(runSummary)
    console.log(JSON.stringify({ ...runSummary, summaryPath }, null, 2))
    process.exitCode = 2
    return
  }

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

  const { events } = runSummary
  const { snapshots } = runSummary

  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } })
    const page = await context.newPage()
    page.setDefaultTimeout(15000)
    page.setDefaultNavigationTimeout(20000)

    page.on('console', message => {
      if (message.type() === 'error') {
        pushEvent(events, `console:error:${message.text()}`)
      }
    })
    page.on('pageerror', error => {
      pushEvent(events, `pageerror:${error.message}`)
    })
    page.on('requestfailed', request => {
      const url = request.url()
      if (shouldTrackBrowserUrl(url) || request.isNavigationRequest()) {
        pushEvent(events, `requestfailed:${request.failure()?.errorText || 'unknown'} ${url}`)
      }
    })
    page.on('response', response => {
      const url = response.url()
      if (response.status() >= 400 && shouldTrackBrowserUrl(url)) {
        pushEvent(events, `response:${response.status()} ${url}`)
      }
    })

    await markStage('login')
    await login(page, events)
    snapshots.afterLogin = { url: page.url() }
    await flushSummary(runSummary)

    await markStage('create-room')
    const roomId = await createRoomAndFill(events)
    runSummary.roomId = roomId
    await flushSummary(runSummary)

    await markStage('open-room-as-observer')
    await openRoomAsObserver(page, roomId, events)
    await flushSummary(runSummary)

    await markStage('reload-room-before-start')
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.locator('.room-content').waitFor({ timeout: 15000 })
    snapshots.roomReloadBeforeStart = {
      url: page.url(),
      bodyText: await safeBodyText(page)
    }
    pushEvent(events, `room-reloaded-before-start:${page.url()}`)
    await flushSummary(runSummary)

    await markStage('ready-all')
    await readyAll(roomId, page, events)
    await flushSummary(runSummary)

    snapshots.beforeStart = await fetchRoomDetail(roomId, username)
    pushEvent(events, `before-start:${snapshots.beforeStart?.data?.room?.status || ''}:${snapshots.beforeStart?.data?.room?.currentGameId || ''}`)
    await flushSummary(runSummary)

    await markStage('start-game')
    await startGame(roomId, events)

    snapshots.afterStart = await fetchRoomDetail(roomId, username)
    pushEvent(events, `after-start:${snapshots.afterStart?.data?.room?.status || ''}:${snapshots.afterStart?.data?.room?.currentGameId || ''}`)
    await flushSummary(runSummary)

    try {
      await markStage('wait-for-mahjong')
      await waitForMahjong(page, events)
      await flushSummary(runSummary)
    } catch (error) {
      pushEvent(events, `mahjong-enter-failed:${error instanceof Error ? error.message : String(error)}`)
      pushEvent(events, `final-url:${page.url()}`)
      const roomMessage = await page.locator('.room-message').allTextContents().catch(() => [])
      snapshots.failure = {
        stage: runSummary.stage,
        finalUrl: page.url(),
        roomMessage,
        bodyText: await safeBodyText(page),
        htmlSnippet: await safeHtmlSnippet(page)
      }
      await safeScreenshot(page, 'mahjong-enter-failed')
      await flushSummary(runSummary)
      throw error
    }

    try {
      await markStage('reload-mahjong')
      await reloadMahjong(page, events)
      await flushSummary(runSummary)
    } catch (error) {
      pushEvent(events, `mahjong-reload-failed:${error instanceof Error ? error.message : String(error)}`)
      snapshots.reloadFailure = {
        stage: runSummary.stage,
        finalUrl: page.url(),
        bodyText: await safeBodyText(page),
        htmlSnippet: await safeHtmlSnippet(page)
      }
      await safeScreenshot(page, 'mahjong-reload-failed')
      await flushSummary(runSummary)
      throw error
    }

    await markStage('completed')
    const summaryPath = await writeSummary(runSummary)

    console.log(JSON.stringify({ roomId, summaryPath, events }, null, 2))
    await context.close()
  } finally {
    await browser.close().catch(() => {})
  }
}

main().catch(async error => {
  const summaryPath = path.join(artifactDir, 'summary.json')
  const existingSummary = await fs.readFile(summaryPath, 'utf8').then(value => JSON.parse(value)).catch(() => null)
  const nextSummary = {
    ...(existingSummary || {}),
    failedStage: existingSummary?.stage || '',
    error: error instanceof Error ? error.message : String(error)
  }
  const writtenPath = await writeSummary(nextSummary).catch(() => '')
  console.error(writtenPath ? `${nextSummary.error}\nsummary: ${writtenPath}` : error)
  process.exitCode = 1
})