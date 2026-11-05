import { _electron as electron } from 'playwright'
import assert from 'node:assert/strict'
import path from 'node:path'
const env = { ...process.env }
delete env.ELECTRON_RUN_AS_NODE
delete env.VITE_DEV_SERVER_URL
const packaged = process.argv.includes('--packaged')
const app = await electron.launch({
  ...(packaged ? { executablePath: path.resolve('release/win-unpacked/MemeCam.exe') } : {}),
  args: [
    ...(packaged ? [] : ['.']),
    `--user-data-dir=${path.resolve('artifacts/native-test-profile')}`,
  ],
  env,
})
try {
  const page = await app.firstWindow()
  await page.waitForFunction(() => !!window.memeCamera)
  const result = await page.evaluate(async () => {
    const api = window.memeCamera
    const status = await api.control('start')
    if (!status.running) throw new Error(status.error)
    const pixels = new Uint8Array(1280 * 720 * 4)
    for (let i = 0; i < pixels.length; i += 4) {
      pixels[i] = 255
      pixels[i + 3] = 255
    }
    let busy = false
    await api.frame(pixels)
    const interval = setInterval(async () => {
      if (busy) return
      busy = true
      try {
        await api.frame(pixels)
      } finally {
        busy = false
      }
    }, 100)
    let stream
    try {
      let camera, devices
      for (let attempt = 0; attempt < 30 && !camera; attempt++) {
        devices = await navigator.mediaDevices.enumerateDevices()
        camera = devices.find(
          (device) => device.kind === 'videoinput' && device.label.startsWith('MemeCam'),
        )
        if (!camera) await new Promise((resolve) => setTimeout(resolve, 100))
      }
      if (!camera) throw new Error('Chromium cannot enumerate MemeCam: ' + JSON.stringify(devices))
      stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { deviceId: { exact: camera.deviceId } },
      })
      const video = document.createElement('video')
      video.srcObject = stream
      await video.play()
      await new Promise((resolve) => setTimeout(resolve, 500))
      const canvas = document.createElement('canvas')
      canvas.width = 1280
      canvas.height = 720
      const context = canvas.getContext('2d')
      context.drawImage(video, 0, 0)
      return {
        label: camera.label,
        pixel: [...context.getImageData(640, 360, 1, 1).data],
        width: video.videoWidth,
        height: video.videoHeight,
      }
    } finally {
      clearInterval(interval)
      stream?.getTracks().forEach((track) => track.stop())
      await api.control('stop')
    }
  })
  assert.equal(result.width, 1280)
  assert.equal(result.height, 720)
  assert.ok(
    result.pixel[0] > 240 && result.pixel[1] < 15 && result.pixel[2] < 15,
    JSON.stringify(result),
  )
  console.log('PASS: Electron canvas IPC → native camera → Chromium getUserMedia', result)
} finally {
  await app.close()
}
