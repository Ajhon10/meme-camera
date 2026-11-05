# Build MemeCam into a Windows app

Developer reference only. This file stays in the source project and is excluded from the app and installer.

Source runs now use %APPDATA%\memecam-development; installed builds retain %APPDATA%\memecam. Older source builds used the installed profile and must be closed before testing an installed copy. Existing data in that original folder is retained. The --user-data-dir switch still selects a separate test profile. Test duplicate-launch handling and switch persistence with node scripts/test-profile-isolation.mjs, or add --packaged / --installed for those executable variants.

## Install development tools

Use Windows 11 x64, Node.js 22.12 or newer, npm, and Visual Studio 2022 Build Tools. In Visual Studio Installer select the C++ x64/x86 build tools, C++ CMake tools for Windows, and Windows 11 SDK 10.0.26100.0. The build script locates Visual Studio using vswhere.

Download development tools from their official sites: [Node.js](https://nodejs.org/en/download) and [Visual Studio Build Tools](https://visualstudio.microsoft.com/downloads/). You need internet for the initial package, model, and packaging-tool downloads. Native camera registration also needs Windows administrator approval.

## Prepare the source

Open PowerShell in the project folder. The example below is this workspace's location; adjust it if you copied the source elsewhere.

```powershell
cd C:\Users\Lenovo\Desktop\PROJECTS\meme-camera
npm.cmd ci
npm.cmd run setup:assets
npm.cmd run build:native
```

Run each command after the preceding one succeeds. npm ci uses the committed lockfile and replaces the installed dependency folder; keep your own source changes outside node_modules. setup:assets downloads the three official MediaPipe models and copies the WASM runtime. build:native produces MemeCamCameraHost.exe and MemeCamMediaSource.dll in native/bin/Release.

Use npm.cmd if PowerShell blocks npm.ps1. You do not need to change the machine's execution policy; the native-build command applies a process-specific policy to its own script.

## Develop with Google Meet

```powershell
npm.cmd run dev
```

This opens the Electron desktop app and a local Vite development server. Start your webcam, install the virtual camera once if necessary, then start virtual output. Select MemeCam (Windows Virtual Camera) in Meet. Keep the development command and MemeCam running throughout the meeting.

Vue changes hot reload. Restart development after editing Electron/preload code. Rebuild native code after C++ changes; if the DLL changed, reinstall the camera component after closing its consumers. Run only one virtual-camera host at a time. Development and packaged versions have separate local effect/settings stores.

npm.cmd run dev:web opens a browser-only version with no Electron native bridge. A canvas preview by itself does not register a camera device.

## Build and check the application

```powershell
npm.cmd test
npm.cmd run lint
npm.cmd run format:check
npm.cmd run build
npm.cmd start
```

build creates the renderer, worker, main process, and preload bundles. start launches those bundles with Electron. Neither command creates an installer by itself. Stop that app before packaging.

## Create the EXE installer

```powershell
npm.cmd run package:win
```

The packaging command builds the native components, checks and builds the app, then runs electron-builder with the installed Electron runtime. It creates:

- release/MemeCam Setup 0.3.4.exe — the installer to distribute for this version.
- release/win-unpacked/MemeCam.exe — a runnable desktop application. Keep its entire win-unpacked folder together, including resources/native; copying this EXE alone will not work.
- release/win-unpacked/resources/docs — standalone copies of these guides and policy drafts.

The version comes from package.json; later releases produce a correspondingly named installer. Recipient computers do not need Node.js or a compiler. They still need Windows 11 x64, a webcam, and one-time installation of the camera component from the app.

## Verify the release

```powershell
node scripts/smoke.mjs --packaged --native
node scripts/test-native.mjs
node scripts/test-native-electron.mjs --packaged
```

Install the camera component before native tests and stop other MemeCam sessions. The smoke test uses a simulated webcam and a separate profile, checks the UI and native output, and saves screenshots under artifacts. The other tests verify synthetic frames through Windows Media Foundation and Chromium. They do not join a meeting or validate physical gesture accuracy.

## Before distributing publicly

Set the release version in package.json and the root/package entries of package-lock.json. Review the owner and contact details in the draft policies, the licenses for dependencies/models, and your rights to distribute each meme image. The bundled reference images are not automatically licensed for public redistribution. Add code signing if you need an identified Windows publisher. Keep the source, lockfile, and tested installer together for repeatable releases.

The [troubleshooting guide](../TROUBLESHOOTING.md) covers missing tools, model failures, camera registration, and packaging errors.

## Build or packaging fails

- npm.ps1 is blocked: use npm.cmd.
- Native build cannot find Visual Studio: install the C++ x64/x86 tools, CMake tools, and Windows 11 SDK 26100 through Visual Studio Installer.
- Development port 5173 is occupied: close your previous MemeCam development server before starting another.
- Missing native output: run npm.cmd run build:native. A renderer-only build does not produce the Windows camera binaries.
- Packaging rename/file-lock error: close any running packaged MemeCam and retry npm.cmd run package:win. The packaging script uses node_modules/electron/dist to avoid the archive-extraction rename issue observed on this machine.
- Dependency/model download fails: restore network access and retry the failing setup command. Runtime detection uses the downloaded local files.
