# Troubleshooting and local data

## An internal error appears and effect switches do not change

Close all MemeCam windows and reopen the latest installed version. Older versions could let two copies open the same local data folder, locking saved effects. Current versions bring the existing window forward when launched again and keep development runs in a separate folder. Do not delete your saved effects to fix this lock. If the error persists after restarting, keep the error message when reporting the issue.

## My webcam does not start

Check the hardware privacy shutter and cable. Enable Windows Settings → Privacy & security → Camera → Camera access and desktop-app camera access. Close other apps using the physical webcam, refresh MemeCam's list, and select it again. If you unplug the camera, reconnect it and restart capture.

## MemeCam is not in the meeting camera list

Confirm Windows 11 x64, the Electron desktop app, and the installed camera component. Start the physical input and then Start virtual camera. Refresh the meeting page or fully restart its app. Run only one MemeCam virtual-camera session. In the meeting choose MemeCam (Windows Virtual Camera), not your physical webcam. Windows 10 needs the optional OBS route.

## Camera installation was cancelled or the DLL is in use

Install virtual camera needs a Windows administrator prompt. Cancelling it leaves setup incomplete. If you do not have administrator access, ask the device administrator to install the component. To update or remove it, stop virtual output and close meeting apps first. If Windows still reports a file lock, restart Windows and retry before opening camera apps. Do not manually delete unrelated registry keys or system files.

## The output is black, frozen, or slow

Check that the local preview is moving. Restart the webcam and virtual output, then reselect the meeting camera. MemeCam replaces stale native frames with black after about half a second. Disable unused detectors and lower the inference limit in Settings to reduce CPU work. Keep the preview visible during initial testing and check power-saving settings if performance drops in the background.

## A gesture or effect does not trigger

Enable the effect and its required detectors. Read Browse 71 gestures and keep the required body parts in frame. Try brighter, even light and hold the gesture steadily. Test the effect in its editor to distinguish attachment placement from gesture recognition. A custom recorded pose needs clear shoulders, elbows, wrists, and hips. Detection is heuristic and cannot guarantee every expression or hand shape.

## Detection models fail to load

Restart MemeCam and retry detection. If the problem continues, reinstall the complete app; do not move only its EXE out of the application folder.

## Where data is stored

Settings, selected camera, and detector preferences use browser local storage. Custom images and effect definitions, including recorded pose signatures, use the local IndexedDB database named memecam. Tutorial progress is stored locally. Desktop storage lives inside Electron's user-data profile, normally %APPDATA%\memecam; check the actual folder name on your installation.

MemeCam has no cloud account, cloud backup, or effect export button. Keep copies of your original effect images if you may need to recreate them.

## Remove local data manually

Deleting a custom effect removes that effect's stored definition, uploaded image, and recorded pose signature. Bundled defaults can reappear because their images ship with the app.

For a full desktop reset, stop capture and fully quit MemeCam. Open %APPDATA% in File Explorer, identify the MemeCam user-data folder, and rename only that folder to a clearly named backup. Reopen MemeCam to start a fresh profile. This resets custom effects, settings, tutorial progress, and permissions; it does not unregister the native camera. Delete the backup only when you are sure you no longer need it. Never remove the entire AppData folder. Any backup retains the old local data until you delete it.

Normal app uninstall may leave user data behind. Windows caches, backups, or crash dumps are outside MemeCam's deletion controls; these steps are not a secure-erasure guarantee.
