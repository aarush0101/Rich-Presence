# Changelog

All notable changes to the Rich Presence project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2025-07-07

### Added
- Comprehensive JSDoc documentation for all files and functions
- Enhanced API endpoints for remote control
- Improved scheduling system for background tasks

### Changed
- Refactored state management for better maintainability
- Optimized WebSocket implementation for performance
- Modified Eris client integration for stability
- Improved error handling throughout the codebase
- Enhanced logging with more detailed information
- Restructured HTTP request handling for API endpoints

### Fixed
- Process termination issues in Node.js environment
- WebSocket reconnection logic for better reliability
- Error handling in Discord Gateway interactions

## [1.0.0] - 2025-06-15

### Added
- Initial release of Rich Presence application
- Discord rich presence management via WebSocket Gateway
- Bot controller with command system
- Multiple user token support
- Command system with help, ping, restart, start, status, and stop commands
- Keep-alive functionality for continuous operation
- Configuration system for easy customization
- Detailed logging system
- Automatic reconnection for dropped connections
- Status monitoring for active connections

### Features
- Discord rich presence customization (name, details, state)
- Activity type selection
- Timestamps support for showing elapsed time
- Custom status images (large and small)
- Custom status text tooltips
- Multiple account management
- Server monitoring and status checking
- Docker containerization support
