# Backup and restore

Prepared November 5, 2026. Public source repository: https://github.com/Ajhon10/meme-camera.

The owner requested a compact private backup after uploading source, followed by cleanup of generated files. Git contains code, dependency lockfiles and documentation. Private profiles, supplied meme/photo assets and derived icons, downloaded detection assets, dependencies, native outputs, test artifacts and installers are excluded.

The private backup is outside the project at `PROJECTS/BACKUPS/meme-camera-2026-11-05/`. Keep it out of GitHub. Its ZIP is a local file backup and is not encrypted.

## Preserved items

- Complete Git source history in an offline-clone-tested bundle.
- The full `%APPDATA%\memecam` and `%APPDATA%\memecam-development` profiles while MemeCam is stopped. Effects/images and settings are stored in IndexedDB and localStorage; preserving only individual LevelDB files is insufficient.
- Every supplied image/icon under `public/memes/`, including source images needed by the icon-generation script. Restore these assets before launching, smoke testing or packaging a clone.
- Any local environment files and other private project files found.
- The latest `MemeCam Setup 0.3.4.exe` and its matching block map. The owner selected latest-only retention; older installers are removed with the generated release folder.
- Model/runtime checksum metadata, native camera status/path information, source/dependency versions, backup checksums and verification results.

The native COM camera component is installed separately under `%ProgramFiles%\MemeCam Virtual Camera`. Cleanup of this project's generated folders does not uninstall or change that component, Windows registry entries, SDKs or compiler installations. Closing/stopping MemeCam and camera-consuming applications remains necessary before native updates or removal.

## Resume from the retained source or clone

The small source folder and supplied images remain after cleanup. For a new clone, use an empty destination:

```powershell
git clone https://github.com/Ajhon10/meme-camera.git meme-camera-restored
cd meme-camera-restored
```

If GitHub is unavailable, clone the backup's `meme-camera.gitbundle` instead and set origin back with `git remote set-url origin https://github.com/Ajhon10/meme-camera.git`.

Extract the private backup ZIP to a temporary folder. Copy its `project-private/` contents into the cloned project at the same relative paths. In particular, restore `public/memes/`; these assets are deliberately absent from public Git. Preserve any newer data separately before restoring an older snapshot.

Using the existing documented Node setup:

```powershell
npm.cmd ci
npm.cmd run setup:assets
npm.cmd test
npm.cmd run lint
npm.cmd run build
```

The initial dependency/model downloads need internet. Normal detection uses the local files. Rebuild native outputs with `npm.cmd run build:native` when needed; developer/BUILD.md lists the existing Visual Studio C++, CMake and Windows SDK requirements. Do not copy an old CMake build cache into a clone at a different path.

## Restore saved effects and settings

Close every MemeCam process first. Copy the extracted `profiles/memecam` and `profiles/memecam-development` folders into `%APPDATA%` under those exact names. Restore each complete profile, including IndexedDB, Local Storage, Local State and any journal files. Do not merge isolated LevelDB files or overwrite a newer profile without first preserving it.

These are same-Windows-user profile backups; OS-protected browser state is not claimed to be portable to another Windows account or PC. Profile file integrity and restoration checks are recorded with the private backup. Physical webcam accuracy, meeting-app acceptance and Windows reinstall acceptance are separate checks.

## Reinstall the app

Use the saved latest installer and compare it with the backup's SHA-256 manifest. Installing the desktop app is separate from installing the native camera component. See SETUP.md and native/README.md for the explicit install/uninstall controls; source cleanup does not perform either operation.

Source tests/builds and a simulated-webcam smoke test do not establish physical gesture accuracy or meeting quality. Exact backup and cleanup results belong in the private backup's RESTORE.md and verification records.
