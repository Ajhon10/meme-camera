import { build } from 'esbuild'
import { access } from 'node:fs/promises'

export const electronOptions = {
  entryPoints: ['electron/main.ts'],
  outdir: 'dist-electron',
  bundle: true,
  platform: 'node',
  format: 'esm',
  external: ['electron'],
  target: 'node22',
}
export const workerOptions = {
  entryPoints: ['src/vision/vision.worker.ts'],
  outfile: 'public/vision-worker.js',
  bundle: true,
  platform: 'browser',
  format: 'iife',
  target: 'es2022',
}
export const preloadOptions = {
  entryPoints: ['electron/preload.ts'],
  outfile: 'dist-electron/preload.cjs',
  bundle: true,
  platform: 'node',
  format: 'cjs',
  external: ['electron'],
  target: 'node22',
}

if (process.argv[1]?.endsWith('build-runtime.mjs')) {
  for (const asset of ['face_landmarker', 'hand_landmarker', 'pose_landmarker']) {
    try {
      await access(`public/models/${asset}.task`)
    } catch {
      throw new Error('Missing local models. Run npm run setup:assets first.')
    }
  }
  await Promise.all([build(electronOptions), build(preloadOptions), build(workerOptions)])
}
