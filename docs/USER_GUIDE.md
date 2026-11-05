# Using MemeCam

## Studio overview

Camera shows your processed preview and the effect library. Effects brings the library into focus. Create effect opens the editor. Settings controls mirroring, debugging landmarks, and the detection frame limit. Help & tutorial includes a repeatable guided tour and the usage, meeting, troubleshooting, privacy, and terms documents.

Below the preview, choose a physical webcam, refresh the device list, or start/stop capture. The right-hand Detection panel controls Face, Hands, and Body pose, displays the detected gesture and confidence, and lists active effects. Camera output controls native output and clean output for OBS.

## Use a built-in reaction

1. Start camera and wait for detection to be ready.
2. Enable an effect in the library. Try Cool mode with a peace sign first.
3. Open Browse 71 gestures to find the pose, finger placement, or expression required. Its categories cover hands, face, body, and combinations.
4. Enable the detectors that the gesture and attachment target need. Keep the relevant body parts visible and well lit.
5. Hold the gesture steadily. Recognition requires several frames, so a quick flick may not trigger it. The active-effect indicator confirms detection.

The 71 options are rule-based held gestures and expressions, including a recorded-pose option. They do not cover every human gesture, sign language, or moving gesture sequence. The app tracks one person and up to two hands. A gesture match is not identity recognition.

## Create your own effect

1. Click Create effect and give it a name.
2. Upload a PNG, WebP, or JPEG image, at most 5 MB and no larger than 4096×4096 pixels. Transparent PNG/WebP works well for overlays.
3. Choose a trigger category and gesture. Read the editor's gesture instructions and enable any missing detector it identifies.
4. Choose where the image attaches: for example face, head, mouth, eye, hand, chest, or between hands. Adjust size, offset, and rotation for that target.
5. Choose a display mode. While triggered follows recognition; Timed plays for the chosen duration; Toggle changes its on/off state with a fresh trigger. The target must remain trackable for the overlay to be placed.
6. With the camera and detection running, Test previews the effect for three seconds. Save stores it in the local library. Enable it to use its real gesture trigger.

Editing an existing card changes that saved effect. Deleting a custom effect removes its locally saved image and pose definition. Bundled defaults may return on restart because they are part of the installed app; disable them to keep them out of your output.

## Record a custom pose

Choose the Body pose trigger category and its recorded-pose option. Start your camera and Body pose detection, then use the editor's Record pose control. During the countdown, place your shoulders, elbows, wrists, and hips in view. Hold still while it samples your position. If recording fails, improve framing and retry.

Adjust the similarity threshold to change how closely the pose must match. A higher threshold is stricter. This stores a normalized upper-body landmark signature inside the effect, not a video clip or a trained identity model. Save the effect after recording.

## Tune performance and appearance

Disable detectors that none of your enabled effects need. Lower the inference frame limit in Settings if CPU usage is high. Detection FPS and preview FPS measure different work; requesting 30 FPS does not guarantee delivery at that rate.

Mirror output changes both MemeCam's preview and outgoing image. Debug landmarks help with framing but are excluded from native-camera output and clean output. Avoid applying multiple background/beauty effects in your meeting app while first checking MemeCam's image.

## Share and finish

Use the [meeting guide](MEETINGS.md) to send the processed result to a call. Enabling an effect can immediately change the image seen by meeting participants if virtual output and meeting video are already on. Test privately before joining when you want to preview a reaction.

Stop virtual camera ends MemeCam's virtual output. Stop camera or closing the app ends both its input and virtual output. Your microphone and the meeting itself are controlled separately in the meeting app.
