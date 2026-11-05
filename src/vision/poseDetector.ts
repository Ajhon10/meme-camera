import { PoseLandmarker, FilesetResolver } from '@mediapipe/tasks-vision'
export async function createPoseDetector(
  files: Awaited<ReturnType<typeof FilesetResolver.forVisionTasks>>,
  baseUrl: string,
) {
  return PoseLandmarker.createFromOptions(files, {
    baseOptions: { modelAssetPath: `${baseUrl}models/pose_landmarker.task`, delegate: 'CPU' },
    runningMode: 'VIDEO',
    numPoses: 1,
    minPoseDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5,
  })
}
