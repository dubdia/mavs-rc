# Change Log
All notable changes to this project will be documented in this file.

## [1.0.5] - Not released yet

### Changed

- Enforced code style standarts using ESLint

## [1.0.4] - 2024-10-15

### Fixed

- Fixed monaco code editor in production mode (see Monaco.md for more information)

## [1.0.3] - 2024-10-14
 
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

## [1.0.2] - 2024-09-27
 
### Added

- Added GitHub Action Workflow to automatically release a windows installer

### Changed

- Added ssh connect timeout of 5s
 
### Fixed

- Small fix in the Shell.tsx
- Centered loading screen
- Handling of uncaught exceptions
 
 
## [1.0.1] - 2024-09-26
 
### Added

- Added current version number to home screen
- Added "npm run install" and "npm run makeAndInstall" scripts
   
### Changed

- Updated packages
 
### Fixed
 
- Fixed issue that tunnels cannot be closed