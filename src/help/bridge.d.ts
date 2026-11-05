export {}
declare global {
  interface Window {
    memeHelp?: { openExternal(url: string): Promise<void> }
  }
}
