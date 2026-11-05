import { HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision'
export async function createHandDetector(
  files: Awaited<ReturnType<typeof FilesetResolver.forVisionTasks>>,
  baseUrl: string,
) {
  return HandLandmarker.createFromOptions(files, {
    baseOptions: { modelAssetPath: `${baseUrl}models/hand_landmarker.task`, delegate: 'CPU' },
    runningMode: 'VIDEO',
    numHands: 2,
    minHandDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5,
  })
}
