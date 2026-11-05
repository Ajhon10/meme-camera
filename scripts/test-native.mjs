import { spawn } from 'node:child_process'
import { once } from 'node:events'
import assert from 'node:assert/strict'
const executable = 'native/bin/Release/MemeCamCameraHost.exe'
const host = spawn(executable, ['--run'], { windowsHide: true })
let output = '',
  errors = '',
  frameTimer
host.stdout.on('data', (chunk) => {
  output += chunk.toString()
})
host.stderr.on('data', (chunk) => {
  errors += chunk.toString()
})
host.stdin.on('error', () => {})
const deadline = setTimeout(() => {
  console.error('Native smoke timed out', errors, output)
  host.kill()
  process.exitCode = 1
}, 45000)
try {
  const start = Date.now()
  while (!/ready\r?\n/.test(output)) {
    if (host.exitCode !== null || Date.now() - start > 20000)
      throw new Error(errors || 'Camera did not start')
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  // Red RGBA -> limited-range BT.709 luma 63. Verify a real Windows consumer sees it.
  const red = Buffer.alloc(1280 * 720 * 4)
  for (let i = 0; i < red.length; i += 4) {
    red[i] = 255
    red[i + 3] = 255
  }
  host.stdin.write(red)
  frameTimer = setInterval(() => {
    if (!host.stdin.writableNeedDrain) host.stdin.write(red)
  }, 100)
  const probe = spawn(executable, ['--probe'], { windowsHide: true })
  let captured = '',
    failure = ''
  probe.stdout.on('data', (chunk) => {
    captured += chunk.toString()
  })
  probe.stderr.on('data', (chunk) => {
    failure += chunk.toString()
  })
  const timeout = setTimeout(() => probe.kill(), 20000)
  const [code] = await once(probe, 'close')
  clearTimeout(timeout)
  assert.equal(code, 0, failure)
  assert.match(captured, /Captured 1382400 bytes; first luma=63/)
  console.log(captured.trim())
  clearInterval(frameTimer)
  await new Promise((resolve) => setTimeout(resolve, 700))
  const stale = spawn(executable, ['--probe'], { windowsHide: true })
  let black = ''
  stale.stdout.on('data', (chunk) => {
    black += chunk.toString()
  })
  const staleTimeout = setTimeout(() => stale.kill(), 10000)
  const [staleCode] = await once(stale, 'close')
  clearTimeout(staleTimeout)
  assert.equal(staleCode, 0)
  assert.match(black, /first luma=16/)
  console.log('Stale frames replaced with black.')
} finally {
  clearInterval(frameTimer)
  host.stdin.end()
  if (host.exitCode === null) await once(host, 'close')
  clearTimeout(deadline)
}
