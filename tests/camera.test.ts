import { afterEach, describe, expect, it, vi } from 'vitest'
import { CameraManager, cameraError } from '../src/camera/cameraManager'

function mockStream() {
  const track = {
    stop: vi.fn(),
    addEventListener: vi.fn(),
    getSettings: () => ({ deviceId: 'test-device' }),
  }
  const stream = {
    getTracks: () => [track],
    getVideoTracks: () => [track],
  } as unknown as MediaStream
  return { stream, track }
}
function mockVideo() {
  return {
    srcObject: null,
    play: vi.fn().mockResolvedValue(undefined),
  } as unknown as HTMLVideoElement
}
afterEach(() => vi.unstubAllGlobals())
describe('camera lifecycle', () => {
  it('discards a permission request that resolves after Stop', async () => {
    let resolve!: (stream: MediaStream) => void
    vi.stubGlobal('navigator', {
      mediaDevices: {
        getUserMedia: () =>
          new Promise<MediaStream>((done) => {
            resolve = done
          }),
      },
    })
    const camera = new CameraManager(),
      { stream, track } = mockStream(),
      video = mockVideo()
    const starting = camera.start('', video)
    camera.stop()
    resolve(stream)
    expect(await starting).toBe(false)
    expect(track.stop).toHaveBeenCalledOnce()
    expect(video.srcObject).toBeNull()
  })
  it('releases the previous camera before a switch and disables audio', async () => {
    const first = mockStream(),
      second = mockStream(),
      getUserMedia = vi
        .fn()
        .mockResolvedValueOnce(first.stream)
        .mockResolvedValueOnce(second.stream)
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia } })
    const camera = new CameraManager(),
      video = mockVideo()
    expect(await camera.start('first', video)).toBe(true)
    expect(await camera.start('second', video)).toBe(true)
    expect(first.track.stop).toHaveBeenCalledOnce()
    expect(video.srcObject).toBe(second.stream)
    expect(getUserMedia.mock.calls[1]![0]).toMatchObject({
      audio: false,
      video: { deviceId: { exact: 'second' } },
    })
  })
  it('reports useful permission errors', () => {
    expect(cameraError(new DOMException('Denied', 'NotAllowedError'))).toContain('Windows Settings')
    expect(cameraError(new DOMException('Busy', 'NotReadableError'))).toContain('Close other apps')
  })
})
