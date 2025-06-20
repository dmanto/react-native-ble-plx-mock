# react-native-ble-plx-mock
🔌 Mock implementation of react-native-ble-plx for testing. Simulate BLE devices, control responses, and accelerate development without physical hardware.

[![CI Status](https://github.com/dmanto/react-native-ble-plx-mock/actions/workflows/ci.yml/badge.svg)](https://github.com/dmanto/react-native-ble-plx-mock/actions)

[![Coverage Status](https://codecov.io/gh/dmanto/react-native-ble-plx-mock/branch/main/graph/badge.svg)](https://codecov.io/gh/dmanto/react-native-ble-plx-mock)

## Alpha Notice
> **Important**: This is an initial alpha release (v0.1.0) with limited functionality. Core scanning features are implemented, with more functionality coming soon.

# React Native BLE PLX Mock Library

A comprehensive mocking library for `react-native-ble-plx` that enables reliable testing of Bluetooth Low Energy (BLE) functionality in React Native applications.

## Features

- Fully mockable BLE manager with identical API to `react-native-ble-plx`
- Simulate device discovery, connections, and disconnections
- Mock characteristic read/write operations with response simulation
- Simulate errors during scanning, connections, and operations
- Control Bluetooth adapter state changes
- Device state restoration support
- Configurable scan intervals for faster testing

## Installation

```bash
npm install --save-dev react-native-ble-plx-mock
# or
yarn add --dev react-native-ble-plx-mock
```

## Basic Usage

```typescript
import { BleManager } from 'react-native-ble-plx';
import { MockBleManager } from 'react-native-ble-plx-mock';

// Use in tests
const bleManager = new MockBleManager();
```

## Creating Mock Devices

```typescript
bleManager.addMockDevice({
  id: 'device-1',
  name: 'Heart Monitor',
  serviceUUIDs: ['180D'],
  manufacturerData: Buffer.from([0x48, 0x52]).toString('base64'),
  isConnectable: true
});
```

## Simulating Scans

```typescript
// Start scan
bleManager.startDeviceScan(null, null, (error, device) => {
  if (error) console.error(error);
  if (device) console.log('Found:', device.name);
});

// Speed up discovery for tests
bleManager.setDiscoveryInterval(100); // 100ms between discoveries

// Add devices after scan starts
setTimeout(() => {
  bleManager.addMockDevice({ id: 'new-device', name: 'New Device' });
}, 500);
```

## Simulating Connections

```typescript
// Connect to device
const device = await bleManager.connectToDevice('device-1');

// Discover services
await bleManager.discoverAllServicesAndCharacteristicsForDevice('device-1');

// Read characteristic
const char = await bleManager.readCharacteristicForDevice(
  'device-1',
  '180D',
  '2A37'
);
```

## Error Simulation

```typescript
// Simulate connection error
bleManager.simulateConnectionError('device-1', new Error('Connection failed'));

try {
  await bleManager.connectToDevice('device-1');
} catch (error) {
  console.error('Connection failed as expected');
}

// Clear errors
bleManager.clearAllSimulatedErrors();
```

## State Restoration

```typescript
// First manager instance
const manager1 = new MockBleManager({
  restoreStateIdentifier: 'test-app',
  restoreStateFunction: (state) => console.log('Initial state:', state)
});

// Connect devices...

// Second manager (restores state)
const manager2 = new MockBleManager({
  restoreStateIdentifier: 'test-app',
  restoreStateFunction: (state) => {
    if (state) console.log('Restored devices:', state.connectedPeripherals);
  }
});
```

## Testing Examples

### Jest Test Example

```typescript
import { MockBleManager } from 'react-native-ble-plx-mock';

describe('BLE Integration', () => {
  let bleManager: MockBleManager;

  beforeEach(() => {
    bleManager = new MockBleManager();
    bleManager.setDiscoveryInterval(100); // Faster tests
  });

  it('should discover heart rate monitor', async () => {
    // Setup
    bleManager.addMockDevice({
      id: 'hr-monitor',
      name: 'Heart Rate Monitor',
      serviceUUIDs: ['180D']
    });

    // Scan
    const foundDevices: any[] = [];
    bleManager.startDeviceScan(null, null, (_, device) => {
      if (device) foundDevices.push(device);
    });

    // Wait for discovery
    await new Promise(resolve => setTimeout(resolve, 150));
    bleManager.stopDeviceScan();

    // Verify
    expect(foundDevices.some(d => d.name === 'Heart Rate Monitor')).toBe(true);
  });
});
```

## API Reference

The mock library implements all methods from the original [`BleManager`](https://polidea.github.io/react-native-ble-plx/#blemanager) with these additional mock-specific methods:

### Mock Device Management

| Method | Parameters | Description |
|--------|------------|-------------|
| **addMockDevice** | `device: MockDevice` | Add a device to be discovered during scanning |
| **clearMockDevices** | - | Remove all mock devices from discovery pool |

### State Simulation

| Method | Parameters | Description |
|--------|------------|-------------|
| **setState** | `state: State` (`'PoweredOn'`, `'PoweredOff'`, etc.) | Change Bluetooth adapter state |
| **setDiscoveryInterval** | `interval: number` (milliseconds) | Set time between simulated device discoveries |

### Characteristic Simulation

| Method | Parameters | Description |
|--------|------------|-------------|
| **setCharacteristicValue** | `deviceId: string`, `serviceUUID: string`, `characteristicUUID: string`, `value: string` (base64) | Set current characteristic value |
| **setCharacteristicValueForReading** | `deviceId: string`, `serviceUUID: string`, `characteristicUUID: string`, `value: string` (base64) | Set value for next read operation |
| **startSimulatedNotifications** | `deviceId: string`, `serviceUUID: string`, `characteristicUUID: string`, `interval: number` (ms) | Start automatic value changes |
| **stopSimulatedNotifications** | `deviceId: string`, `serviceUUID: string`, `characteristicUUID: string` | Stop automatic value changes |

### Error Simulation

| Method | Parameters | Description |
|--------|------------|-------------|
| **simulateScanError** | `error: Error` | Simulate scanning error |
| **simulateConnectionError** | `deviceId: string`, `error: Error` | Simulate connection error |
| **simulateDeviceDisconnection** | `deviceId: string`, `error?: Error` | Simulate device disconnection (optional error) |
| **simulateCharacteristicReadError** | `deviceId: string`, `serviceUUID: string`, `characteristicUUID: string`, `error: Error` | Simulate read error |
| **simulateWriteWithResponseError** | `deviceId: string`, `serviceUUID: string`, `characteristicUUID: string`, `error: Error` | Simulate write error |
| **clearAllSimulatedErrors** | - | Clear all simulated errors |
| **clearCharacteristicReadError** | `deviceId: string`, `serviceUUID: string`, `characteristicUUID: string` | Clear specific read error |
| **clearWriteWithResponseError** | `deviceId: string`, `serviceUUID: string`, `characteristicUUID: string` | Clear specific write error |
| **clearConnectionError** | `deviceId: string` | Clear connection error |

### Device Information

| Method | Parameters | Description |
|--------|------------|-------------|
| **setDeviceMaxMTU** | `deviceId: string`, `maxMTU: number` | Set maximum MTU for a device |
| **isDeviceConnected** | `deviceId: string` | Check if device is connected |

### MockDevice Object

When adding mock devices, use this object structure:

```typescript
interface MockDevice {
  id: string;
  name: string;
  rssi?: number;
  mtu?: number;
  manufacturerData?: string; // base64
  serviceData?: string | null; // base64
  serviceUUIDs?: string[];
  isConnectable?: boolean;
}
```

## Features

- Fully mockable BLE manager with identical API to `react-native-ble-plx`
- Simulate device discovery, connections, and disconnections
- Mock characteristic read/write operations with response simulation
- Simulate errors during scanning, connections, and operations
- Control Bluetooth adapter state changes
- Device state restoration support
- Configurable scan intervals for faster testing

## Contributing

- PRs and issues welcome! See contribution guide for details

> ** Note ** Requires Node 22+ and TypeScript 5+
