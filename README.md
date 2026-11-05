# MemeCam

Developed by **Ajan Jeresano**.

A Windows-first desktop camera studio that attaches image reactions to your face, hands, and body when you make a gesture. Everything runs locally. Version 0.3 provides a processed preview, canvas MediaStream, and a native Windows 11 virtual camera for meeting apps.

## Guides and tutorial

Open **Help & tutorial** in the sidebar for a six-step walkthrough with locally saved progress, usage instructions, meeting-platform help, troubleshooting, Privacy Policy, and Terms and Conditions. Settings links directly to the policies. Guides are bundled offline; official external links open your browser only when clicked.

The user documents are available in the [MemeCam handbook](docs/README.md) and in `resources/docs` beside the packaged app. Developer-only [Setup](docs/developer/SETUP.md) and [Build an EXE](docs/developer/BUILD.md) remain in the source tree and are excluded from the app and installer. The [Privacy Policy](docs/PRIVACY.md) and [Terms](docs/TERMS.md) are drafts pending the publisher's identity, contact information, and release review.

## Quick start

Requirements: Windows 10/11 x64, Node.js 22.12+ (Node 22 LTS recommended), npm, a webcam, and internet access for the initial dependency/model download. Allow camera access for desktop applications in Windows Settings. An installer can run without Node.js.

From PowerShell:

```powershell
cd C:\Users\Lenovo\Desktop\PROJECTS\PERSONAL\meme-camera
npm.cmd ci
npm.cmd run setup:assets
npm.cmd run dev
```

After cloning or disk cleanup, first restore the private `public/memes/` assets from the local backup, then install dependencies and run asset setup as above. See [backup and restore](docs/developer/BACKUP_RESTORE.md). Supplied images, derived icons, saved user profiles, installers and downloaded models are excluded from public GitHub source. Use `npm.cmd` if PowerShell blocks `npm.ps1`; changing the machine's execution policy is unnecessary.

The built Windows installer is [MemeCam Setup 0.3.4.exe](<release/MemeCam Setup 0.3.4.exe>) (about 120 MB). You can also run [MemeCam.exe](release/win-unpacked/MemeCam.exe) directly without installing; keep the entire `win-unpacked` folder together. The installer is unsigned and may show a Windows publisher warning. The native camera component is installed on this development machine. Other machines use the one-time Install virtual camera button.

`dev` builds Electron, watches the vision worker, starts Vite at `http://127.0.0.1:5173`, and opens the desktop window. Vue changes hot reload. Restart the command after Electron main-process changes. Closing the window stops Vite and the worker watcher. Port 5173 must be available.

## First demo

1. Select a camera below the preview and click **Start camera**.
2. Wait for Detection to say **READY**. Keep Face and Hands enabled.
3. **Cool mode** is enabled by default. Face the camera and show a peace sign, with index and middle fingers extended and ring/little fingers folded.
4. After four confirmed inference frames, a transparent sunglasses reaction covers your face and follows it.
5. Lower your hand; after three missed frames the effect disappears.
6. Try **Show detection landmarks** to inspect tracking. Mirror applies consistently to the canvas and stream.

The included original PNG placeholders are Cool mode, Absolutely shocked, and Main character (a crown). The other two effects start disabled. Detection quality depends on lighting, framing, occlusion, and hardware; physical webcam accuracy still requires a hands-on test on your machine.

## Commands

| Command                    | Purpose                                                                         |
| -------------------------- | ------------------------------------------------------------------------------- |
| `npm.cmd run dev`          | Vite + Electron + worker watcher                                                |
| `npm.cmd run dev:web`      | Browser-only UI; run `build:runtime` first                                      |
| `npm.cmd run setup:assets` | Download official model version 1 files; copy installed MediaPipe WASM locally  |
| `npm.cmd run typecheck`    | Strict renderer, worker, Vue, and Electron checks                               |
| `npm.cmd run lint`         | ESLint                                                                          |
| `npm.cmd run format`       | Prettier                                                                        |
| `npm.cmd run format:check` | Verify formatting                                                               |
| `npm.cmd test`             | Gesture, pose, effect playback, and camera lifecycle tests                      |
| `npm.cmd run build`        | Check types; build Electron, worker, and Vite production output                 |
| `npm.cmd start`            | Launch the production build                                                     |
| `npm.cmd run test:smoke`   | Launch built Electron with a simulated webcam; save screenshots in `artifacts/` |
| `npm.cmd run package:win`  | Build a Windows NSIS installer in `release/`                                    |

Build before running `start` or `test:smoke`. Packaging may download Electron and NSIS tools on first use. Source runs use %APPDATA%\memecam-development and installed builds use %APPDATA%\memecam. Each profile admits only one app instance to prevent database-lock errors. Existing data in the original folder is retained. Smoke tests use a separate Chromium profile under `artifacts/smoke-profile`.

Smoke-test variants: `node scripts/smoke.mjs --dev` checks the Vite renderer, and `node scripts/smoke.mjs --packaged` checks `release/win-unpacked/MemeCam.exe` after packaging.

## Technology and structure

Vue 3, TypeScript, Vite, Electron, Pinia, `@mediapipe/tasks-vision`, Canvas 2D, ESLint, Prettier, and Vitest. There is no backend, cloud service, account system, database server, Docker, WebGL renderer, or native camera driver.

```text
meme-camera/
  electron/main.ts           Secure window, local app protocol, camera permissions
  src/
    camera/                 Device enumeration, lifecycle, frame loop
    components/             Camera, library, editor, inspector, settings
    effects/                Definitions, cached rendering, IndexedDB, defaults
    vision/                 Worker, three detectors, matcher, geometry, pose signatures
    output/                 Preview and CanvasStream output providers
    stores/                 Pinia UI/settings state and runtime commands
    views/HomeView.vue      Studio shell
  public/
    models/                 Downloaded .task models
    wasm/                   Locally copied MediaPipe runtime
    memes/                  Original transparent placeholder PNGs
    vision-worker.js        Generated classic worker bundle
  scripts/                  Setup, development, build, smoke check
  tests/                    Behavioral unit tests
  dist/                     Production renderer, models, WASM, worker
  dist-electron/            Production main process
  release/                  Windows packages, when built
```

## Camera and rendering

`CameraManager` uses `enumerateDevices()` and video-only `getUserMedia()`. It stops old tracks before switching cameras, cancels stale start requests, and reports disconnected devices. Device labels may be unavailable before permission is granted. Refresh the list after attaching a camera.

Frames pass through a hidden video element into Canvas 2D. The intrinsic canvas matches the actual camera resolution; CSS contains the image without stretching. The camera requests 1280 × 720 at 30 FPS, subject to hardware negotiation. `requestAnimationFrame` renders at the display refresh rate, capped at 60 FPS to avoid excess work on high-refresh displays. Models receive downsized frames of at most 640 pixels wide. Inference is capped at the chosen 10–30 FPS with at most one frame in flight; actual FPS and inference timing depend on the CPU. Render/inference counters are measured separately.

Frame landmarks remain outside deeply reactive Vue state. UI measurements are published periodically; images are decoded and cached rather than loaded in the render loop. The renderer drops stale detection results and clears effects when their body target is lost. Stop releases physical-camera and processed-stream tracks and resets gesture playback.

## MediaPipe architecture

`VisionManager` owns one classic web worker. Its bundled worker loads Face Landmarker, Hand Landmarker, and the lite Pose Landmarker once per worker lifetime. All use `VIDEO` mode and a CPU delegate in the worker, so synchronous MediaPipe calls do not block the Vue UI. Classic worker output supports MediaPipe's WASM `importScripts` loader. Transferable `ImageBitmap`s are closed after use; a bounded queue prevents runaway memory use. Detector switches control which models run, and disabled results are cleared. Failed initialization or inference shows an error with **Retry detection**.

Models and WASM are served from Vite during development or the secure `memecam://app` protocol in production. No CDN fallback is used at runtime. `setup:assets` downloads the official face, hand, and lite pose model version 1 assets from Google's MediaPipe model storage. Running setup again reuses installed models and refreshes WASM to match the npm package. To repair a damaged model, remove that `.task` file and rerun setup.

References: [MediaPipe web face landmarks and workers](https://ai.google.dev/edge/mediapipe/solutions/vision/face_landmarker/web_js), [MediaPipe web package](https://github.com/google-ai-edge/mediapipe/blob/master/mediapipe/tasks/web/vision/README.md).

## Gesture and pose recognition

Version 0.2 includes 71 trigger options: 19 hand gestures, 22 facial expressions/head positions, 18 body poses (including recorded pose), and 12 combined triggers. Use Browse 71 gestures in the library for searchable instructions, or see [GESTURES.md](GESTURES.md) for the complete catalog and seven supplied meme presets. These rules detect held positions and expressions; they do not recognize every possible human gesture or temporal motion sequence. Geometry helpers centralize joint angles, finger extension, hand/head proximity, and landmark distances. Hand names refer to the person's anatomical side; the worker corrects MediaPipe's selfie handedness assumption for unmirrored input.

Each effect has an activation threshold, a deactivation threshold 0.15 lower, four consecutive activation frames, three deactivation misses, and an 800 ms reactivation cooldown. These are heuristic similarity scores, not calibrated probabilities. Exact hand/pose rule matches score 1; face and proximity rules return normalized strengths, bounded to 0-1. Timed/toggle playback responds only to a new confirmed gesture, not every inference frame.

In **Create effect → Body pose → Recorded pose**, start the camera and enable Body pose, then click **Record pose**. The app gives a three-second countdown and samples for two seconds. It requires visible shoulders, elbows, wrists, and hips and rejects insufficient or unstable samples. It averages relative 2D upper-body joint coordinates centered on the shoulders and divided by shoulder width. `comparePose()` returns 0–1 using normalized RMS coordinate error, making matching insensitive to translation and uniform camera-distance changes. It does not compensate for viewpoint rotation, different body proportions, or severe occlusion. No photo is captured or saved.

## Effect system and storage

`EffectDefinition` separates image, trigger, target, and display behavior. Face, head, mouth, both eyes, chest, either hand, between hands, above head, and full-body placement are available. Full-body placement estimates size from the torso; it is not segmentation. Effects scale relative to the tracked target; X/Y offsets use target-size units and rotation uses degrees. Position, scale, and rotation are smoothed. Multiple enabled effects compose in library order.

- **While triggered:** visible while the stabilized gesture remains active.
- **Timed:** visible for the configured duration after a new activation; holding the gesture does not extend it.
- **Toggle:** each new gesture turns it on/off; stopping the camera or changing effect configuration resets playback.
- **Test effect:** bypasses recognition for three seconds, but still requires the selected body target to be visible.

The editor accepts PNG/WebP/JPEG up to 5 MB and 4096 × 4096 pixels. Uploaded images are decoded to validate them, then stored with their effect configuration as data URLs in **IndexedDB**, avoiding localStorage's small quota. IndexedDB is adequate for this small MVP library; large libraries should migrate images to separate Blob records. Basic camera, mirror, inference, and detector preferences use **localStorage**. Saving/deleting waits for a committed transaction and reports errors. Closing the editor without saving discards changes. Built-in effects can be edited/toggled; custom effects can be deleted.

## Processed output and OBS

`VideoOutputProvider` defines `start()`, `stop()`, and `getStatus()`. `PreviewOutputProvider` tracks preview lifecycle. `CanvasStreamOutputProvider.getProcessedStream()` lazily returns a cached `canvas.captureStream(30)` video stream; it is also available through the app store's `getProcessedStream()` method. The inspector reports whether its track is running and its requested frame rate. A requested 30 FPS is not a guarantee of delivered frames.

For a manual OBS workflow:

1. Start MemeCam and click **Open clean output**.
2. In OBS, add **Window Capture** for MemeCam and use the client area/crop out window chrome. If needed, try another capture method in OBS.
3. Move the pointer away so the exit control disappears, then start **OBS Virtual Camera**.
4. Select **OBS Virtual Camera** in your meeting app. Press Escape in MemeCam to return to the studio.

Clean output hides UI and landmark debugging. There is no direct stream transport to OBS and this workflow has not been validated with a physical camera/OBS installation here.

## Security and privacy

Electron runs with Node integration disabled, context isolation enabled, sandboxing enabled, web security enabled, restricted navigation/popups, a content security policy, and camera-only permission handlers limited to the application origin. A narrow contextBridge exposes virtual-camera controls and fixed-size video frames; the main process validates the renderer origin and main-frame identity. The production protocol resolves files only within the built renderer directory. See [Electron's security guidance](https://www.electronjs.org/docs/latest/tutorial/security).

Windows may require **Settings → Privacy & security → Camera → Camera access** and **Let desktop apps access your camera**. If the camera is busy, close other applications using it. Hardware privacy switches and antivirus camera controls can also prevent access. Linux/macOS support is not packaged or validated.

MemeCam does not upload or intentionally persist camera frames. A meeting app receiving the virtual feed can transmit or record those frames. Detection executes on the local CPU. There is no telemetry, analytics, microphone capture, video recording, or cloud AI. Effect images, settings, custom pose coordinates, and tutorial progress are saved locally in Electron's user-data storage. Those remain until removed or the application profile is cleared.

## Native Windows camera

Start your webcam, then click **Start virtual camera** under Camera output. On another machine, first click **Install virtual camera** and accept Windows UAC. Select **MemeCam (Windows Virtual Camera)** in Google Meet. Refresh Meet if it was already open. Keep MemeCam running. Windows 11 x64 is required; Windows 10 can use the OBS workflow.

See [native/README.md](native/README.md) for building, installation, removal, frame transport, and camera tests.

## Validation and limitations

Version 0.3.4 validated on September 11, 2026:

- TypeScript, ESLint (zero errors/warnings), and Prettier checks passed.
- All **81 behavioral tests** passed, including the expanded gesture rules, paired-hand requirements, expression exclusions, pose visibility, combined triggers, and fist/pinch distinction.
- Production build and Windows NSIS packaging passed.
- Native Windows capture verified 1280×720 video and stale-frame black output. Electron IPC and Chromium `getUserMedia` verified the registered camera and received color. See [native/README.md](native/README.md) for repeatable checks.
- The handbook smoke check verifies tutorial progress, finish/restart, document navigation and exclusion of developer setup/build guides, privacy/terms entry points, and rejection of unsupported external links. Standalone guide files are also checked in the packaged resources.
- The packaged-executable smoke check passed with a simulated webcam and all three local models. It also verified all seven bundled meme images, the searchable 71-gesture guide, every trigger category, JPEG upload, and saving/reloading the selected gesture and image.
- Smoke runs recorded no page exceptions or external renderer HTTP requests. MediaPipe printed informational XNNPACK CPU initialization messages.
- npm installation reported deprecation notices for `lucide-vue-next`, ESLint 9, and transitive `inflight`, `glob` 7, `rimraf` 2, and `boolean`. Packaging also logged duplicate Vue dependency references, then completed successfully.

Screenshots from the simulated-camera checks are in [artifacts/studio.png](artifacts/studio.png), [artifacts/meme-pack.png](artifacts/meme-pack.png), and [artifacts/running.png](artifacts/running.png).

Automated checks cover strict types, lint, production bundling, pose normalization, gesture hysteresis/cooldown, effect timing/toggling/target loss, and camera cancellation/switching. The Electron smoke check exercises production loading, renderer isolation, PNG/JPEG upload, IndexedDB reload persistence, deletion, a simulated webcam, local model initialization/inference, processed-stream lifecycle, detector switches, and clean output. It checks for renderer exceptions and external renderer HTTP requests; this is not a network security audit.

Real gesture accuracy, a physical camera disconnect/switch, delivered frame rates on your hardware, and OBS capture require manual validation. CPU inference with all three detectors can run below the requested rate. This release handles one person, up to two hands, and upper-body custom poses; it does not include gesture training, segmentation, recording, or signed distribution. npm may print deprecation notices for installed tooling/transitive packages; these are separate from lint/build results.
