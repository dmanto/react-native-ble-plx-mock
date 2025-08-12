# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### [0.2.2-beta.0](https://github.com/dmanto/react-native-ble-plx-mock/compare/v0.2.1...v0.2.2-beta.0) (2025-08-12)

## [0.2.2-beta.0] - 2025-08-12

### Added
- **NEW**: `discoverAllServicesAndCharacteristicsForDevice()` method for proper BLE service discovery workflow
- **NEW**: `servicesForDevice()` and `characteristicsForService()` methods now require explicit discovery
- **NEW**: Jest test support with comprehensive ES modules configuration
- **NEW**: Modern ES modules testing examples in README
- **NEW**: Enhanced `MockDevice` interface with `services` property for full service definitions
- **NEW**: Support for complex service metadata including descriptors and properties

### Changed
- **BREAKING**: `MockDevice.services` is now an async function `() => Promise<Service[]>` instead of `ServiceMetadata[]` (matches real react-native-ble-plx API)
- **BREAKING**: Services and characteristics now require discovery before access (matches real BLE behavior)
- **BREAKING**: Removed internal `deviceServicesMetadata` storage in favor of static device service data
- **MODERNIZED**: Eliminated CommonJS dependencies in favor of pure ES modules approach
- **IMPROVED**: Test file organization with separate Node.js (`*.node.test.ts`) and Jest (`*.jest.test.ts`) files
- **ENHANCED**: README with modern Jest configuration and service discovery examples
- **IMPROVED**: Internal service metadata storage for better API consistency

### Fixed
- **CRITICAL**: `MockDevice.services` now correctly returns an async function matching the real BLE API behavior
- Service discovery flow now properly matches react-native-ble-plx behavior
- Simplified mock architecture by removing redundant service metadata storage
- TypeScript configuration updated to support both Node.js and Jest testing environments

### [0.2.1](https://github.com/dmanto/react-native-ble-plx-mock/compare/v0.2.0...v0.2.1) (2025-07-25)

## [0.2.0-beta.7] - 2025-06-29

### Added
- **BREAKING**: Added `BleManager` export as alias for `MockBleManager` for drop-in replacement compatibility
- **BREAKING**: Added `Device` export as alias for `MockDevice` for TypeScript compatibility
- **BREAKING**: Exported `Subscription` type for external use
- Added `destroy()` method for proper lifecycle management (matches original react-native-ble-plx API)
- Added `setCharacteristicValueFromBuffer()` convenience method for Buffer-to-base64 conversion
- Added `setCharacteristicValueFromBinary()` convenience method for binary string-to-base64 conversion

### Changed
- Improved TypeScript compatibility with react-native-ble-plx imports
- Enhanced documentation with Buffer handling examples

### Fixed
- Fixed missing exports that prevented drop-in replacement usage
- Fixed lifecycle management with proper cleanup in destroy() method

## [0.2.0-beta.6](https://github.com/dmanto/react-native-ble-plx-mock/compare/v0.2.0-beta.5...v0.2.0-beta.6) (2025-06-25)

## [0.2.0-beta.5](https://github.com/dmanto/react-native-ble-plx-mock/compare/v0.2.0-beta.4...v0.2.0-beta.5) (2025-06-25)

## [0.2.0-beta.4](https://github.com/dmanto/react-native-ble-plx-mock/compare/v0.2.0-beta.3...v0.2.0-beta.4) (2025-06-25)

## [0.2.0-beta.3](https://github.com/dmanto/react-native-ble-plx-mock/compare/v0.2.0-beta.2...v0.2.0-beta.3) (2025-06-25)

## [0.2.0-beta.2](https://github.com/dmanto/react-native-ble-plx-mock/compare/v0.2.0-beta.1...v0.2.0-beta.2) (2025-06-24)

## [0.2.0-beta.1](https://github.com/dmanto/react-native-ble-plx-mock/compare/v0.2.0-beta.0...v0.2.0-beta.1) (2025-06-21)

## [0.2.0-beta.0](https://github.com/dmanto/react-native-ble-plx-mock/compare/v0.2.0-alpha.9...v0.2.0-beta.0) (2025-06-21)

## [0.2.0-alpha.9](https://github.com/dmanto/react-native-ble-plx-mock/compare/v0.2.0-alpha.8...v0.2.0-alpha.9) (2025-06-20)

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