import { cp, mkdir, stat, writeFile, rename, rm } from 'node:fs/promises'

await mkdir('public/models', { recursive: true })
await cp('node_modules/@mediapipe/tasks-vision/wasm', 'public/wasm', { recursive: true })
const base = 'https://storage.googleapis.com/mediapipe-models/'
const models = {
  face_landmarker: 'face_landmarker/face_landmarker/float16/1/face_landmarker.task',
  hand_landmarker: 'hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
  pose_landmarker: 'pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
}
for (const [name, remote] of Object.entries(models)) {
  const destination = `public/models/${name}.task`
  if (
    await stat(destination)
      .then((file) => file.size > 100000)
      .catch(() => false)
  ) {
    console.log(`${name}: already installed`)
    continue
  }
  console.log(`Downloading ${name} (one-time setup)...`)
  const response = await fetch(base + remote, { signal: AbortSignal.timeout(180000) })
  if (!response.ok) throw new Error(`Download failed: ${response.status} ${response.statusText}`)
  const data = new Uint8Array(await response.arrayBuffer())
  if (data.length < 100000) throw new Error(`Invalid model: ${name}`)
  const temporary = destination + '.download'
  try {
    await writeFile(temporary, data)
    await rename(temporary, destination)
  } finally {
    await rm(temporary, { force: true })
  }
  console.log(`${name}: ${(data.length / 1048576).toFixed(1)} MB installed`)
}
console.log('Models and WASM are local. No network is used at runtime.')
