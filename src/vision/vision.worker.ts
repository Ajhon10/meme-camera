import { FilesetResolver } from '@mediapipe/tasks-vision'
import { createFaceDetector } from './faceDetector'
import { createHandDetector } from './handDetector'
import { createPoseDetector } from './poseDetector'
import { emptyFrame, type WorkerRequest, type WorkerResponse } from './visionTypes'

let face: Awaited<ReturnType<typeof createFaceDetector>> | undefined
let hands: Awaited<ReturnType<typeof createHandDetector>> | undefined
let pose: Awaited<ReturnType<typeof createPoseDetector>> | undefined
const reply = (message: WorkerResponse) => self.postMessage(message)

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const message = event.data
  try {
    if (message.type === 'init') {
      const files = await FilesetResolver.forVisionTasks(`${message.baseUrl}wasm`)
      // Sequential initialization avoids races in MediaPipe's WASM loader globals.
      face = await createFaceDetector(files, message.baseUrl)
      hands = await createHandDetector(files, message.baseUrl)
      pose = await createPoseDetector(files, message.baseUrl)
      reply({ type: 'ready' })
    } else {
      const start = performance.now()
      const frame = emptyFrame()
      frame.timestamp = message.timestamp
      if (message.detectors.face && face) {
        const result = face.detectForVideo(message.bitmap, message.timestamp)
        frame.face = result.faceLandmarks[0] ?? []
        for (const category of result.faceBlendshapes[0]?.categories ?? [])
          frame.expressions[category.categoryName] = category.score
      }
      if (message.detectors.hands && hands) {
        const result = hands.detectForVideo(message.bitmap, message.timestamp)
        frame.hands = result.landmarks.map((landmarks, index) => ({
          // Input is unmirrored. MediaPipe handedness assumes selfie input, so swap labels.
          side: result.handedness[index]?.[0]?.categoryName === 'Left' ? 'Right' : 'Left',
          landmarks,
        }))
      }
      if (message.detectors.pose && pose)
        frame.pose = pose.detectForVideo(message.bitmap, message.timestamp).landmarks[0] ?? []
      reply({ type: 'result', frame, elapsed: performance.now() - start })
    }
  } catch (error) {
    reply({ type: 'error', message: error instanceof Error ? error.message : String(error) })
  } finally {
    if (message.type === 'frame') message.bitmap.close()
  }
}
