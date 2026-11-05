# MemeCam Windows virtual camera

Requires Windows 11 x64 (build 22000 or newer). The desktop app has **Install virtual camera**, **Start virtual camera**, and **Stop virtual camera** controls under Camera output. Start the physical camera first. In Google Meet choose **MemeCam (Windows Virtual Camera)**. Refresh the meeting page after starting MemeCam if its device list is stale. Keep MemeCam open while using its output.

The camera component has been installed on this development machine. Development and packaged builds use the same registered component; run only one MemeCam virtual-camera session at a time.

## Build

Install Visual Studio 2022 Build Tools with C++ x64/x86 tools, CMake, and Windows 11 SDK 26100. Then run:

```powershell
npm.cmd run build:native
npm.cmd run dev
```

`npm.cmd run package:win` builds the native binaries and includes them in the installer. End users do not need the compiler, SDK, Node, OBS, or a separate runtime. The C++ runtime is linked statically.

## Installation and removal

The one-time setup opens Windows UAC, copies only `MemeCamMediaSource.dll` into `%ProgramFiles%\MemeCam Virtual Camera`, and registers COM CLSID `{F091DAB7-8B12-4EC0-8EE4-039C879A72A5}` under HKLM Software\Classes. The installed DLL must be readable by Windows Frame Server. The camera device itself is session-scoped and accessible to the current user.

Stop virtual output and close camera-consuming apps before updating or removing the native component. Use **Uninstall camera component** in MemeCam before uninstalling the desktop app; uninstalling the desktop app alone leaves the shared COM component installed. A cancelled UAC prompt leaves setup incomplete and the app reports an error. Installer and native binaries are currently unsigned.

## Video path

The renderer copies the finished effects canvas before debug landmarks, letterboxes it to 1280×720, and sends RGBA frames through a narrow preload API. Electron validates the caller and exact byte count. At most one frame is in flight; the host acknowledges after conversion, preventing a growing queue.

`MemeCamCameraHost.exe` converts RGBA to limited-range BT.709 NV12 and hosts a local named pipe. Its ACL allows the current user and Windows camera services; remote pipe access is rejected. The native Media Foundation source serves up to 30 FPS from that pipe. Missing or stale frames become black after 500 ms. Pipe operations have deadlines. No image data is written to disk or uploaded.

The native host uses `MFCreateVirtualCamera` with Session lifetime and CurrentUser access. Closing/stopping MemeCam closes stdin, stops/removes the camera, and shuts down Media Foundation. Windows also owns session cleanup if the process terminates. UI input lists exclude MemeCam to avoid selecting its own output.

## Validation

```powershell
node scripts/test-native.mjs
node scripts/test-native-electron.mjs
node scripts/test-native-electron.mjs --packaged
```

The first test sends a synthetic red frame through the host and captures it using a separate Windows Media Foundation consumer, then verifies stale-frame black output. The second sends synthetic pixels through the real Electron preload/IPC bridge and opens the registered camera using Chromium `getUserMedia`, checking resolution and received color. Neither test opens a physical webcam. Meeting-specific UI and physical gesture accuracy still require a manual check.

The Media Foundation event/source structure follows Microsoft's MIT-licensed [Windows Camera sample](https://github.com/microsoft/Windows-Camera/tree/master/Samples/VirtualCamera); its license is retained in `reference/Microsoft-LICENSE`. API: [MFCreateVirtualCamera](https://learn.microsoft.com/en-us/windows/win32/api/mfvirtualcamera/nf-mfvirtualcamera-mfcreatevirtualcamera).
