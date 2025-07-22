# Change Log

All notable changes to this project will be documented in this file.

## [0.0.14] - 2025-07-22

### Changed

- Added logging (`createAsync.cs` in renderer and `script-manager.ts` in main)

## [0.0.11] - 2025-06-25

### Fixed

- Resolve runtime error where node modules were not found at startup. Fixed it by downgrading `@electron-forge/plugin-vite` to `7.4.0` (https://github.com/nklayman/vue-cli-plugin-electron-builder/issues/1618)

### Changed

- Used package `stateful-electron-window` instead of `electron-window-state`

## [0.0.10] - 2025-06-25

### Fixed

- Fixed the local rmDir function which threw an error when the directory was not empty
- Fixed functionality to open folder in a new shell

### Changed

- Updated all npm packages
- Used package `ssh2-electron-no-cpu-features` instead of `ssh2` to remove optional cpu-features dependency

## [0.0.9] - 2024-11-06

### Added

- Added highlighting of log() function calls in scripts
- Added more options to script functions mkDir, rmDir und deleteFile

### Fixed

- Several fixes in local & remote script functions

## [0.0.8] - 2024-11-06

### Changed

- Removed max width restriction

### Fixed

- Fixed bug where tunnels were not usable for new remotes
- Fixed bug where the script-editor has no overflow for widgets

## [0.0.7] - 2024-11-06

### Changed

- Changed style of remotes list on the left
- Scripts are now stored in seperate files in the app-data directory instead of a single json file (path is adjustable in config)

## [0.0.6] - 2024-10-18

### Changed

- Removed unused dependencies from package.json which reduces package size

### Fixed

- Fixed bugs in the scripting library

## [0.0.5] - 2024-10-17

### Added

- Added split panel to scripts
- Added tabs to have problems and logs next to each other in scripts

### Changed

- Enforced code style standarts using ESLint
- Improved logging (via the log(...) function) in scripts

### Fixed

- Fixed bugs in the scripting library

## [0.0.4] - 2024-10-15

### Fixed

- Fixed monaco code editor in production mode (see Monaco.md for more information)

## [0.0.3] - 2024-10-14

### Added

- User can have multiple shells now
- Shell now resizes correctly
- Shell supports right click for pasting
- Added buttons for copy/paste clipboard in shell
- Split 'sshConfig.json' into 'rc.config.json' and 'rc-remotes.config.json'
- Added 'Script' section where user can write and execute typescript code
- Added menu with links to useful application files and also this Github repo

### Changed

- Increased ssh connection timeout
- New layout for File Editor
- Log level from debug to verbose

### Fixed

- Fixed function "Open in Terminal"

## [0.0.2] - 2024-09-27

### Added

- Added GitHub Action Workflow to automatically release a windows installer

### Changed

- Added ssh connect timeout of 5s

### Fixed

- Small fix in the Shell.tsx
- Centered loading screen
- Handling of uncaught exceptions

## [0.0.1] - 2024-09-26

### Added

- Added current version number to home screen
- Added "npm run install" and "npm run makeAndInstall" scripts

### Changed

- Updated packages

### Fixed

- Fixed issue that tunnels cannot be closed
