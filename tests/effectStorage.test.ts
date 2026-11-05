import { afterEach, describe, expect, it, vi } from 'vitest'
import { defaultEffects } from '../src/effects/defaultEffects'

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.resetModules()
})

function workingConnection() {
  const put = vi.fn()
  const connection = {
    close: vi.fn(),
    onclose: null,
    onversionchange: null,
    transaction: vi.fn(() => {
      const transaction = { objectStore: () => ({ put }), oncomplete: null as null | (() => void) }
      queueMicrotask(() => transaction.oncomplete?.())
      return transaction
    }),
  }
  return { connection, put }
}
describe('local effect storage recovery', () => {
  it('retries after an internal open error without deleting saved data', async () => {
    const requests: Record<string, unknown>[] = []
    const open = vi.fn(() => {
      const request = {}
      requests.push(request)
      return request
    })
    const deleteDatabase = vi.fn()
    vi.stubGlobal('indexedDB', { open, deleteDatabase })
    const { persistEffect } = await import('../src/effects/effectStorage')
    const failed = expect(persistEffect(defaultEffects[0])).rejects.toThrow(
      'Close other MemeCam windows',
    )
    requests[0].error = new Error('Internal error opening backing store for indexedDB.open.')
    ;(requests[0].onerror as () => void)()
    await failed
    const { connection, put } = workingConnection()
    const retry = persistEffect({ ...defaultEffects[0], enabled: false })
    requests[1].result = connection
    ;(requests[1].onsuccess as () => void)()
    await retry
    expect(put).toHaveBeenCalledWith(expect.objectContaining({ enabled: false }))
    expect(deleteDatabase).not.toHaveBeenCalled()
  })
  it('bounds a stalled open and closes a late connection so the UI can retry', async () => {
    vi.useFakeTimers()
    const request: Record<string, unknown> = {}
    vi.stubGlobal('indexedDB', { open: () => request })
    const { persistEffect } = await import('../src/effects/effectStorage')
    const result = expect(persistEffect(defaultEffects[0])).rejects.toThrow('did not respond')
    await vi.advanceTimersByTimeAsync(10000)
    await result
    const { connection } = workingConnection()
    request.result = connection
    ;(request.onsuccess as () => void)()
    expect(connection.close).toHaveBeenCalledOnce()
  })
  it('recovers after a synchronous IndexedDB failure', async () => {
    const open = vi.fn(() => {
      throw new Error('Storage unavailable')
    })
    vi.stubGlobal('indexedDB', { open })
    const { persistEffect } = await import('../src/effects/effectStorage')
    await expect(persistEffect(defaultEffects[0])).rejects.toThrow('Storage unavailable')
    await expect(persistEffect(defaultEffects[0])).rejects.toThrow('Storage unavailable')
    expect(open).toHaveBeenCalledTimes(2)
  })
})
