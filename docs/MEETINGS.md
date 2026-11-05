# Use MemeCam in meeting apps

## Start here for every platform

1. On Windows 11 x64, open the MemeCam desktop app and start your physical webcam.
2. In Camera output, install the camera component once if needed, then click Start virtual camera.
3. Open your meeting platform's camera settings and choose MemeCam (Windows Virtual Camera).
4. Check the preview before turning meeting video on. Keep MemeCam running for the duration of the call.

The output is 1280×720 at up to 30 FPS. The meeting platform may reduce resolution or frame rate. Select your actual microphone in that platform: MemeCam supplies video only. Screen sharing is not required for native-camera output.

## Google Meet

In Meet on your computer, open Settings → Video → Camera and select MemeCam (Windows Virtual Camera). You can check the video before joining. If Meet was already open when you started virtual output, refresh the page and select the camera again. Allow camera access for the Meet site when your browser asks.

Camera-selection instructions are based on [Google Meet's video settings guide](https://support.google.com/meet/answer/9302964?hl=en).

## Zoom Workplace

In Zoom's desktop Settings, open Video & effects (called Video in some versions), then use the Camera dropdown to select MemeCam (Windows Virtual Camera). Confirm the preview, then start your meeting video. If it does not appear, restart Zoom after starting MemeCam's virtual output.

See [Zoom's desktop settings guide](https://support.zoom.com/hc/en/article?id=zm_kb&sysparm_article=KB0060612) for the current camera controls.

## Microsoft Teams

Open Settings and more → Settings → Devices. Under video settings choose MemeCam (Windows Virtual Camera) from Camera and check the preview. If your organization manages camera permissions, its policies may affect whether virtual cameras are available.

See [Microsoft Teams device settings](https://support.microsoft.com/en-us/teams/notifications-settings/manage-your-device-settings-in-microsoft-teams).

## Other desktop meeting platforms

Look for Camera, Video device, or Video input in the app's settings or pre-join screen, then select MemeCam (Windows Virtual Camera). For browser-based apps, allow the site's camera permission and refresh after starting virtual output. Menu names vary by platform and version. Some apps or organizational policies do not accept virtual cameras; support is not guaranteed merely because an app has a camera picker.

For an alternative, open clean output in MemeCam, capture that window in OBS, start OBS Virtual Camera, and select it in your meeting app. This requires OBS and has not been validated here with a physical OBS setup. MemeCam is a Windows desktop camera source; it does not become a phone camera automatically.

## If the device is missing or the picture is wrong

- Confirm both MemeCam's webcam and virtual output are running. Use the MemeCam desktop app.
- Refresh the meeting page or fully restart its desktop app after virtual output starts.
- Enable Windows camera access for desktop apps and the browser site's camera permission.
- Choose your physical webcam inside MemeCam and the MemeCam virtual device inside the meeting app.
- Close duplicate MemeCam instances. Disable meeting-platform visual effects temporarily if overlays are cropped or altered.
- For black output, check MemeCam's local preview first. Stale frames deliberately turn black; restart the physical input and then virtual output.

See the [troubleshooting guide](TROUBLESHOOTING.md) for more detail.

## Privacy during a call

MemeCam performs detection locally. Once another app opens its virtual camera, that app receives the processed video and may transmit or record it under its own settings and policy. Meeting participants can also record or capture what they see. Stop video in the meeting app when you do not want to transmit; MemeCam does not control the meeting microphone, recording, or participant behavior.

## Validation status

Windows Media Foundation capture, Chromium getUserMedia, and the packaged app's synthetic-camera pipeline were tested. A live call on Google Meet, Zoom, Teams, or every other platform has not been independently validated here. Platform instructions were checked against the official documentation on September 11, 2026; their menus may change.
