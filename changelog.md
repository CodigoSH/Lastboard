# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/spec/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]
### Fixed
- Add default value for download count in `update-stats` workflow to prevent empty values in Gist.

## [1.3.3] - 2026-03-03
### Added
- Stable release protocol with automated versioning and changelog generation.
- Real-time metrics visualization (RAM/Disk).

### Changed
- Dashboard redesign with improved layout and responsive elements.

### Fixed
- Redirect loop issue after updating from previous beta versions.
- UI clipping in update modal buttons.

## [1.3.2] - 2026-02-23
### Added
- City search functionality in event modal with geocoding integration.
- Automated timezone resolution via TimeAPI.

### Changed
- Refactored collision service to improve performance in compact layouts.

## [1.1.0] - 2026-02-05
### Added
- Multi-language support with i18n infrastructure.
- User management and roles (Admin/User).
- Backup and restoration system for the database.

## [1.0.0] - 2026-02-02
### Added
- Initial release of Lastboard.
- Basic widget system and layout persistence.
- Core authentication and user setup flow.
