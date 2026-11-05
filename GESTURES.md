# Gesture guide · MemeCam 0.2

The app includes **71 trigger options**, up from 8 in version 0.1. Open **Browse 71 gestures** in the effect library for searchable instructions and detector requirements. Use Create effect or edit a card to assign any compatible trigger to any image.

These are held positions and expressions, confirmed across four inference frames. This is not an exhaustive recognizer of every human gesture. Waving, clapping, nodding, head shaking, rapid blinks, tongue tracking, and other motion sequences are not implemented. “Hands together” is a held position, not a clap. Covering your face can interrupt face tracking; keep sufficient landmarks visible.

## Hands · 19

Peace sign; thumbs up; thumbs down; open palm; closed fist; point up; point down; point toward image left; point toward image right; three fingers; four fingers; OK sign; pinch; rock on; call me / shaka; I love you sign; middle finger; double peace; double thumbs up.

Enable **Hands**. Double signs require two tracked hands. Three fingers means index/middle/ring extended. Rock on uses index/little finger with the thumb tucked; I love you also extends the thumb. Directional pointing uses the unmirrored camera image: mirroring reverses its visible direction.

## Face · 22

Smile; mouth open; eyes closed; left wink; right wink; eyebrows raised; furrowed brows; wide-eyed surprise; squint; puckered lips; frown; nose scrunch; jaw left; jaw right; left smirk; right smirk; eyes looking left; eyes looking right; eyes looking up; eyes looking down; head tilt left; head tilt right.

Enable **Face**. Left/right means your anatomical side. Hold winks long enough for confirmation. Squint requires partly open eyes; closed eyes and winks use separate rules. Side smirks require the opposite mouth corner to remain relaxed. Gaze works best with the head still, and subtle expressions depend on lighting and the person. The current [MediaPipe blendshape enum](https://ai.google.dev/edge/api/mediapipe/python/mp/tasks/vision/drawing_styles/face_landmarker/Blendshapes) does not expose a tongue-out category; the Flight preset uses mouth-open instead.

## Body pose · 18

Both hands raised; hands beside head; left hand raised; right hand raised; T pose; goalpost arms; arms crossed; hands on hips; hands together; hands at chest; left arm out; right arm out; lean left; lean right; crouch / bent knees; dab toward left arm; dab toward right arm; recorded pose.

Enable **Body pose**. Left/right means your anatomical side. Keep hips visible for lean, hands-on-hips, hands-at-chest, and custom recordings. Crouch requires hips, knees, and ankles and can also match a seated bent-knee posture; the rule does not identify the context of the posture. A dab extends one arm diagonally upward with the other wrist near your face.

## Combined · 12

| Trigger                      | Required detectors |
| ---------------------------- | ------------------ |
| Hand near chin               | Face + Hands       |
| Cover mouth                  | Face + Hands       |
| Facepalm                     | Face + Hands       |
| Hand on cheek                | Face + Hands       |
| Shush                        | Face + Hands       |
| Frame your face              | Face + Hands       |
| Smile + peace                | Face + Hands       |
| Smile + thumbs up            | Face + Hands       |
| Surprise + raised hands      | Face + Body pose   |
| Smile + hand over mouth      | Face + Hands       |
| Eyes closed + hands at chest | Face + Body pose   |
| Furrowed brows + chin touch  | Face + Hands       |

All component conditions must happen together. The editor lists disabled required detectors. The effect's target must also be tracked: for example, a hand-triggered effect placed on the face still needs Face enabled.

## Your meme pack

All seven supplied images are bundled as opt-in presets. Open **Meme pack** in the library and enable the reactions you want. Existing effects/settings are preserved when the new defaults are merged into the library.

| Preset              | Supplied file                             | Default trigger         |
| ------------------- | ----------------------------------------- | ----------------------- |
| Flight reaction     | `flight.jpg`                              | Mouth open              |
| Side-eye cat        | `funny-cat-memes-go-hard-cover_675.jpg`   | Eyes looking left       |
| Maximum surprise    | `images (2).jpg`                          | Wide-eyed surprise      |
| Not impressed       | `images (3).jpg`                          | Arms crossed            |
| Defiant cat         | `images.jpg`                              | Middle finger           |
| The squint          | `speedddd.png`                            | Squint                  |
| Trying not to laugh | `viber_image_2026-01-23_08-49-24-650.png` | Smile + hand over mouth |

The app copies the supplied files into its local assets; it does not infer or learn poses from their contents. Images retain their backgrounds and original aspect ratios. All presets initially attach to the face at 1.2× scale while triggered; their image, trigger, target, scale, offsets, rotation, and duration remain editable. You can also upload JPEG files directly in the editor, alongside PNG and WebP (5 MB / 4096 × 4096 limits).

## Recognition limits

Hand/pose rules return 1 when their geometric conditions pass. Face/proximity rules return normalized strengths. Scores are heuristic, not probabilities or emotion diagnoses. Per-effect thresholds, four-frame confirmation, three-frame deactivation, and cooldown still apply. Multiple expressions can match together; the inspector prefers an enabled effect on a score tie. Clear visibility and holding the position briefly work better than quick movements. Automated fixtures validate the logic; physical-camera accuracy still requires manual testing and tuning.
