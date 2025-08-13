// Jest test file for MockBleManager
// This file demonstrates testing with Jest framework instead of Node.js test runner

// ES modules import (modern approach)
import { MockBleManager } from '../src/BleManagerMock';

describe('BLE Integration (Jest)', () => {
  let bleManager: any; // Use 'any' type for simplicity in tests
  let heartMonitorId = 'heart-monitor-123';
  let thermoId = 'thermo-456';
  let serviceUUID = '180D';
  let charUUID = '2A37';

  beforeEach(() => {
    bleManager = new MockBleManager();
    bleManager.setDiscoveryInterval(100); // Faster tests
    bleManager.setState('PoweredOn');
    bleManager.clearMockDevices();

    // Add mock devices
    bleManager.addMockDevice({
      id: heartMonitorId,
      name: 'Heart Rate Monitor',
      rssi: -55,
      mtu: 128,
      manufacturerData: Buffer.from([0x48, 0x52]).toString('base64'),
      serviceData: null,
      serviceUUIDs: [serviceUUID, '180F'],
      isConnectable: true
    });

    bleManager.addMockDevice({
      id: thermoId,
      name: 'Smart Thermometer',
      rssi: -72,
      mtu: 64,
      manufacturerData: Buffer.from([0x54, 0x48]).toString('base64'),
      serviceData: null,
      serviceUUIDs: ['1809'],
      isConnectable: true
    });
  });

  afterEach(() => {
    bleManager.stopDeviceScan();
    // Clean up any connected devices
    [heartMonitorId, thermoId, 'test-device'].forEach(async (id: string) => {
      try {
        if (bleManager.isDeviceConnected(id)) {
          await bleManager.cancelDeviceConnection(id);
        }
      } catch (e) {
        // Ignore errors
      }
    });
  });

  it('should discover heart rate monitor', async () => {
    // Setup
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

  it('should manage Bluetooth state', async () => {
    expect(await bleManager.state()).toBe('PoweredOn');

    const stateChanges: string[] = [];
    const sub = bleManager.onStateChange((state: string) => stateChanges.push(state), true);

    bleManager.setState('PoweredOff');
    bleManager.setState('PoweredOn');

    // Allow event loop to process
    await new Promise(resolve => setImmediate(resolve));

    sub.remove();
    expect(stateChanges).toEqual(['PoweredOn', 'PoweredOff', 'PoweredOn']);
  });

  it('should scan for specific devices', async () => {
    const discoveredDevices: any[] = [];

    bleManager.startDeviceScan(
      [serviceUUID],
      { allowDuplicates: true },
      (error: any, device: any) => {
        if (!error && device) discoveredDevices.push(device);
      }
    );

    // Allow time for simulated discoveries
    await new Promise(resolve => setTimeout(resolve, 150));
    bleManager.stopDeviceScan();

    expect(discoveredDevices.length).toBeGreaterThan(0);
    expect(discoveredDevices.some(d => d.name === 'Heart Rate Monitor')).toBe(true);
    expect(discoveredDevices.some(d => d.name === 'Smart Thermometer')).toBe(true);
  });

  it('should connect to device and require discovery', async () => {
    // Connect to device
    const device = await bleManager.connectToDevice(heartMonitorId);
    expect(device.name).toBe('Heart Rate Monitor');
    expect(bleManager.isDeviceConnected(heartMonitorId)).toBe(true);

    // Services require discovery first
    await expect(bleManager.servicesForDevice(heartMonitorId))
      .rejects
      .toThrow('Services not discovered for device');

    // After discovery, services should be available
    await bleManager.discoverAllServicesAndCharacteristicsForDevice(heartMonitorId);
    const services = await bleManager.servicesForDevice(heartMonitorId);
    expect(services.length).toBe(0); // serviceUUIDs alone don't create discoverable services
  });

  it('should discover services and characteristics with full metadata', async () => {
    // Define complex service structure
    const servicesMetadata = [
      {
        uuid: serviceUUID, // '180D' Heart Rate Service
        characteristics: [
          {
            uuid: charUUID, // '2A37' Heart Rate Measurement
            isReadable: true,
            isNotifiable: true,
            properties: {
              read: true,
              notify: true
            },
            descriptors: [
              {
                uuid: '2902', // CCCD
                value: Buffer.from([0x00, 0x00]).toString('base64'),
                isReadable: true,
                isWritable: true
              }
            ]
          }
        ]
      },
      {
        uuid: '180F', // Battery Service
        characteristics: [
          {
            uuid: '2A19', // Battery Level
            isReadable: true,
            isNotifiable: true,
            properties: {
              read: true,
              notify: true
            }
          }
        ]
      }
    ];

    // Set device with services
    bleManager.addMockDevice({
      id: 'discovery-test-device',
      name: 'Discovery Test',
      isConnectable: true,
      services: servicesMetadata
    });

    // Connect to device
    await bleManager.connectToDevice('discovery-test-device');

    // Services should not be available before discovery
    await expect(bleManager.servicesForDevice('discovery-test-device'))
      .rejects
      .toThrow('Services not discovered for device');

    // Perform discovery
    const discoveredDevice = await bleManager.discoverAllServicesAndCharacteristicsForDevice('discovery-test-device');
    expect(discoveredDevice.name).toBe('Discovery Test');

    // Now services should be available
    const services = await bleManager.servicesForDevice('discovery-test-device');
    expect(services.length).toBe(2);
    
    const heartRateService = services.find((s: any) => s.uuid === serviceUUID);
    expect(heartRateService).toBeDefined();
    expect(heartRateService.deviceID).toBe('discovery-test-device');
    
    const batteryService = services.find((s: any) => s.uuid === '180F');
    expect(batteryService).toBeDefined();
    expect(batteryService.deviceID).toBe('discovery-test-device');

    // Test characteristics for each service
    const heartRateChars = await bleManager.characteristicsForService(serviceUUID, 'discovery-test-device');
    expect(heartRateChars.length).toBe(1);
    expect(heartRateChars[0].uuid).toBe(charUUID);
    expect(heartRateChars[0].isReadable).toBe(true);
    expect(heartRateChars[0].isNotifiable).toBe(true);
    expect(heartRateChars[0].descriptors?.length).toBe(1);

    const batteryChars = await bleManager.characteristicsForService('180F', 'discovery-test-device');
    expect(batteryChars.length).toBe(1);
    expect(batteryChars[0].uuid).toBe('2A19');
    expect(batteryChars[0].isReadable).toBe(true);
    expect(batteryChars[0].isNotifiable).toBe(true);
  });

  it('should read and write characteristic values', async () => {
    // Setup
    await bleManager.connectToDevice(heartMonitorId);

    bleManager.setCharacteristicValueForReading(
      heartMonitorId,
      serviceUUID,
      charUUID,
      Buffer.from([0x06, 0x4B]).toString('base64')
    );

    // Successful read
    const char = await bleManager.readCharacteristicForDevice(
      heartMonitorId,
      serviceUUID,
      charUUID
    );
    const value = char.value ? Buffer.from(char.value, 'base64')[1] : 0;
    expect(value).toBe(75);

    // Test write
    let writtenValue = '';
    const writeListener = bleManager.onCharacteristicWrite(
      heartMonitorId,
      serviceUUID,
      charUUID,
      (value: string) => writtenValue = value
    );

    await bleManager.writeCharacteristicWithResponseForDevice(
      heartMonitorId,
      serviceUUID,
      charUUID,
      Buffer.from([0x01, 0x02]).toString('base64')
    );
    expect(writtenValue).toBe(Buffer.from([0x01, 0x02]).toString('base64'));

    writeListener.remove();
  });

  it('should monitor characteristic changes', async () => {
    // Setup
    await bleManager.connectToDevice(heartMonitorId);

    bleManager.setCharacteristicValueForReading(
      heartMonitorId,
      serviceUUID,
      charUUID,
      Buffer.from([0x06, 0x48]).toString('base64')
    );

    // Monitor characteristic
    const values: number[] = [];
    const sub = bleManager.monitorCharacteristicForDevice(
      heartMonitorId,
      serviceUUID,
      charUUID,
      (error: any, char: any) => {
        if (!error && char?.value) {
          const data = Buffer.from(char.value, 'base64');
          values.push(data[1]);
        }
      }
    );

    // Trigger updates
    bleManager.setCharacteristicValue(heartMonitorId, serviceUUID, charUUID,
      Buffer.from([0x06, 0x52]).toString('base64'));

    bleManager.startSimulatedNotifications(heartMonitorId, serviceUUID, charUUID, 10);

    // Wait for notifications
    await new Promise(resolve => setTimeout(resolve, 50));

    sub.remove();
    bleManager.stopSimulatedNotifications(heartMonitorId, serviceUUID, charUUID);

    expect(values.length).toBeGreaterThanOrEqual(1);
    expect(values).toContain(72); // Initial value
    expect(values).toContain(82); // Updated value
  });

  it('should handle connection errors', async () => {
    // Simulate a connection error
    const testError = new Error('Connection failed');
    bleManager.simulateConnectionError(heartMonitorId, testError);

    // Attempt to connect
    await expect(bleManager.connectToDevice(heartMonitorId))
      .rejects
      .toThrow('Connection failed');

    // Clear error and verify normal connection works
    bleManager.clearConnectionError(heartMonitorId);
    const device = await bleManager.connectToDevice(heartMonitorId);
    expect(device.name).toBe('Heart Rate Monitor');
  });

  it('should handle scan errors', async () => {
    const errors: any[] = [];
    const devices: any[] = [];

    // Start scanning
    bleManager.startDeviceScan(
      null,
      null,
      (error: any, device: any) => {
        if (error) errors.push(error);
        if (device) devices.push(device);
      }
    );

    // Simulate a scan error
    const testError = new Error('Simulated scan error');
    bleManager.simulateScanError(testError);

    // Allow time for the error to propagate
    await new Promise(resolve => setTimeout(resolve, 200));

    // Add a device to ensure normal operation continues after error
    bleManager.addMockDevice({
      id: 'test-device',
      name: 'Test Device',
      isConnectable: true
    });

    // Allow time for device discovery
    await new Promise(resolve => setTimeout(resolve, 150));
    bleManager.stopDeviceScan();

    // Verify error was received
    expect(errors.length).toBe(1);
    expect(errors[0].message).toBe('Simulated scan error');
    expect(devices.length).toBeGreaterThan(0);
  });

  it('should handle device disconnections', async () => {
    // Setup
    await bleManager.connectToDevice(heartMonitorId);

    let disconnectError: any = null;
    const sub = bleManager.onDeviceDisconnected(
      heartMonitorId,
      (error: any, _: any) => disconnectError = error
    );

    // Simulate disconnection
    bleManager.simulateDeviceDisconnection(heartMonitorId, new Error('Connection lost'));
    await new Promise(resolve => setTimeout(resolve, 50));

    expect(disconnectError).toBeDefined();
    expect(disconnectError.message).toBe('Connection lost');
    expect(bleManager.isDeviceConnected(heartMonitorId)).toBe(false);

    sub.remove();
  });

  it('should handle MTU negotiation', async () => {
    bleManager.setDeviceMaxMTU(heartMonitorId, 150);

    // MTU during connection
    const device = await bleManager.connectToDevice(heartMonitorId, { requestMTU: 200 });
    expect(device.mtu).toBe(150);

    // MTU change after connection
    const updatedDevice = await bleManager.requestMTUForDevice(heartMonitorId, 100);
    expect(updatedDevice.mtu).toBe(100);
  });

  it('should support Buffer convenience methods', async () => {
    // Setup
    await bleManager.connectToDevice(heartMonitorId);

    // Test setCharacteristicValueFromBuffer
    const bufferValue = Buffer.from([0x01, 0x02, 0x03, 0x04]);
    bleManager.setCharacteristicValueFromBuffer(
      heartMonitorId,
      serviceUUID,
      charUUID,
      bufferValue
    );

    const char1 = await bleManager.readCharacteristicForDevice(
      heartMonitorId,
      serviceUUID,
      charUUID
    );
    expect(char1.value).toBe(bufferValue.toString('base64'));

    // Test setCharacteristicValueFromBinary
    const binaryString = '\x05\x06\x07\x08';
    bleManager.setCharacteristicValueFromBinary(
      heartMonitorId,
      serviceUUID,
      charUUID,
      binaryString
    );

    const char2 = await bleManager.readCharacteristicForDevice(
      heartMonitorId,
      serviceUUID,
      charUUID
    );
    const expectedBase64 = Buffer.from(binaryString, 'binary').toString('base64');
    expect(char2.value).toBe(expectedBase64);
  });

  it('should clear all simulated errors', async () => {
    // Set various errors
    bleManager.simulateScanError(new Error('Scan error'));
    bleManager.simulateConnectionError(heartMonitorId, new Error('Connection error'));
    bleManager.simulateCharacteristicReadError(
      heartMonitorId,
      serviceUUID,
      charUUID,
      new Error('Read error')
    );

    // Clear all
    bleManager.clearAllSimulatedErrors();

    // Verify all cleared - scan error should be cleared
    let scanErrorReceived = false;
    bleManager.startDeviceScan(null, null, (error: any) => {
      if (error) scanErrorReceived = true;
    });
    
    await new Promise(resolve => setTimeout(resolve, 50));
    bleManager.stopDeviceScan();
    expect(scanErrorReceived).toBe(false);

    // Connection error should be cleared
    await expect(bleManager.connectToDevice(heartMonitorId)).resolves.toBeDefined();

    // Read error should be cleared (won't throw)
    await expect(bleManager.readCharacteristicForDevice(
      heartMonitorId,
      serviceUUID,
      charUUID
    )).resolves.toBeDefined();
  });

  it('should support Service.characteristics() async method (matches real BLE API)', async () => {
    // This test demonstrates the key API improvement: Service objects now have consistent async characteristics() method
    // that matches the real react-native-ble-plx API (no more code smell!)
    
    const servicesMetadata = [
      {
        uuid: serviceUUID, // '180D' Heart Rate Service
        characteristics: [
          {
            uuid: charUUID, // '2A37' Heart Rate Measurement
            isReadable: true,
            isNotifiable: true,
            properties: { read: true, notify: true }
          },
          {
            uuid: '2A39', // Heart Rate Control Point
            isReadable: false,
            isWritableWithResponse: true,
            properties: { write: true }
          }
        ]
      },
      {
        uuid: '180F', // Battery Service
        characteristics: [
          {
            uuid: '2A19', // Battery Level
            isReadable: true,
            isNotifiable: true,
            properties: { read: true, notify: true }
          }
        ]
      }
    ];

    // Add device with services containing characteristics
    bleManager.addMockDevice({
      id: 'service-api-test',
      name: 'Service API Test Device',
      services: servicesMetadata,
      isConnectable: true
    });

    // Connect and discover
    await bleManager.connectToDevice('service-api-test');
    await bleManager.discoverAllServicesAndCharacteristicsForDevice('service-api-test');
    
    // Get services - these have async characteristics() method just like real API
    const services = await bleManager.servicesForDevice('service-api-test');
    expect(services.length).toBe(2);
    
    // Test heart rate service
    const heartRateService = services.find((s: any) => s.uuid === serviceUUID);
    expect(heartRateService).toBeDefined();
    expect(heartRateService.deviceID).toBe('service-api-test');
    
    // CRITICAL: This is the same as real BLE API - async characteristics() method!
    expect(typeof heartRateService.characteristics).toBe('function');
    
    const hrCharacteristics = await heartRateService.characteristics();
    expect(Array.isArray(hrCharacteristics)).toBe(true);
    expect(hrCharacteristics.length).toBe(2);
    
    // Verify these are proper Characteristic objects (not metadata)
    const hrMeasurement = hrCharacteristics.find((c: any) => c.uuid === charUUID);
    expect(hrMeasurement).toBeDefined();
    expect(hrMeasurement.serviceUUID).toBe(serviceUUID);
    expect(hrMeasurement.deviceID).toBe('service-api-test');
    expect(hrMeasurement.isReadable).toBe(true);
    expect(hrMeasurement.isNotifiable).toBe(true);
    expect(hrMeasurement.hasOwnProperty('value')).toBe(true); // Has value property
    
    const hrControlPoint = hrCharacteristics.find((c: any) => c.uuid === '2A39');
    expect(hrControlPoint).toBeDefined();
    expect(hrControlPoint.isReadable).toBe(false);
    expect(hrControlPoint.isWritableWithResponse).toBe(true);
    
    // Test battery service
    const batteryService = services.find((s: any) => s.uuid === '180F');
    expect(batteryService).toBeDefined();
    
    const batteryCharacteristics = await batteryService.characteristics();
    expect(batteryCharacteristics.length).toBe(1);
    
    const batteryLevel = batteryCharacteristics[0];
    expect(batteryLevel.uuid).toBe('2A19');
    expect(batteryLevel.serviceUUID).toBe('180F');
    expect(batteryLevel.deviceID).toBe('service-api-test');
    
    // 🎉 SUCCESS: Mock and real APIs now have identical service.characteristics() behavior!
    console.log('✅ Mock Service.characteristics() matches real BLE API');
  });

  it('should support all device-level methods', async () => {
    // Define service structure with comprehensive characteristics
    const servicesMetadata = [
      {
        uuid: serviceUUID, // '180D' Heart Rate Service
        characteristics: [
          {
            uuid: charUUID, // '2A37' Heart Rate Measurement
            isReadable: true,
            isWritableWithResponse: true,
            isWritableWithoutResponse: true,
            isNotifiable: true,
            isIndicatable: false,
            properties: {
              read: true,
              write: true,
              writeWithoutResponse: true,
              notify: true
            }
          }
        ]
      }
    ];

    // Add mock device with all capabilities
    bleManager.addMockDevice({
      id: 'full-methods-test-jest',
      name: 'Full Methods Test Device (Jest)',
      services: servicesMetadata,
      isConnectable: true
    });

    // Start scanning to get device reference
    let deviceFromScan: any = null;
    bleManager.startDeviceScan(null, null, (error: any, device: any) => {
      if (error) return;
      if (device && device.id === 'full-methods-test-jest') {
        deviceFromScan = device;
      }
    });

    // Wait for device to be found
    await new Promise(resolve => setTimeout(resolve, 50));
    bleManager.stopDeviceScan();
    
    expect(deviceFromScan).toBeDefined();
    
    // Verify all device methods exist
    expect(typeof deviceFromScan.discoverAllServicesAndCharacteristics).toBe('function');
    expect(typeof deviceFromScan.isConnected).toBe('function');
    expect(typeof deviceFromScan.cancelConnection).toBe('function');
    expect(typeof deviceFromScan.readCharacteristicForService).toBe('function');
    expect(typeof deviceFromScan.writeCharacteristicWithResponseForService).toBe('function');
    expect(typeof deviceFromScan.writeCharacteristicWithoutResponseForService).toBe('function');
    expect(typeof deviceFromScan.monitorCharacteristicForService).toBe('function');

    // Test isConnected method (should be false before connection)
    let isConnectedBefore = await deviceFromScan.isConnected();
    expect(isConnectedBefore).toBe(false);

    // Connect to device
    const connectedDevice = await bleManager.connectToDevice(deviceFromScan.id);
    
    // Test isConnected method (should be true after connection)
    const isConnectedAfter = await connectedDevice.isConnected();
    expect(isConnectedAfter).toBe(true);
    
    // Discover services and characteristics using device method
    await connectedDevice.discoverAllServicesAndCharacteristics();
    
    // Set up test data for characteristic operations
    const testReadValue = Buffer.from('initial read value').toString('base64');
    bleManager.setCharacteristicValueForReading('full-methods-test-jest', serviceUUID, charUUID, testReadValue);
    
    // Test readCharacteristicForService method
    const readChar = await connectedDevice.readCharacteristicForService(serviceUUID, charUUID);
    expect(readChar.value).toBe(testReadValue);
    expect(readChar.uuid).toBe(charUUID);
    expect(readChar.serviceUUID).toBe(serviceUUID);
    expect(readChar.deviceID).toBe('full-methods-test-jest');
    
    // Test writeCharacteristicWithResponseForService method
    const writeValue1 = Buffer.from('write with response test').toString('base64');
    const writtenChar1 = await connectedDevice.writeCharacteristicWithResponseForService(serviceUUID, charUUID, writeValue1);
    expect(writtenChar1.value).toBe(writeValue1);
    expect(writtenChar1.uuid).toBe(charUUID);
    expect(writtenChar1.serviceUUID).toBe(serviceUUID);
    
    // Test writeCharacteristicWithoutResponseForService method
    const writeValue2 = Buffer.from('write without response test').toString('base64');
    const writtenChar2 = await connectedDevice.writeCharacteristicWithoutResponseForService(serviceUUID, charUUID, writeValue2);
    expect(writtenChar2.value).toBe(writeValue2);
    expect(writtenChar2.uuid).toBe(charUUID);
    expect(writtenChar2.serviceUUID).toBe(serviceUUID);
    
    // Test monitorCharacteristicForService method
    let monitoringNotificationReceived = false;
    let receivedCharacteristic: any = null;
    
    const subscription = connectedDevice.monitorCharacteristicForService(serviceUUID, charUUID, (error: any, characteristic: any) => {
      if (error) {
        throw new Error(`Monitoring error: ${error.message}`);
      }
      if (characteristic) {
        monitoringNotificationReceived = true;
        receivedCharacteristic = characteristic;
      }
    });
    
    // Wait for initial notification (should receive the current value)
    await new Promise(resolve => setTimeout(resolve, 50));
    
    expect(monitoringNotificationReceived).toBe(true);
    expect(receivedCharacteristic).toBeDefined();
    expect(receivedCharacteristic.uuid).toBe(charUUID);
    expect(receivedCharacteristic.serviceUUID).toBe(serviceUUID);
    expect(receivedCharacteristic.deviceID).toBe('full-methods-test-jest');
    
    // Test that monitoring receives new values
    monitoringNotificationReceived = false;
    const newMonitorValue = Buffer.from('new monitoring value').toString('base64');
    bleManager.setCharacteristicValue('full-methods-test-jest', serviceUUID, charUUID, newMonitorValue, { notify: true });
    
    // Wait for notification
    await new Promise(resolve => setTimeout(resolve, 50));
    
    expect(monitoringNotificationReceived).toBe(true);
    expect(receivedCharacteristic.value).toBe(newMonitorValue);
    
    // Clean up monitoring subscription
    subscription.remove();
    
    // Test cancelConnection method
    const disconnectedDevice = await connectedDevice.cancelConnection();
    expect(disconnectedDevice.id).toBe('full-methods-test-jest');
    
    // Verify device is no longer connected using device method
    const isConnectedFinal = await disconnectedDevice.isConnected();
    expect(isConnectedFinal).toBe(false);
    
    // Verify device is no longer connected using manager method
    const isConnectedViaManager = bleManager.isDeviceConnected('full-methods-test-jest');
    expect(isConnectedViaManager).toBe(false);
  });
});
