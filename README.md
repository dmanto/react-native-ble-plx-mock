# react-native-ble-plx-mock

🔌 **Comprehensive mock implementation of react-native-ble-plx for testing.** Simulate BLE devices, control responses, and accelerate development without physical hardware.

[![CI Status](https://github.com/dmanto/react-native-ble-plx-mock/actions/workflows/ci.yml/badge.svg)](https://github.com/dmanto/react-native-ble-plx-mock/actions)
[![Coverage Status](https://codecov.io/gh/dmanto/react-native-ble-plx-mock/branch/main/graph/badge.svg)](https://codecov.io/gh/dmanto/react-native-ble-plx-mock)
[![npm version](https://badge.fury.io/js/react-native-ble-plx-mock.svg)](https://www.npmjs.com/package/react-native-ble-plx-mock)

## 🎉 Production Ready: v1.0.0

✅ **Comprehensive BLE functionality** including scanning, connections, characteristic operations  
✅ **Complete device-level API** - MockDevice objects support all device methods (read, write, monitor, etc.)  
✅ **Consistent API** - Service.characteristics() now matches real BLE API (no more code smell!)  
✅ **Error simulation** for robust testing  
✅ **Drop-in replacement** compatibility with react-native-ble-plx  
✅ **92%+ test coverage** with extensive test suite  
✅ **TypeScript support** with full type definitions and improved type safety  
✅ **Production tested** and API-stable

> **Production Ready**: This release includes major API improvements where the mock Service objects now have the same async `characteristics()` method as the real BLE API, eliminating code smells and ensuring perfect compatibility.

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

// Or use the convenience method for simple test devices
const testDevice = bleManager.addTestDevice('simple-device', 'Test Device');
console.log('Added:', testDevice.name);
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

// Check connection status using device method
const isConnected = await device.isConnected();
console.log('Connected:', isConnected); // true

// Discover services (both approaches work)
const discoveredDevice = await device.discoverAllServicesAndCharacteristics(); // Device method
// OR
await bleManager.discoverAllServicesAndCharacteristicsForDevice('device-1'); // Manager method

// Read characteristic using device method
const char = await device.readCharacteristicForService('180D', '2A37');
// OR using manager method
const char2 = await bleManager.readCharacteristicForDevice('device-1', '180D', '2A37');

// Write characteristic using device method
const writeValue = Buffer.from('Hello').toString('base64');
const writtenChar = await device.writeCharacteristicWithResponseForService('180D', '2A37', writeValue);

// Monitor characteristic using device method
const subscription = device.monitorCharacteristicForService('180D', '2A37', (error, characteristic) => {
  if (characteristic) console.log('Received notification:', characteristic.value);
});

// Trigger a value change from the mock "hardware"
bleManager.setCharacteristicValue('device-1', '180D', '2A37', Buffer.from([80]).toString('base64'));

// Disconnect using device method
const disconnectedDevice = await device.cancelConnection();
```

## Simulating Writes (Command/Response Loop)

Use `onCharacteristicWrite` to intercept values the app writes to the mock peripheral. This lets you test the full command/response cycle: the app writes a command, the mock receives it and can reply by updating a characteristic.

```typescript
// Listen for writes from the app
const subscription = bleManager.onCharacteristicWrite(
  'device-1',
  '180D', // serviceUUID
  '2A37', // characteristicUUID
  (valueBase64) => {
    const command = Buffer.from(valueBase64, 'base64').toString();
    console.log('App wrote:', command);

    // Respond by updating the characteristic (e.g. simulate peripheral reaction)
    const response = Buffer.from('OK').toString('base64');
    bleManager.setCharacteristicValue('device-1', '180D', '2A37', response);
  }
);

// Later, when the app writes to the characteristic:
await device.writeCharacteristicWithResponseForService('180D', '2A37', Buffer.from('Turn On').toString('base64'));
// → listener fires with the written value

// Clean up
subscription.remove();
```

## Scan State Hooks

Use `onStartScan` and `onStopScan` to react when the app enters or exits scanning.

```typescript
const startSub = bleManager.onStartScan(() => {
  console.log('App started scanning');
});

const stopSub = bleManager.onStopScan(() => {
  console.log('App stopped scanning');
});

bleManager.startDeviceScan(null, null, (error, device) => { /* ... */ }); // → onStartScan fires
bleManager.stopDeviceScan();                                               // → onStopScan fires

// Clean up
startSub.remove();
stopSub.remove();
```

## Connection Hooks

Use `onDeviceConnect` and `onDeviceDisconnect` to react to connection state changes — useful for synchronizing external resources like WebSocket bridges.

```typescript
const connectSub = bleManager.onDeviceConnect((deviceId) => {
  console.log(`${deviceId} connected — opening WebSocket bridge`);
});

const disconnectSub = bleManager.onDeviceDisconnect((deviceId) => {
  console.log(`${deviceId} disconnected — closing WebSocket bridge`);
});

// Hooks fire automatically on connect/disconnect
await bleManager.connectToDevice('device-1');         // → onDeviceConnect fires
await bleManager.cancelDeviceConnection('device-1'); // → onDeviceDisconnect fires

// Also fires on simulated disconnections
bleManager.simulateDeviceDisconnection('device-1');  // → onDeviceDisconnect fires

// Clean up
connectSub.remove();
disconnectSub.remove();
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
// Modern ES modules approach (recommended)
import { MockBleManager } from 'react-native-ble-plx-mock';

describe('BLE Integration', () => {
  let bleManager: any; // Use 'any' type for simplicity in tests

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
    bleManager.startDeviceScan(null, null, (_: any, device: any) => {
      if (device) foundDevices.push(device);
    });

    // Wait for discovery
    await new Promise(resolve => setTimeout(resolve, 150));
    bleManager.stopDeviceScan();

    // Verify
    expect(foundDevices.some(d => d.name === 'Heart Rate Monitor')).toBe(true);
  });

  it('should discover services and characteristics', async () => {
    // Setup device with services
    bleManager.addMockDevice({
      id: 'hr-monitor',
      name: 'Heart Rate Monitor',
      serviceUUIDs: ['180D'],
      services: [
        {
          uuid: '180D',
          characteristics: [
            {
              uuid: '2A37',
              isReadable: true,
              isNotifiable: true,
              properties: { read: true, notify: true }
            }
          ]
        }
      ]
    });

    // Connect and discover (using device method - matches real API)
    const device = await bleManager.connectToDevice('hr-monitor');
    await device.discoverAllServicesAndCharacteristics();
    
    // Access services - these have async characteristics() method like real BLE API!
    const services = await bleManager.servicesForDevice('hr-monitor');
    expect(services.length).toBe(1);
    expect(services[0].uuid).toBe('180D');
    
    // 🎉 NEW: Service.characteristics() is now async (matches real API - no code smell!)
    const characteristics = await services[0].characteristics();
    expect(characteristics.length).toBe(1);
    expect(characteristics[0].uuid).toBe('2A37');
    expect(characteristics[0].isNotifiable).toBe(true);
  });
});
```

**Note**: This library uses modern ES modules. Make sure your Jest configuration supports ES modules with `preset: 'ts-jest/presets/default-esm'` and `extensionsToTreatAsEsm: ['.ts']`.

## API Reference

The mock library implements all methods from the original [`BleManager`](https://polidea.github.io/react-native-ble-plx/#blemanager) with these additional mock-specific methods:

### Mock Device Management

| Method | Parameters | Description |
|--------|------------|-------------|
| **addMockDevice** | `device: MockDeviceConfig` | Add a device to be discovered during scanning |
| **addTestDevice** | `deviceId: string`, `deviceName?: string`, `serviceUUID?: string`, `characteristicUUID?: string` | Quick helper to add a simple test device with default service/characteristic |
| **clearMockDevices** | - | Remove all mock devices from discovery pool |

### State Simulation

| Method | Parameters | Description |
|--------|------------|-------------|
| **setState** | `state: State` (`'PoweredOn'`, `'PoweredOff'`, etc.) | Change Bluetooth adapter state |
| **setDiscoveryInterval** | `interval: number` (milliseconds) | Set time between simulated device discoveries |

### Scan State Hooks

| Method | Parameters | Description |
|--------|------------|-------------|
| **onStartScan** | `callback: () => void` | Register a hook fired when `startDeviceScan` is called; returns `{ remove() }` |
| **onStopScan** | `callback: () => void` | Register a hook fired when `stopDeviceScan` is called; returns `{ remove() }` |

### Connection Hooks

| Method | Parameters | Description |
|--------|------------|-------------|
| **onDeviceConnect** | `callback: (deviceId: string) => void` | Register a hook fired when any device connects; returns `{ remove() }` |
| **onDeviceDisconnect** | `callback: (deviceId: string) => void` | Register a hook fired when any device disconnects (including simulated); returns `{ remove() }` |

### Characteristic Simulation

| Method | Parameters | Description |
|--------|------------|-------------|
| **setCharacteristicValue** | `deviceId: string`, `serviceUUID: string`, `characteristicUUID: string`, `value: string` (base64) | Set current characteristic value |
| **setCharacteristicValueForReading** | `deviceId: string`, `serviceUUID: string`, `characteristicUUID: string`, `value: string` (base64) | Set value for next read operation |
| **onCharacteristicWrite** | `deviceId: string`, `serviceUUID: string`, `characteristicUUID: string`, `listener: (value: string) => void` | Intercept writes from the app; returns `{ remove() }` |
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

### Service Discovery

| Method | Parameters | Description |
|--------|------------|-------------|
| **discoverAllServicesAndCharacteristicsForDevice** | `deviceId: string` | Discover all services and characteristics for a connected device |
| **servicesForDevice** | `deviceId: string` | Get discovered services (requires prior discovery) |
| **characteristicsForService** | `serviceUUID: string`, `deviceId: string` | Get characteristics for a service |

### Device-Level Methods

Mock devices support all the standard device-level methods that match the real react-native-ble-plx API:

| Method | Parameters | Description |
|--------|------------|-------------|
| **device.discoverAllServicesAndCharacteristics()** | - | Discover services and characteristics (returns the device) |
| **device.isConnected()** | - | Check if device is connected (returns Promise\<boolean\>) |
| **device.cancelConnection()** | - | Disconnect from device (returns the device) |
| **device.readCharacteristicForService()** | `serviceUUID: string`, `characteristicUUID: string`, `transactionId?: string` | Read characteristic value |
| **device.writeCharacteristicWithResponseForService()** | `serviceUUID: string`, `characteristicUUID: string`, `base64Value: string`, `transactionId?: string` | Write with response |
| **device.writeCharacteristicWithoutResponseForService()** | `serviceUUID: string`, `characteristicUUID: string`, `base64Value: string`, `transactionId?: string` | Write without response |
| **device.monitorCharacteristicForService()** | `serviceUUID: string`, `characteristicUUID: string`, `listener: function`, `transactionId?: string` | Monitor characteristic changes. **Note**: In v1.3.0+, this is silent upon subscription and only triggers when a new value is set via setCharacteristicValue. |

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
  serviceData?: Record<string, string> | null; // keyed by service UUID, values are base64
  serviceUUIDs?: string[];
  isConnectable?: boolean;
  services?: () => Promise<Service[]>; // Async function for service discovery (matches real API)
  
  // Device-level methods (match real react-native-ble-plx API)
  discoverAllServicesAndCharacteristics?: () => Promise<MockDevice>;
  isConnected?: () => Promise<boolean>;
  cancelConnection?: () => Promise<MockDevice>;
  readCharacteristicForService?: (serviceUUID: string, characteristicUUID: string, transactionId?: string) => Promise<Characteristic>;
  writeCharacteristicWithResponseForService?: (serviceUUID: string, characteristicUUID: string, base64Value: string, transactionId?: string) => Promise<Characteristic>;
  writeCharacteristicWithoutResponseForService?: (serviceUUID: string, characteristicUUID: string, base64Value: string, transactionId?: string) => Promise<Characteristic>;
  monitorCharacteristicForService?: (
    serviceUUID: string,
    characteristicUUID: string,
    listener: (error: Error | null, characteristic: Characteristic | null) => void,
    transactionId?: string
    ) => MonitorSubscription;
}

// When adding devices, provide services as ServiceMetadata[] - will be converted to async function
interface ServiceMetadata {
  uuid: string;
  characteristics: CharacteristicMetadata[];
}

interface CharacteristicMetadata {
  uuid: string;
  isReadable?: boolean;
  isWritableWithResponse?: boolean;
  isWritableWithoutResponse?: boolean;
  isNotifiable?: boolean;
  isIndicatable?: boolean;
  properties?: {
    read?: boolean;
    write?: boolean;
    writeWithoutResponse?: boolean;
    notify?: boolean;
    indicate?: boolean;
  };
  descriptors?: DescriptorMetadata[];
}
```

## Contributing

PRs and issues welcome! See [contribution guide](CONTRIBUTING.md) for details.

## Requirements

- Node.js 22+
- TypeScript 5+
- React Native with react-native-ble-plx

## License

MIT - See [LICENSE](LICENSE) file for details.
