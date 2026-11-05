import { _electron as electron } from 'playwright'
import assert from 'node:assert/strict'
import { mkdir, readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { createServer } from 'vite'

await mkdir('artifacts', { recursive: true })
const environment = { ...process.env }
delete environment.ELECTRON_RUN_AS_NODE
delete environment.VITE_DEV_SERVER_URL
const development = process.argv.includes('--dev')
const packaged = process.argv.includes('--packaged')
const server = development ? await createServer() : null
if (server) {
  await server.listen()
  environment.VITE_DEV_SERVER_URL = 'http://127.0.0.1:5173'
}
const app = await electron.launch({
  ...(packaged ? { executablePath: path.resolve('release/win-unpacked/MemeCam.exe') } : {}),
  args: [
    ...(packaged ? [] : ['.']),
    '--use-fake-device-for-media-stream',
    `--user-data-dir=${path.resolve('artifacts/smoke-profile')}`,
  ],
  env: environment,
  timeout: 30000,
})
const errors = [],
  external = []
try {
  const page = await app.firstWindow()
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') console.log('Renderer:', message.text())
  })
  page.on('request', (request) => {
    if (
      /^https?:/.test(request.url()) &&
      !(development && new URL(request.url()).origin === 'http://127.0.0.1:5173')
    )
      external.push(request.url())
  })
  await page.getByRole('heading', { name: 'Look alive. Get expressive.' }).waitFor()
  await page.screenshot({
    path: development ? 'artifacts/studio-dev.png' : 'artifacts/studio.png',
    fullPage: true,
  })
  assert.equal(await page.evaluate(() => typeof window.require), 'undefined')
  const preferences = await app.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows()[0].webContents.getLastWebPreferences(),
  )
  assert.equal(preferences.nodeIntegration, false)
  assert.equal(preferences.contextIsolation, true)
  assert.equal(preferences.sandbox, true)
  console.log(
    `PASS: ${development ? 'development' : 'production'} Electron launch and renderer isolation`,
  )

  await page.getByRole('button', { name: 'Help & tutorial', exact: true }).click()
  const help = page.getByRole('dialog', { name: 'Help & tutorial' })
  await help.getByRole('button', { name: 'Restart tutorial', exact: true }).click()
  await help.getByRole('button', { name: 'Next step', exact: true }).click()
  assert.equal(
    await help.getByRole('heading', { name: 'Start your webcam', exact: true }).count(),
    1,
  )
  await page.keyboard.press('Escape')
  assert.equal(await page.getByRole('dialog').count(), 0)
  await page.getByRole('button', { name: 'Help & tutorial', exact: true }).click()
  assert.equal(
    await help.getByRole('heading', { name: 'Start your webcam', exact: true }).count(),
    1,
  )
  assert.equal(await help.getByRole('button', { name: 'Build an EXE', exact: true }).count(), 0)
  assert.equal(
    await help.getByRole('button', { name: 'Setup & installation', exact: true }).count(),
    0,
  )
  await help.getByRole('button', { name: 'Meeting platforms', exact: true }).click()
  assert.equal(await help.getByRole('heading', { name: 'Google Meet', exact: true }).count(), 1)
  assert.equal(await help.getByRole('heading', { name: 'Zoom Workplace', exact: true }).count(), 1)
  assert.equal(await help.getByRole('heading', { name: 'Microsoft Teams', exact: true }).count(), 1)
  await help.getByRole('button', { name: 'troubleshooting guide', exact: true }).click()
  assert.equal(
    await help
      .getByRole('heading', { name: 'Troubleshooting and local data', exact: true })
      .count(),
    1,
  )
  await help.getByRole('button', { name: 'Quick tutorial', exact: true }).click()
  await help.getByRole('button', { name: 'Step 6: Finish', exact: true }).click()
  await help.getByRole('button', { name: 'Finish tutorial', exact: true }).click()
  assert.equal(await page.getByRole('dialog').count(), 0)
  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  await page.getByRole('button', { name: 'Privacy Policy', exact: true }).click()
  assert.equal(await help.getByRole('heading', { name: 'Privacy Policy', exact: true }).count(), 1)
  assert.match(await help.innerText(), /Draft for MemeCam/)
  assert.match(await help.innerText(), /may transmit, record/)
  await help.getByRole('button', { name: 'Terms & Conditions', exact: true }).click()
  assert.equal(
    await help.getByRole('heading', { name: 'Terms and Conditions', exact: true }).count(),
    1,
  )
  await help.getByRole('button', { name: 'Quick tutorial', exact: true }).click()
  await help.getByRole('button', { name: 'Restart tutorial', exact: true }).click()
  await page.screenshot({ path: 'artifacts/tutorial.png', fullPage: true })
  await help.getByRole('button', { name: 'Close help', exact: true }).click()
  const blockedHelpLink = await page.evaluate(async () => {
    try {
      await window.memeHelp.openExternal('file:///C:/Windows/System32/cmd.exe')
      return false
    } catch {
      return true
    }
  })
  assert.equal(blockedHelpLink, true)
  console.log(
    'PASS: tutorial resume/finish, user-only offline guides, policy navigation, restricted help links',
  )
  if (packaged) {
    for (const file of [
      'USER_GUIDE.md',
      'MEETINGS.md',
      'TROUBLESHOOTING.md',
      'PRIVACY.md',
      'TERMS.md',
    ]) {
      assert.equal(
        await readFile(path.join('release/win-unpacked/resources/docs', file), 'utf8'),
        await readFile(path.join('docs', file), 'utf8'),
      )
    }
    assert.deepEqual(
      (await readdir('release/win-unpacked/resources/docs')).sort(),
      ['USER_GUIDE.md', 'MEETINGS.md', 'TROUBLESHOOTING.md', 'PRIVACY.md', 'TERMS.md'].sort(),
    )
    for (const asset of await readdir('dist/assets')) {
      if (asset.endsWith('.js'))
        assert.doesNotMatch(
          await readFile(path.join('dist/assets', asset), 'utf8'),
          /npm\.cmd|Build MemeCam into a Windows app|Visual Studio 2022 Build Tools/,
        )
    }
    console.log(
      'PASS: developer setup/build guides excluded from the renderer and packaged documents',
    )
  }

  await page.getByRole('button', { name: 'Meme pack', exact: true }).click()
  assert.equal(await page.locator('.effect-card').count(), 7)
  await page.waitForFunction(() =>
    [...document.querySelectorAll('.effect-art img')].every(
      (image) => image.complete && image.naturalWidth > 0,
    ),
  )
  await page.screenshot({ path: 'artifacts/meme-pack.png', fullPage: true })
  await page.getByRole('button', { name: 'Browse 71 gestures' }).click()
  assert.equal(await page.locator('.gesture-guide-item').count(), 71)
  await page.getByRole('button', { name: 'Face (22)', exact: true }).click()
  assert.equal(await page.locator('.gesture-guide-item').count(), 22)
  await page.getByLabel('Search gestures').fill('wink')
  assert.equal(await page.locator('.gesture-guide-item').count(), 2)
  await page.getByRole('button', { name: 'Close gesture guide' }).click()
  await page.getByRole('button', { name: 'All effects', exact: true }).click()
  console.log('PASS: seven bundled meme images and searchable 71-gesture guide')

  await page.getByRole('button', { name: 'Create effect', exact: true }).first().click()
  await page.getByLabel('Effect name', { exact: true }).fill('Smoke test reaction')
  await page.locator('#effect-image').setInputFiles('public/memes/flight-reaction.jpg')
  for (const [type, count] of [
    ['hand', 19],
    ['face', 22],
    ['pose', 18],
    ['combined', 12],
  ]) {
    await page.getByLabel('Trigger type', { exact: true }).selectOption(type)
    assert.equal(await page.getByLabel('Gesture', { exact: true }).locator('option').count(), count)
  }
  await page.getByLabel('Trigger type', { exact: true }).selectOption('face')
  await page.getByLabel('Gesture', { exact: true }).selectOption('wink-left')
  await page.getByRole('button', { name: 'Save effect', exact: true }).click()
  await page.getByRole('heading', { name: 'Smoke test reaction' }).waitFor()
  await page.reload()
  await page.getByRole('heading', { name: 'Smoke test reaction' }).waitFor()
  await page.getByRole('button', { name: 'Edit Smoke test reaction' }).click()
  assert.equal(await page.getByLabel('Gesture', { exact: true }).inputValue(), 'wink-left')
  assert.match(
    await page.locator('.image-upload img').getAttribute('src'),
    /^data:image\/jpeg;base64,/,
  )
  await page.getByRole('button', { name: 'Close effect editor' }).click()
  await page
    .getByRole('article')
    .filter({ hasText: 'Smoke test reaction' })
    .getByRole('button', { name: 'Delete effect' })
    .click()
  await page.getByRole('heading', { name: 'Smoke test reaction' }).waitFor({ state: 'detached' })
  console.log('PASS: JPEG upload, expanded trigger selection, save, reload persistence, delete')

  await page.getByRole('button', { name: 'Start camera', exact: true }).first().click()
  await page.waitForFunction(
    () => document.querySelector('.status-pill')?.textContent === 'Live',
    null,
    { timeout: 20000 },
  )
  await page.waitForFunction(
    () => ['READY', 'ERROR'].includes(document.querySelector('.tiny-label')?.textContent ?? ''),
    null,
    { timeout: 120000 },
  )
  const visionStatus = await page.locator('.tiny-label').textContent()
  assert.equal(
    visionStatus,
    'READY',
    visionStatus === 'ERROR'
      ? await page.locator('.vision-error').textContent()
      : 'Vision did not become ready',
  )
  await page.waitForFunction(
    () => Number(document.querySelectorAll('.quick-stats strong')[1]?.textContent) > 0,
    null,
    { timeout: 30000 },
  )
  assert.match(await page.locator('.output-status small').textContent(), /Running/)
  if (process.argv.includes('--native')) {
    await page.getByRole('button', { name: 'Start virtual camera', exact: true }).click()
    await page.getByRole('button', { name: 'Stop virtual camera', exact: true }).waitFor()
    const { execFile } = await import('node:child_process')
    const { promisify } = await import('node:util')
    const result = await promisify(execFile)(
      path.resolve(
        packaged
          ? 'release/win-unpacked/resources/native/MemeCamCameraHost.exe'
          : 'native/bin/Release/MemeCamCameraHost.exe',
      ),
      ['--probe'],
      { windowsHide: true, timeout: 20000 },
    )
    assert.match(result.stdout, /Captured 1382400 bytes/)
    console.log('PASS: live app canvas delivered through native Windows camera')
  }
  await page.getByRole('switch', { name: 'Face detection', exact: true }).click()
  await page.getByRole('switch', { name: 'Face detection', exact: true }).click()
  await page.getByRole('button', { name: 'Open clean output' }).click()
  assert.equal(
    await page.locator('.app-shell').evaluate((node) => node.classList.contains('clean-output')),
    true,
  )
  await page.keyboard.press('Escape')
  await page.screenshot({ path: 'artifacts/running.png' })
  await page.getByRole('button', { name: 'Stop camera', exact: true }).click()
  assert.equal(await page.locator('.output-status small').textContent(), 'Stopped')
  assert.equal(await page.locator('video').evaluate((video) => video.srcObject), null)
  if (process.argv.includes('--native')) {
    await page.waitForFunction(async () => !(await window.memeCamera.control('status')).running)
    console.log('PASS: stopping physical input also stops virtual output')
  }
  console.log('PASS: fake webcam → local MediaPipe worker → canvas stream → clean output → stop')
  assert.deepEqual(errors, [])
  assert.deepEqual(external, [])
  console.log('PASS: no page exceptions or external HTTP requests')
} catch (error) {
  const page = await app.firstWindow()
  await page
    .screenshot({ path: 'artifacts/failure.png' })
    .catch((captureError) => console.error('Failure screenshot unavailable:', captureError))
  console.error(
    await page
      .locator('body')
      .innerText()
      .catch(() => 'No renderer'),
  )
  throw error
} finally {
  await app.close()
  await server?.close()
}
