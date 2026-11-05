import { _electron as electron } from 'playwright'
import electronBinary from 'electron'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import assert from 'node:assert/strict'
import path from 'node:path'
const env = { ...process.env }
delete env.ELECTRON_RUN_AS_NODE
delete env.VITE_DEV_SERVER_URL
const packaged = process.argv.includes('--packaged')
const installed = process.argv.includes('--installed')
const realProfile = installed && process.argv.includes('--real-profile')
const executablePath = installed
  ? 'C:/Program Files/MemeCam/MemeCam.exe'
  : packaged
    ? path.resolve('release/win-unpacked/MemeCam.exe')
    : electronBinary
const args = [
  ...(packaged || installed ? [] : ['.']),
  ...(realProfile ? [] : [`--user-data-dir=${path.resolve('artifacts/profile-isolation-test')}`]),
]
let app, other
try {
  app = await electron.launch({ executablePath, args, env })
  const page = await app.firstWindow()
  await page.getByRole('heading', { name: 'Look alive. Get expressive.' }).waitFor()
  const switches = page.locator('.effect-card [role="switch"]')
  const count = await switches.count()
  assert.ok(count >= 10)
  for (let i = 0; i < count; i++) {
    const toggle = switches.nth(i)
    const original = await toggle.getAttribute('aria-checked')
    await toggle.click()
    await page.waitForFunction(
      ({ i, value }) =>
        document
          .querySelectorAll('.effect-card [role="switch"]')
          .item(i)
          ?.getAttribute('aria-checked') === value,
      { i, value: String(original !== 'true') },
    )
    await toggle.click()
    await page.waitForFunction(
      ({ i, value }) =>
        document
          .querySelectorAll('.effect-card [role="switch"]')
          .item(i)
          ?.getAttribute('aria-checked') === value,
      { i, value: original },
    )
  }
  for (const label of ['Face detection', 'Hands detection', 'Body pose detection']) {
    const toggle = page.getByRole('switch', { name: label, exact: true })
    const original = await toggle.getAttribute('aria-checked')
    await toggle.click()
    assert.equal(await toggle.getAttribute('aria-checked'), String(original !== 'true'))
    await toggle.click()
    assert.equal(await toggle.getAttribute('aria-checked'), original)
  }
  console.log(`PASS: all ${count} effect switches and three detector switches change both ways`)
  if (process.argv.includes('--switches-only')) {
    assert.deepEqual(await page.locator('.error-banner').allTextContents(), [])
    await app.close()
    app = undefined
    console.log('PASS: installed profile is usable after releasing the lock; original switch states restored')
    process.exit(0)
  }
  await app.evaluate(({ app }) => {
    globalThis.duplicateLaunches = 0
    app.on('second-instance', () => {
      globalThis.duplicateLaunches++
    })
  })
  const duplicate = spawn(executablePath, args, { env, windowsHide: true, stdio: 'ignore' })
  const timer = setTimeout(() => duplicate.kill(), 10000)
  const [code] = await once(duplicate, 'close')
  clearTimeout(timer)
  assert.equal(code, 0)
  assert.equal(await app.evaluate(() => globalThis.duplicateLaunches), 1)
  assert.equal((await app.windows()).length, 1)
  assert.deepEqual(await page.locator('.error-banner').allTextContents(), [])
  const expected = String((await switches.first().getAttribute('aria-checked')) !== 'true')
  await switches.first().click()
  await page.waitForFunction(
    (value) =>
      document.querySelector('.effect-card [role="switch"]')?.getAttribute('aria-checked') ===
      value,
    expected,
  )
  await page.reload()
  await page.waitForFunction(
    (value) =>
      document.querySelector('.effect-card [role="switch"]')?.getAttribute('aria-checked') ===
      value,
    expected,
  )
  console.log('PASS: duplicate launch focuses the existing instance; effect state survives reload')
  if (realProfile) {
    await switches.first().click()
    await page.waitForFunction(
      (value) =>
        document.querySelector('.effect-card [role="switch"]')?.getAttribute('aria-checked') ===
        value,
      String(expected !== 'true'),
    )
    console.log('PASS: normal installed profile works; original switch states restored')
  }
  if (!packaged && !installed) {
    // Check the real default source-run path while an installed-style profile is open.
    other = await electron.launch({ executablePath: electronBinary, args: ['.'], env })
    const profile = await other.evaluate(({ app }) => ({
      user: app.getPath('userData'),
      session: app.getPath('sessionData'),
    }))
    assert.equal(path.basename(profile.user), 'memecam-development')
    assert.equal(profile.session, profile.user)
    const otherPage = await other.firstWindow()
    await otherPage.getByRole('heading', { name: 'Look alive. Get expressive.' }).waitFor()
    const otherToggle = otherPage.locator('.effect-card [role="switch"]').first()
    const original = await otherToggle.getAttribute('aria-checked')
    await otherToggle.click()
    await otherPage.waitForFunction(
      (value) =>
        document.querySelector('.effect-card [role="switch"]')?.getAttribute('aria-checked') ===
        value,
      String(original !== 'true'),
    )
    await otherToggle.click()
    await otherPage.waitForFunction(
      (value) =>
        document.querySelector('.effect-card [role="switch"]')?.getAttribute('aria-checked') ===
        value,
      original,
    )
    console.log('PASS: default development run uses a separate Chromium storage folder')
  }
} finally {
  await other?.close()
  await app?.close()
}
