import usage from '../../docs/USER_GUIDE.md?raw'
import meetings from '../../docs/MEETINGS.md?raw'
import troubleshooting from '../../docs/TROUBLESHOOTING.md?raw'
import privacy from '../../docs/PRIVACY.md?raw'
import terms from '../../docs/TERMS.md?raw'

export const documents = [
  { id: 'usage', title: 'Using MemeCam', file: 'USER_GUIDE.md', body: usage },
  { id: 'meetings', title: 'Meeting platforms', file: 'MEETINGS.md', body: meetings },
  {
    id: 'troubleshooting',
    title: 'Troubleshooting',
    file: 'TROUBLESHOOTING.md',
    body: troubleshooting,
  },
  { id: 'privacy', title: 'Privacy Policy', file: 'PRIVACY.md', body: privacy },
  { id: 'terms', title: 'Terms & Conditions', file: 'TERMS.md', body: terms },
] as const
export type HelpPage = 'tutorial' | (typeof documents)[number]['id']
export const tutorialSteps = [
  {
    title: 'Meet your studio',
    label: 'Look around',
    text: 'The preview shows your processed camera. The effect library chooses reactions; Detection tells you what MemeCam recognizes. Camera output sends the result to meeting apps.',
    tip: 'Reading this tutorial does not start your camera or share video.',
  },
  {
    title: 'Start your webcam',
    label: 'Camera',
    text: 'Return to the studio, choose your physical webcam below the preview, then click Start camera. Allow Windows camera access if needed. Wait for Detection to say READY.',
    tip: 'Use even lighting and keep your face and hands visible. Open Help & tutorial again to resume this step.',
  },
  {
    title: 'Try your first reaction',
    label: 'Gestures',
    text: 'Enable Cool mode, face the camera, and hold up a peace sign. Keep index and middle fingers extended and the others folded. Sunglasses should attach to your face.',
    tip: 'Browse 71 gestures explains every trigger and required detector. Hold gestures steadily for several frames.',
  },
  {
    title: 'Make an effect yours',
    label: 'Create',
    text: 'Create effect lets you import a PNG, WebP, or JPEG, select a gesture and body target, adjust placement, then Test and Save. Images must be at most 5 MB and 4096×4096 pixels.',
    tip: 'Test with a visible attachment target and detection ready. Testing can be seen by participants if you are already sharing virtual output.',
  },
  {
    title: 'Connect your meeting',
    label: 'Share',
    text: 'In Camera output, install the virtual camera once if prompted, then click Start virtual camera. Select MemeCam (Windows Virtual Camera) in your meeting app. Keep MemeCam running.',
    tip: 'Windows 11 x64 is required. Refresh the meeting page if the device is missing. Choose your microphone separately.',
  },
  {
    title: 'Stay in control',
    label: 'Finish',
    text: 'Stop virtual camera ends the virtual feed. Stop camera ends both webcam input and virtual output. Turn off meeting video or leave the call in the meeting app when you want to end transmission there.',
    tip: 'Detection is local. Your meeting app can transmit or record the output it receives. Review Privacy Policy and Terms in this guide.',
  },
] as const
