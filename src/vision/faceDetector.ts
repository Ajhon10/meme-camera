import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision'
export async function createFaceDetector(
  files: Awaited<ReturnType<typeof FilesetResolver.forVisionTasks>>,
  baseUrl: string,
) {
  return FaceLandmarker.createFromOptions(files, {
    baseOptions: { modelAssetPath: `${baseUrl}models/face_landmarker.task`, delegate: 'CPU' },
    runningMode: 'VIDEO',
    numFaces: 1,
    outputFaceBlendshapes: true,
    minFaceDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5,
  })
}
