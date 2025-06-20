# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [0.2.0-alpha.8](https://github.com/dmanto/react-native-ble-plx-mock/compare/v0.2.0-alpha.7...v0.2.0-alpha.8) (2025-06-20)

## [0.2.0-alpha.7](https://github.com/dmanto/react-native-ble-plx-mock/compare/v0.2.0-alpha.6...v0.2.0-alpha.7) (2025-06-20)

## [0.2.0-alpha.6](https://github.com/dmanto/react-native-ble-plx-mock/compare/v0.2.0-alpha.5...v0.2.0-alpha.6) (2025-06-20)

## [0.2.0-alpha.2](https://github.com/dmanto/react-native-ble-plx-mock/compare/v0.2.0-alpha.3...v0.2.0-alpha.2) (2025-06-20)

## [0.2.0-alpha.2](https://github.com/dmanto/react-native-ble-plx-mock/compare/v0.2.0-alpha.1...v0.2.0-alpha.2) (2025-06-20)

## [0.2.0-alpha.2](https://github.com/dmanto/react-native-ble-plx-mock/compare/v0.2.0-alpha.1...v0.2.0-alpha.2) (2025-06-20)

## [0.2.0-alpha.1](https://github.com/dmanto/react-native-ble-plx-mock/compare/v0.2.0-alpha.0...v0.2.0-alpha.1) (2025-06-20)

## [0.2.0-alpha.1] - YYYY-MM-DD

### Added
- `setDiscoveryInterval()` method for faster tests
- Enhanced error simulation capabilities
- Improved state restoration support

### Fixed
- Timing issues in scan tests
- Disconnection error handling
- Test cleanup reliability

## 0.2.0-alpha.0 (2025-06-20)

### Added
- Complete BLE manager mock interface
- Device connection/disconnection management
- Service discovery and characteristic operations:
  - Read characteristics
  - Write with/without response
  - Notifications monitoring
- MTU negotiation support
- Bluetooth state management (PoweredOn, PoweredOff, etc.)
- Error simulation for all BLE operations
- iOS state restoration simulation
- Comprehensive test suite covering all features