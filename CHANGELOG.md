# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [1.0.1](https://github.com/dmanto/react-native-ble-plx-mock/compare/v1.0.0...v1.0.1) (2025-08-13)

### 🔧 TypeScript Improvements

- **FIXED**: Improved TypeScript method signatures for better type safety and IntelliSense support
- **FIXED**: `setCharacteristicValue()` method now has proper optional `options` parameter with correct signature `options?: { notify?: boolean }`
- **ENHANCED**: All existing methods (`simulateConnectionError`, `simulateDeviceDisconnection`, `notifyCharacteristicChange`, `clearMockDevices`, `stopDeviceScan`) now have fully typed signatures
- **ADDED**: New `addTestDevice()` convenience method for quick test device setup with default service/characteristic configuration

### ✨ New Features

- **NEW**: `addTestDevice(deviceId, deviceName?, serviceUUID?, characteristicUUID?)` - Quick helper method for adding simple test devices
- **IMPROVED**: Better TypeScript IntelliSense and autocompletion support
- **ENHANCED**: All method parameter types are now correctly inferred and validated

### 🧪 Developer Experience

- **NO BREAKING CHANGES**: All existing code continues to work without modifications
- **IMPROVED**: Better error messages and type checking at compile time
- **ENHANCED**: Comprehensive TypeScript definitions for all mock methods
- **TESTED**: All TypeScript type signatures verified and tested

## [1.0.0](https://github.com/dmanto/react-native-ble-plx-mock/compare/v0.2.2-beta.3...v1.0.0) (2025-08-13)

### 🎉 PRODUCTION READY RELEASE

**MAJOR**: This is the first production-ready release with full API compatibility and no breaking changes expected.

### ✨ Key Features
- **API CONSISTENCY**: Service.characteristics() now matches real BLE API - eliminates code smell where production code had to handle both sync and async patterns
- **SIMPLIFIED CONFIGURATION**: New ServiceConfig/CharacteristicConfig interfaces for easier mock device setup
- **COMPREHENSIVE COVERAGE**: 92%+ test coverage with both Node.js and Jest test suites
- **PRODUCTION TESTED**: API-stable and ready for production use
- **FULL COMPATIBILITY**: Drop-in replacement for react-native-ble-plx in testing environments

### 🔧 API Improvements
- **FIXED**: Service interface `characteristics()` method is now required (not optional) and returns `Promise<Characteristic[]>`
- **NEW**: ServiceConfig and CharacteristicConfig interfaces exported for easier TypeScript usage
- **ENHANCED**: MockDeviceConfig interface now uses simplified ServiceConfig[] for services configuration
- **CONSISTENT**: Mock services now have identical async API as real react-native-ble-plx

### 🧪 Testing Improvements
- **ADDED**: New test specifically validating Service.characteristics() async method behavior
- **ENHANCED**: Jest test suite includes examples of new API usage
- **UPDATED**: README examples now demonstrate the correct async patterns

### 📚 Documentation
- **PRODUCTION STATUS**: Updated README to reflect production-ready status
- **API EXAMPLES**: Enhanced examples showing Service.characteristics() async usage
- **MIGRATION**: Clear examples of the improved API without code smells

### 🎯 Developer Experience
- **NO CODE SMELL**: Production code can now consistently use `await service.characteristics()` for both mock and real APIs
- **TYPE SAFETY**: Improved TypeScript definitions and consistent interfaces
- **EASIER SETUP**: Simplified mock device configuration with new config interfaces

### [0.2.2-beta.3](https://github.com/dmanto/react-native-ble-plx-mock/compare/v0.2.2-beta.1...v0.2.2-beta.3) (2025-08-12)


### Features

* add complete device-level methods support ([a7c8d06](https://github.com/dmanto/react-native-ble-plx-mock/commit/a7c8d06b378a3fa6fb275ca93dcf1e24159146ae))


### Bug Fixes

* type inconsistencies and service discovery improvements ([fe1f519](https://github.com/dmanto/react-native-ble-plx-mock/commit/fe1f519751f7a1167b4223f1e0218c9115adf19f))

### [0.2.2-beta.3](https://github.com/dmanto/react-native-ble-plx-mock/compare/v0.2.2-beta.2...v0.2.2-beta.3) (2025-08-12)

### Fixed
- **CRITICAL**: Fixed type inconsistency for MockDevice services property - now properly typed and implemented
- **API**: Added missing `MockDeviceConfig` interface export for proper TypeScript usage
- **SERVICE DISCOVERY**: Fixed Service interface to include characteristics method for proper service-level characteristic access
- **NOTIFICATIONS**: Enhanced `notifyCharacteristicChange` method - now public with proper value setting and notification
- **DEBUGGING**: Added service characteristics logging for better development debugging experience
- **INTERNAL**: Refactored internal notification methods for better separation of concerns

### Enhanced
- **TYPESCRIPT**: Improved type safety and consistency across MockDevice interfaces
- **API COMPATIBILITY**: Better alignment with react-native-ble-plx Service interface structure
- **DEVELOPER EXPERIENCE**: Clearer method signatures and better error handling

### [0.2.2-beta.2](https://github.com/dmanto/react-native-ble-plx-mock/compare/v0.2.2-beta.1...v0.2.2-beta.2) (2025-08-12)

### Added
- **NEW**: Complete device-level methods support - MockDevice objects now include all characteristic operations
- **NEW**: `device.writeCharacteristicWithResponseForService()` method for writing characteristics with acknowledgment
- **NEW**: `device.writeCharacteristicWithoutResponseForService()` method for writing characteristics without acknowledgment  
- **NEW**: `device.readCharacteristicForService()` method for reading characteristic values
- **NEW**: `device.monitorCharacteristicForService()` method for monitoring characteristic changes
- **NEW**: `device.isConnected()` method for checking connection status
- **NEW**: `device.cancelConnection()` method for disconnecting from device
- **NEW**: Comprehensive test coverage for all device-level methods in both Node.js and Jest test suites
- **NEW**: Updated npm test command to run both Node.js and Jest tests automatically

### Enhanced
- **IMPROVED**: MockDevice objects now provide complete 1:1 API compatibility with real react-native-ble-plx devices
- **ENHANCED**: All device-level methods properly delegate to the manager's existing implementations
- **IMPROVED**: Test coverage increased with comprehensive device-level methods testing
- **ENHANCED**: README documentation with device-level methods examples and API reference

### Fixed
- **API CONSISTENCY**: MockDevice objects now support all standard device operations like real BLE devices
- **DEVELOPER EXPERIENCE**: Tests can now use identical code patterns as production applications

### [0.2.2-beta.1](https://github.com/dmanto/react-native-ble-plx-mock/compare/v0.2.2-beta.0...v0.2.2-beta.1) (2025-08-12)


### Features

* add discoverAllServicesAndCharacteristics method to MockDevice objects ([b26dc39](https://github.com/dmanto/react-native-ble-plx-mock/commit/b26dc3968926c08fe7dc709c1fe2ebb91e8935cb))

### [0.2.2-beta.1](https://github.com/dmanto/react-native-ble-plx-mock/compare/v0.2.2-beta.0...v0.2.2-beta.1) (2025-08-12)

## [0.2.2-beta.1] - 2025-08-12

### Added
- **NEW**: `discoverAllServicesAndCharacteristics()` method now available directly on MockDevice objects
- **ENHANCEMENT**: Device objects returned from scanning and connection now match real react-native-ble-plx API more closely
- **NEW**: Comprehensive test coverage for device-level service discovery method

### Changed
- **IMPROVED**: MockDevice objects now include the `discoverAllServicesAndCharacteristics()` method for better API compatibility
- **ENHANCED**: Service discovery can now be called via `device.discoverAllServicesAndCharacteristics()` in addition to the manager method

### Fixed
- **API CONSISTENCY**: Device objects now provide the same methods as the real react-native-ble-plx library
- **DEVELOPER EXPERIENCE**: Tests can now more closely mirror production code patterns

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