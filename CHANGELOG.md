# Change Log
All notable changes to this project will be documented in this file.

## [1.0.3] - Not released yet
 
### Added

- User can have multiple shells now
- Shell now resizes correctly
- Shell supports right click for pasting
- Split 'sshConfig.json' into 'rc.config.json' and 'rc-remotes.config.json'
- Added 'Script' section where user can write and execute typescript code

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