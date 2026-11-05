import { contextBridge, ipcRenderer } from 'electron'
contextBridge.exposeInMainWorld('memeHelp', {
  openExternal: (url: string) => ipcRenderer.invoke('help:openExternal', url),
})
contextBridge.exposeInMainWorld('memeCamera', {
  control: (action: string) => ipcRenderer.invoke('camera:control', action),
  frame: (data: Uint8Array) => ipcRenderer.invoke('camera:frame', data),
})
