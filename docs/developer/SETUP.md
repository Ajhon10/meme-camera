# Setup guide

Developer reference only. This file stays in the source project and is excluded from the app and installer.

## What you need

- Windows 11 x64 for direct virtual-camera output, a working webcam, and permission to use it.
- Windows administrator access for the one-time camera-component installation. Normal camera use does not require running MemeCam as administrator.
- A meeting app or desktop browser that accepts Windows virtual cameras. Your meeting service needs its own account and internet connection.
- The installer includes the local detection models and native binaries. End users do not need Node.js, Visual Studio, or OBS.

Windows 10 can use MemeCam's preview and the optional OBS workflow, but cannot use this native-camera implementation. macOS, Linux, ARM64, and phone installation are not packaged or tested.

## Install the desktop app

1. Run MemeCam Setup 0.3.4.exe from the release folder and choose an installation location.
2. Open MemeCam. In Windows Settings → Privacy & security → Camera, enable camera access and access for desktop apps.
3. In MemeCam, select your physical webcam beneath the preview, then click Start camera. If another app has exclusive use of that webcam, close its camera feed first.
4. In Camera output, click Install virtual camera if it appears. Accept the Windows administrator prompt for the MemeCam camera component. This is separate from installing the desktop app.
5. Click Start virtual camera. Keep MemeCam open and its physical camera running.
6. In your meeting app choose MemeCam (Windows Virtual Camera). See the [meeting guide](../MEETINGS.md) for platform instructions.

On the current development machine the camera component is already installed, so its Install button may be replaced by Start virtual camera. The current installer and native binaries are unsigned; Windows may show an unknown-publisher prompt. Verify where your copy came from before running it.

## Check your first effect

Enable Cool mode in the effect library. Wait until Detection says READY. Face the webcam and hold a peace sign: extend your index and middle fingers and fold the others. The sunglasses overlay should follow your face. Keep the gesture steady for several detection frames.

Your microphone is configured separately in the meeting app. MemeCam does not capture or provide microphone audio. Preview mirroring in the meeting app can differ from what other people receive; check with another participant before changing MemeCam's Mirror output setting.

## Start and stop each session

Start MemeCam's physical camera, then its virtual camera, then select the device in your meeting app. You do not need to reinstall each time. The virtual camera is available while its session is running.

Stop virtual camera stops the meeting output while keeping the local preview available. Stop camera stops both the physical input and virtual output. Closing MemeCam also stops its output. Turn off video or leave the meeting in the meeting app when you want to end transmission there.

## Updates and uninstalling

Close meeting apps and stop MemeCam before installing an updated desktop release. If a future release changes the native component, stop output, uninstall the camera component from Camera output, then install it again from the updated app. If Windows says the DLL is in use, close camera consumers and retry.

To remove MemeCam, first use Uninstall camera component in Camera output while virtual output is stopped, then uninstall the desktop app in Windows Settings → Apps. Removing the desktop app alone leaves the shared native component installed. Local settings and effects may also remain; see the [privacy policy](../PRIVACY.md) and [troubleshooting guide](../TROUBLESHOOTING.md) for local-data removal.

## Optional OBS route

Start your webcam in MemeCam, select Open clean output, and capture that window with OBS Window Capture. Crop out the window frame and keep the preview visible. Start OBS Virtual Camera and select OBS Virtual Camera in your meeting app. Escape returns MemeCam to its studio. This route requires OBS and has not been validated here with a physical OBS setup.
