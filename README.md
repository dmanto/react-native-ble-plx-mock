# react-native-ble-plx-mock
🔌 Mock implementation of react-native-ble-plx for testing. Simulate BLE devices, control responses, and accelerate development without physical hardware.

[![CI Status](https://github.com/dmanto/react-native-ble-plx-mock/actions/workflows/ci.yml/badge.svg)](https://github.com/dmanto/react-native-ble-plx-mock/actions)

## Alpha Notice
> **Important**: This is an initial alpha release (v0.1.0) with limited functionality. Core scanning features are implemented, with more functionality coming soon.

## Installation
```bash
npm install react-native-ble-plx-mock@alpha
```
## Usage

```typescript
import { BleManagerMock } from 'react-native-ble-plx-mock';

// Create mock instance
const bleManager = new BleManagerMock();

// Simulate device discovery
bleManager.simulateDeviceDiscovery({
  id: 'test-device',
  name: 'Virtual Device'
});

// Start scanning
bleManager.startDeviceScan(null, null, (error, device) => {
  if (device) {
    console.log(`Discovered: ${device.name}`);
    // Connect to device
    bleManager.connectToDevice(device.id);
  }
});
```

## Current Features

- Device scanning simulation
- Basic device connection
- Virtual device creation
- Programmatic control of device discovery

## Roadmap

- Core scanning implementation
- Connection management
- Service discovery
- Characteristic read/write
- Notification support

## Contributing

- PRs and issues welcome! See contribution guide for details

> ** Note ** Requires Node 22+ and TypeScript 5+


### Key improvements:
1. **Alpha Notice Banner** - Manages expectations upfront
2. **Clean Installation Instructions** - Clear alpha tag usage
3. **Self-contained Usage Example** - Works with current implementation
4. **Feature Transparency** - Lists exactly what's available
5. **Visual Roadmap** - Shows progress clearly
6. **Version Requirements** - Prevents compatibility issues
