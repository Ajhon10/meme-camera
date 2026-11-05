# Privacy Policy

Draft for MemeCam 0.3.4 · Updated September 14, 2026.

Developer: Ajan Jeresano.

Publisher identity and privacy-contact details have not yet been supplied. This is a product-specific draft for the current local desktop build, not a claim of regulatory certification. The publisher must complete those details and review the policy for its actual distribution and jurisdiction before public release.

## Scope and who handles information

This policy describes MemeCam's desktop application and native Windows camera component. MemeCam currently has no hosted account system, backend, telemetry, analytics, advertising, automatic cloud upload, or built-in video recording. It does not request microphone access. Meeting services, Windows, browsers, download providers, and any distributor website operate under their own policies.

## Camera and detection data

When you start the camera, MemeCam processes webcam frames, face/hand/body landmark coordinates, expression scores, and gesture confidence on your computer to position and trigger effects. These transient frames and detection results are handled in memory and are not intentionally saved as video, uploaded to the publisher, or used to train a remote model. The app does not identify who you are or perform face matching against an identity database.

If you explicitly record a custom pose and save the effect, a normalized upper-body landmark signature is stored locally with that effect. This is persistent pose data, not a video recording. Imported images may themselves contain personal information or embedded file metadata; do not import material you do not want kept in your local library.

## Information saved on your device

- Camera selection, mirror setting, detector preferences, and inference limit are saved to local storage so your setup can be restored.
- Custom effect names, image data, attachment settings, triggers, and saved pose signatures are stored in local IndexedDB.
- Tutorial progress is saved locally so you can resume or restart the walkthrough.
- Electron/Chromium and Windows may maintain normal local caches, permissions, diagnostics, or crash-related files. MemeCam does not configure automatic crash-report uploads.

These records remain until removed through app controls or the relevant local profile/site-data controls. App uninstall may leave the profile behind. The [troubleshooting guide](TROUBLESHOOTING.md) explains local storage and removal. MemeCam does not provide cloud synchronization, a hosted access-request portal, or an automated data-export tool.

## Sharing through a virtual camera

Starting virtual output makes the processed video available to compatible local applications permitted to open that camera. MemeCam does not restrict access to one particular meeting platform. When you select it in Meet, Zoom, Teams, or another app, that application receives the frames and may transmit, record, or otherwise process them under its own settings and policy. Participants may also capture them.

MemeCam's local processing does not mean a meeting stays on your computer. You control capture in MemeCam and transmission/recording separately in the meeting platform. Stopping the physical camera also stops virtual output; closing MemeCam ends its output session. No application can recall video already received or recorded elsewhere.

## Network activity and external links

Normal MemeCam camera processing and its built-in help documents work without a cloud service. Initial source setup downloads dependencies, detection models, and build tools from their providers. Those providers receive ordinary download request information such as an IP address. Opening an official help link launches your browser and sends an ordinary request to that site. The meeting app uses its own network connection.

## Your choices and security

You can stop capture, disable detectors/effects, delete custom effects, remove the local profile, or uninstall the camera component and app. Restrict camera permissions in Windows and your browser if you do not want other apps to access cameras. Local storage is protected by your Windows account and device security; MemeCam does not add its own encryption layer. Other software or people with sufficient access to your computer may be able to read local data.

Avoid capturing people without appropriate permission. Follow school, workplace, and meeting rules, including any requirements concerning children or other participants. MemeCam does not independently verify participants' ages or consent.

## Requests, changes, and contact

For this private development copy, raise questions through the person who supplied the app. A public release must identify its publisher and a working privacy contact here. The publisher should describe any handling of support submissions before collecting them and review applicable privacy rights, including access, correction, deletion, or complaint rights where relevant. This draft does not limit rights provided by applicable law.

Update this document and its date if the app adds network features, collection, accounts, recording, or other material changes. A change to this document alone does not authorize new processing of existing data.
