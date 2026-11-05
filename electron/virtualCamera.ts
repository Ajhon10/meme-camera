import { app, ipcMain, type IpcMainInvokeEvent } from 'electron'
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'
import os from 'node:os'

const bytes = 1280 * 720 * 4
let host: ChildProcessWithoutNullStreams | null = null
let running = false
let error = ''
let pending: (() => void) | null = null
let frameTimer: ReturnType<typeof setTimeout> | undefined
let generation = 0
const binary = () =>
  path.join(
    app.isPackaged
      ? path.join(process.resourcesPath, 'native')
      : path.join(app.getAppPath(), 'native/bin/Release'),
    'MemeCamCameraHost.exe',
  )
const supported = () =>
  process.platform === 'win32' &&
  Number(os.release().split('.')[2]) >= 22000 &&
  process.arch === 'x64'
function command(argument: string): Promise<boolean> {
  return new Promise((resolve) => {
    const child = spawn(binary(), [argument], { windowsHide: true })
    let detail = ''
    child.stderr.on('data', (chunk: Buffer) => {
      detail = (detail + chunk.toString()).slice(-2000)
    })
    child.on('error', (cause) => {
      error = cause.message
      resolve(false)
    })
    child.on('close', (code) => {
      if (code !== 0 && detail) error = detail.trim()
      resolve(code === 0)
    })
  })
}
export function stopVirtualCamera() {
  generation++
  running = false
  clearTimeout(frameTimer)
  pending?.()
  pending = null
  const child = host
  host = null
  if (child) {
    child.stdin.end()
    const timer = setTimeout(() => child.kill(), 3000)
    timer.unref()
    child.once('close', () => clearTimeout(timer))
  }
}
async function status() {
  const available = supported() && existsSync(binary())
  return {
    supported: supported(),
    available,
    installed: available && (await command('--status')),
    running,
    error,
  }
}
async function start() {
  if (host) return status()
  if (!supported() || !existsSync(binary()))
    throw new Error('Native camera requires Windows 11 x64 and the native camera binaries.')
  if (!(await command('--status'))) throw new Error('Install the camera component first.')
  error = ''
  const current = ++generation
  await new Promise<void>((resolve, reject) => {
    const child = spawn(binary(), ['--run'], { windowsHide: true })
    host = child
    let output = '',
      detail = ''
    const timeout = setTimeout(() => {
      error = 'Windows camera startup timed out.'
      stopVirtualCamera()
      reject(new Error(error))
    }, 20000)
    child.stdin.on('error', () => {})
    child.stderr.on('data', (chunk: Buffer) => {
      detail = (detail + chunk.toString()).slice(-2000)
    })
    child.stdout.on('data', (chunk: Buffer) => {
      output += chunk.toString()
      let end: number
      while ((end = output.indexOf('\n')) >= 0) {
        const line = output.slice(0, end).trim()
        output = output.slice(end + 1)
        if (line === 'ready' && current === generation) {
          clearTimeout(timeout)
          running = true
          resolve()
        }
        if (line === 'frame') {
          clearTimeout(frameTimer)
          const complete = pending
          pending = null
          complete?.()
        }
      }
    })
    child.on('error', (cause) => {
      clearTimeout(timeout)
      if (host === child) {
        host = null
        running = false
        error = cause.message
      }
      reject(cause)
    })
    child.on('close', (code) => {
      clearTimeout(timeout)
      if (host === child) {
        host = null
        running = false
        pending?.()
        pending = null
        if (code !== 0) error = detail.trim() || `Camera host exited (${code}).`
      }
      reject(new Error(detail.trim() || 'Camera stopped before it was ready.'))
    })
  })
  return status()
}
export function registerVirtualCamera(trusted: (url: string) => boolean) {
  const check = (event: IpcMainInvokeEvent) => {
    if (event.senderFrame !== event.sender.mainFrame || !trusted(event.senderFrame.url))
      throw new Error('Untrusted camera request.')
  }
  let controlBusy = false
  ipcMain.handle('camera:control', async (event, action: unknown) => {
    check(event)
    if (action === 'status') return status()
    if (action === 'stop') {
      stopVirtualCamera()
      return status()
    }
    if (controlBusy) throw new Error('A camera operation is already in progress.')
    controlBusy = true
    try {
      if (action === 'start') return await start()
      if (action === 'install' || action === 'uninstall') {
        if (host) throw new Error('Stop the virtual camera before changing its installation.')
        if (!supported() || !existsSync(binary()))
          throw new Error('Native camera binaries are unavailable.')
        error = ''
        if (!(await command(action === 'install' ? '--install-ui' : '--uninstall-ui')))
          throw new Error(
            error || 'Camera setup was cancelled or failed. Close camera apps and try again.',
          )
        return await status()
      }
      throw new Error('Unknown camera action.')
    } finally {
      controlBusy = false
    }
  })
  ipcMain.handle('camera:frame', async (event, data: unknown) => {
    check(event)
    if (!(data instanceof Uint8Array) || data.byteLength !== bytes)
      throw new Error('Invalid camera frame.')
    if (!running || !host || pending) return false
    await new Promise<void>((resolve) => {
      pending = resolve
      frameTimer = setTimeout(() => {
        error = 'Camera frame delivery timed out.'
        stopVirtualCamera()
      }, 3000)
      host!.stdin.write(data)
    })
    return running
  })
}
