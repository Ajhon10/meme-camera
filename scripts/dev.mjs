import { context, build } from 'esbuild'
import { createServer } from 'vite'
import { spawn } from 'node:child_process'
import electron from 'electron'
import { electronOptions, workerOptions, preloadOptions } from './build-runtime.mjs'

await build(electronOptions)
await build(preloadOptions)
const worker = await context(workerOptions)
await worker.watch()
const server = await createServer()
await server.listen()
server.printUrls()
const environment = { ...process.env, VITE_DEV_SERVER_URL: 'http://127.0.0.1:5173' }
delete environment.ELECTRON_RUN_AS_NODE
const child = spawn(electron, ['.'], { stdio: 'inherit', env: environment })
let closing = false
async function close() {
  if (closing) return
  closing = true
  child.kill()
  await server.close()
  await worker.dispose()
}
child.on('exit', async (code) => {
  await close()
  process.exitCode = code ?? 0
})
child.on('error', async (error) => {
  console.error(error)
  await close()
  process.exitCode = 1
})
process.on('SIGINT', close)
process.on('SIGTERM', close)
