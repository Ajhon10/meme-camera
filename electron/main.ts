import { app, BrowserWindow, net, protocol, session, ipcMain, shell } from 'electron'
import { isHelpLink } from '../src/help/linkPolicy.js'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { registerVirtualCamera, stopVirtualCamera } from './virtualCamera.js'

const directory = path.dirname(fileURLToPath(import.meta.url))
const developmentUrl = !app.isPackaged ? process.env.VITE_DEV_SERVER_URL : undefined
// Chromium storage cannot be shared by two application processes, even when
// their renderer origins differ. Keep source runs separate from installed users.
if (!app.isPackaged && !app.commandLine.hasSwitch('user-data-dir')) {
  const developmentProfile = path.join(app.getPath('appData'), 'memecam-development')
  app.setPath('userData', developmentProfile)
  app.setPath('sessionData', developmentProfile)
}
if (!app.requestSingleInstanceLock()) app.exit(0)
app.on('second-instance', () => {
  const window = BrowserWindow.getAllWindows()[0]
  if (window) {
    if (window.isMinimized()) window.restore()
    window.show()
    window.focus()
  }
})
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'memecam',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true,
    },
  },
])

function trusted(url: string): boolean {
  try {
    const parsed = new URL(url)
    return (
      (parsed.protocol === 'memecam:' && parsed.host === 'app') ||
      (!!developmentUrl && parsed.origin === new URL(developmentUrl).origin)
    )
  } catch {
    return false
  }
}

async function createWindow() {
  const window = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1060,
    minHeight: 720,
    title: 'MemeCam',
    icon: path.join(
      directory,
      developmentUrl ? '../public/memes/app-icon.png' : '../dist/memes/app-icon.png',
    ),
    backgroundColor: '#101014',
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(directory, 'preload.cjs'),
      webSecurity: true,
    },
  })
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  window.webContents.on('will-navigate', (event, url) => {
    if (!trusted(url)) event.preventDefault()
  })
  window.webContents.on('will-attach-webview', (event) => event.preventDefault())
  window.webContents.on('render-process-gone', stopVirtualCamera)
  window.on('closed', stopVirtualCamera)
  if (developmentUrl) await window.loadURL(developmentUrl)
  else await window.loadURL('memecam://app/index.html')
}

app
  .whenReady()
  .then(async () => {
    ipcMain.handle('help:openExternal', async (event, url: unknown) => {
      if (
        event.senderFrame !== event.sender.mainFrame ||
        !trusted(event.senderFrame.url) ||
        !isHelpLink(url)
      )
        throw new Error('Untrusted help link.')
      await shell.openExternal(url)
    })
    registerVirtualCamera(trusted)
    protocol.handle('memecam', (request) => {
      const url = new URL(request.url)
      if (url.host !== 'app') return new Response('Forbidden', { status: 403 })
      const root = path.resolve(directory, '../dist')
      const requested = path.resolve(root, '.' + decodeURIComponent(url.pathname))
      if (!requested.startsWith(root + path.sep)) return new Response('Forbidden', { status: 403 })
      return net.fetch(pathToFileURL(requested).toString())
    })
    session.defaultSession.setPermissionRequestHandler(
      (contents, permission, callback, details) => {
        callback(
          permission === 'media' &&
            trusted(details.requestingUrl) &&
            trusted(contents.getURL()) &&
            'mediaTypes' in details &&
            !!details.mediaTypes?.length &&
            details.mediaTypes.every((kind) => kind === 'video'),
        )
      },
    )
    session.defaultSession.setPermissionCheckHandler(
      (contents, permission, origin, details) =>
        permission === 'media' &&
        trusted(origin) &&
        !!contents &&
        trusted(contents.getURL()) &&
        details.mediaType === 'video',
    )
    await createWindow()
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) void createWindow()
    })
  })
  .catch((error: unknown) => {
    console.error('MemeCam failed to start:', error)
    app.quit()
  })
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
app.on('before-quit', stopVirtualCamera)
