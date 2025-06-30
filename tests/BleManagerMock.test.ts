import { describe, it, before, after, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert';
import { MockBleManager, MockDevice } from '../src/BleManagerMock';
import { Buffer } from 'buffer';

describe('MockBleManager', () => {
    let bleManager: MockBleManager;
    let heartMonitorId = 'heart-monitor-123';
    let thermoId = 'thermo-456';
    let serviceUUID = '180D';
    let charUUID = '2A37';

    beforeEach(() => {
        bleManager = new MockBleManager();
        // Set faster discovery interval for tests
        bleManager.setDiscoveryInterval(100); // 100ms for faster tests
        // Reset state before each test
        bleManager.setState('PoweredOn');
        bleManager.clearMockDevices();

        // Add mock devices
        bleManager.addMockDevice({
            id: heartMonitorId,
            name: 'Heart Monitor',
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
        [heartMonitorId, thermoId, 'test-device'].forEach(async (id) => {
            try {
                if (bleManager.isDeviceConnected(id)) {
                    await bleManager.cancelDeviceConnection(id);
                }
            } catch (e) {
                // Ignore errors
            }
        });
    });
    it('should manage Bluetooth state', async () => {
        assert.equal(await bleManager.state(), 'PoweredOn');

        const stateChanges: string[] = [];
        const sub = bleManager.onStateChange(state => stateChanges.push(state), true);

        bleManager.setState('PoweredOff');
        bleManager.setState('PoweredOn');

        // Allow event loop to process
        await new Promise(resolve => setImmediate(resolve));

        sub.remove();
        assert.deepEqual(stateChanges, ['PoweredOn', 'PoweredOff', 'PoweredOn']);
    });

    it('should scan for devices', async () => {
        const discoveredDevices: MockDevice[] = [];

        bleManager.startDeviceScan(
            [serviceUUID],
            { allowDuplicates: true },
            (error, device) => {
                if (!error && device) discoveredDevices.push(device);
            }
        );

        // Allow time for simulated discoveries
        await new Promise(resolve => setTimeout(resolve, 10));
        bleManager.stopDeviceScan();

        assert.ok(discoveredDevices.length > 0);
        assert.ok(discoveredDevices.some(d => d.name === 'Heart Monitor'));
        assert.ok(discoveredDevices.some(d => d.name === 'Smart Thermometer'));
    });

    it('should connect and discover services', async () => {
        // Connect to device
        const device = await bleManager.connectToDevice(heartMonitorId);
        assert.equal(device.name, 'Heart Monitor');
        assert.ok(bleManager.isDeviceConnected(heartMonitorId));

        // Discover services
        await bleManager.discoverAllServicesAndCharacteristicsForDevice(heartMonitorId);

        // Verify services
        const services = await bleManager.servicesForDevice(heartMonitorId);
        assert.deepEqual(services.map(s => s.uuid), [serviceUUID, '180F']);
        const servicesAgain = await device.services();
        assert.deepEqual(servicesAgain.map(s => s.uuid), [serviceUUID, '180F']);
    });

    it('should support discoverAllServicesAndCharacteristics on device instances', async () => {
    // Get a device instance (could also be from scanning)
    const device = await bleManager.connectToDevice(heartMonitorId);
    assert.equal(device.name, 'Heart Monitor');
    
    // Verify the method exists
    assert.ok(device.discoverAllServicesAndCharacteristics, 'Method should be attached to device');
    
    // Call the method directly on the device
    const result = await device.discoverAllServicesAndCharacteristics!();
    
    // Verify it returns the device
    assert.strictEqual(result, device);
    
    // Verify services were discovered
    const services = await bleManager.servicesForDevice(heartMonitorId);
    assert.deepEqual(services.map(s => s.uuid), [serviceUUID, '180F']);
});

    it('should monitor characteristic changes', async () => {
        // Setup
        await bleManager.connectToDevice(heartMonitorId);
        await bleManager.discoverAllServicesAndCharacteristicsForDevice(heartMonitorId);

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
            (error, char) => {
                if (!error && char?.value) {
                    const data = Buffer.from(char.value, 'base64');
                    values.push(data[1]);
                }
            }
        );

        // Trigger updates
        bleManager.setCharacteristicValue(heartMonitorId, serviceUUID, charUUID,
            Buffer.from([0x06, 0x52]).toString('base64'));

        bleManager.startSimulatedNotifications(heartMonitorId, serviceUUID, charUUID, 1);

        // Wait for notifications
        await new Promise(resolve => setTimeout(resolve, 20));

        sub.remove();
        bleManager.stopSimulatedNotifications(heartMonitorId, serviceUUID, charUUID);

        assert.ok(values.length >= 1);
        assert.ok(values.includes(72)); // Initial value
        assert.ok(values.includes(82)); // Updated value
    });

    it('should read characteristic values', async () => {
        // Setup
        await bleManager.connectToDevice(heartMonitorId);
        await bleManager.discoverAllServicesAndCharacteristicsForDevice(heartMonitorId);

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
        assert.equal(value, 75);

        // Simulate read error
        bleManager.simulateCharacteristicReadError(
            heartMonitorId,
            serviceUUID,
            charUUID,
            new Error('Read error')
        );

        await assert.rejects(
            () => bleManager.readCharacteristicForDevice(heartMonitorId, serviceUUID, charUUID),
            { message: 'Read error' }
        );
    });

    it('should write characteristic values', async () => {
        // Setup
        await bleManager.connectToDevice(heartMonitorId);
        await bleManager.discoverAllServicesAndCharacteristicsForDevice(heartMonitorId);

        let writtenValue = '';
        const writeListener = bleManager.onCharacteristicWrite(
            heartMonitorId,
            serviceUUID,
            charUUID,
            value => writtenValue = value
        );

        // Successful write
        await bleManager.writeCharacteristicWithResponseForDevice(
            heartMonitorId,
            serviceUUID,
            charUUID,
            Buffer.from([0x01, 0x02]).toString('base64')
        );
        assert.equal(writtenValue, Buffer.from([0x01, 0x02]).toString('base64'));

        // Simulate write error
        bleManager.simulateWriteWithResponseError(
            heartMonitorId,
            serviceUUID,
            charUUID,
            new Error('Write error')
        );

        await assert.rejects(
            () => bleManager.writeCharacteristicWithResponseForDevice(
                heartMonitorId,
                serviceUUID,
                charUUID,
                Buffer.from([0x03, 0x04]).toString('base64')
            ),
            { message: 'Write error' }
        );

        writeListener.remove();
    });

    it('should handle device disconnections', async () => {
        // Setup
        await bleManager.connectToDevice(heartMonitorId);

        let disconnectError: Error | null = null;
        const sub = bleManager.onDeviceDisconnected(
            heartMonitorId,
            (error: Error | null, _) => disconnectError = error
        );

        // Simulate disconnection
        bleManager.simulateDeviceDisconnection(heartMonitorId, new Error('Connection lost'));
        await new Promise(resolve => setTimeout(resolve, 1));

        assert.ok(disconnectError);
        assert.equal((disconnectError as Error).message, 'Connection lost');
        assert.ok(!bleManager.isDeviceConnected(heartMonitorId));

        sub.remove();
    });

    it('should negotiate MTU', async () => {
        bleManager.setDeviceMaxMTU(heartMonitorId, 150);

        // MTU during connection
        const device = await bleManager.connectToDevice(heartMonitorId, { requestMTU: 200 });
        assert.equal(device.mtu, 150);

        // MTU change after connection
        const updatedDevice = await bleManager.requestMTUForDevice(heartMonitorId, 100);
        assert.equal(updatedDevice.mtu, 100);
    });

    it('should restore state', async () => {
        // Create first manager with state restoration
        let firstRestorationState: any = null;
        const manager1 = new MockBleManager({
            restoreStateIdentifier: 'test',
            restoreStateFunction: (state) => {
                assert.equal(state, null); // First creation
            }
        });

        // Wait for initial restoration
        await new Promise(resolve => setImmediate(resolve));
        assert.equal(firstRestorationState, null); // First creation should be null

        // Connect a device
        manager1.addMockDevice({
            id: heartMonitorId,
            name: 'Heart Monitor',
            isConnectable: true
        });
        await manager1.connectToDevice(heartMonitorId);

        // Create second manager to restore state
        let restoredDevices: string[] = [];
        const manager2 = new MockBleManager({
            restoreStateIdentifier: 'test',
            restoreStateFunction: (state) => {
                if (state) {
                    restoredDevices = state.connectedPeripherals
                        .map(d => d.name)
                        .filter((name): name is string => typeof name === 'string');
                }
            }
        });

        // Allow restoration to happen
        await new Promise(resolve => setTimeout(resolve, 1));
        assert.deepEqual(restoredDevices, ['Heart Monitor']);
    });

    it('should handle explicit scan errors', async () => {
        const errors: Error[] = [];
        const devices: MockDevice[] = [];

        // Start scanning
        bleManager.startDeviceScan(
            null,
            null,
            (error, device) => {
                if (error) errors.push(error);
                if (device) devices.push(device);
            }
        );

        // Simulate a scan error
        const testError = new Error('Simulated scan error');
        bleManager.simulateScanError(testError);

        // Allow time for the error to propagate
        await new Promise(resolve => setTimeout(resolve, 850));

        // Add a device to ensure normal operation continues after error
        bleManager.addMockDevice({
            id: 'test-device',
            name: 'Test Device',
            isConnectable: true
        });

        // Allow time for device discovery
        await new Promise(resolve => setTimeout(resolve, 20));
        bleManager.stopDeviceScan();

        // Verify error was received
        assert.strictEqual(errors.length, 1, 'Should receive one error');
        assert.strictEqual(errors[0].message, 'Simulated scan error', 'Should receive correct error message');
        assert.ok(devices.length > 0, 'Should still receive normal devices');
    });

    it('should handle connection errors', async () => {
        // Simulate a connection error
        const testError = new Error('Connection failed');
        bleManager.simulateConnectionError(heartMonitorId, testError);

        // Attempt to connect
        try {
            await bleManager.connectToDevice(heartMonitorId);
            assert.fail('Should have thrown an error');
        } catch (error) {
            assert.strictEqual((error as Error).message, 'Connection failed');
        }

        // Clear error and verify normal connection works
        bleManager.clearConnectionError(heartMonitorId);
        const device = await bleManager.connectToDevice(heartMonitorId);
        assert.strictEqual(device.name, 'Heart Monitor');
    });

    it('should handle disconnection errors', async () => {
        // First connect normally
        await bleManager.connectToDevice(heartMonitorId);

        // Simulate disconnection error
        const testError = new Error('Disconnection failed');
        bleManager.simulateDisconnectionError(heartMonitorId, testError);

        // Listen for disconnection
        const disconnectEvents: Error[] = [];
        const sub = bleManager.onDeviceDisconnected(
            heartMonitorId,
            (error) => {
                if (error) disconnectEvents.push(error);
            }
        );

        // Attempt to disconnect (should trigger error)
        try {
            await bleManager.cancelDeviceConnection(heartMonitorId);
            assert.fail('Disconnection should have failed');
        } catch (error) {
            assert.strictEqual((error as Error).message, 'Disconnection failed');
        }
        sub.remove();

        // Verify error was received
        assert.strictEqual(disconnectEvents.length, 1);
        assert.strictEqual(disconnectEvents[0].message, 'Disconnection failed');

    });

    it('should handle characteristic read errors', async () => {
        // Setup
        await bleManager.connectToDevice(heartMonitorId);
        await bleManager.discoverAllServicesAndCharacteristicsForDevice(heartMonitorId);

        // Simulate read error
        const testError = new Error('Read failed');
        bleManager.simulateCharacteristicReadError(
            heartMonitorId,
            serviceUUID,
            charUUID,
            testError
        );

        // Attempt to read
        try {
            await bleManager.readCharacteristicForDevice(
                heartMonitorId,
                serviceUUID,
                charUUID
            );
            assert.fail('Should have thrown an error');
        } catch (error) {
            assert.strictEqual((error as Error).message, 'Read failed');
        }

        // Clear error and verify normal read works
        bleManager.clearCharacteristicReadError(
            heartMonitorId,
            serviceUUID,
            charUUID
        );
        bleManager.setCharacteristicValueForReading(
            heartMonitorId,
            serviceUUID,
            charUUID,
            'test-value'
        );
        const char = await bleManager.readCharacteristicForDevice(
            heartMonitorId,
            serviceUUID,
            charUUID
        );
        assert.strictEqual(char.value, 'test-value');
    });

    it('should handle characteristic write errors', async () => {
        // Setup
        await bleManager.connectToDevice(heartMonitorId);
        await bleManager.discoverAllServicesAndCharacteristicsForDevice(heartMonitorId);

        // Simulate write error
        const testError = new Error('Write failed');
        bleManager.simulateWriteWithResponseError(
            heartMonitorId,
            serviceUUID,
            charUUID,
            testError
        );

        // Attempt to write
        try {
            await bleManager.writeCharacteristicWithResponseForDevice(
                heartMonitorId,
                serviceUUID,
                charUUID,
                'test-value'
            );
            assert.fail('Should have thrown an error');
        } catch (error) {
            assert.strictEqual((error as Error).message, 'Write failed');
        }

        // Clear error and verify normal write works
        bleManager.clearWriteWithResponseError(
            heartMonitorId,
            serviceUUID,
            charUUID
        );
        await bleManager.writeCharacteristicWithResponseForDevice(
            heartMonitorId,
            serviceUUID,
            charUUID,
            'test-value'
        );
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

        // Verify all cleared
        bleManager.startDeviceScan(null, null, (error) => {
            assert.strictEqual(error, null, 'Scan error should be cleared');
        });

        try {
            await bleManager.connectToDevice(heartMonitorId);
        } catch (error) {
            assert.fail('Connection error should be cleared');
        }

        try {
            await bleManager.readCharacteristicForDevice(
                heartMonitorId,
                serviceUUID,
                charUUID
            );
        } catch (error) {
            assert.fail('Read error should be cleared');
        }
    });

    it('should handle Buffer convenience methods', async () => {
        // Setup
        await bleManager.connectToDevice(heartMonitorId);
        await bleManager.discoverAllServicesAndCharacteristicsForDevice(heartMonitorId);

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
        assert.strictEqual(char1.value, bufferValue.toString('base64'));

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
        assert.strictEqual(char2.value, expectedBase64);
    });

    it('should handle write without response operations', async () => {
        // Setup
        await bleManager.connectToDevice(heartMonitorId);
        await bleManager.discoverAllServicesAndCharacteristicsForDevice(heartMonitorId);

        let writtenValue = '';
        const writeListener = bleManager.onCharacteristicWrite(
            heartMonitorId,
            serviceUUID,
            charUUID,
            value => writtenValue = value
        );

        // Test normal write without response
        const testValue = Buffer.from([0x01, 0x02]).toString('base64');
        await bleManager.writeCharacteristicWithoutResponseForDevice(
            heartMonitorId,
            serviceUUID,
            charUUID,
            testValue
        );
        assert.strictEqual(writtenValue, testValue);

        // Test write without response error simulation
        const testError = new Error('Write without response failed');
        bleManager.simulateWriteWithoutResponseError(
            heartMonitorId,
            serviceUUID,
            charUUID,
            testError
        );

        await assert.rejects(
            () => bleManager.writeCharacteristicWithoutResponseForDevice(
                heartMonitorId,
                serviceUUID,
                charUUID,
                testValue
            ),
            { message: 'Write without response failed' }
        );

        // Test clearing write without response error
        bleManager.clearWriteWithoutResponseError(
            heartMonitorId,
            serviceUUID,
            charUUID
        );

        // Should work again after clearing error
        await bleManager.writeCharacteristicWithoutResponseForDevice(
            heartMonitorId,
            serviceUUID,
            charUUID,
            testValue
        );

        writeListener.remove();
    });

    it('should handle write operation delays', async () => {
        // Setup
        await bleManager.connectToDevice(heartMonitorId);
        await bleManager.discoverAllServicesAndCharacteristicsForDevice(heartMonitorId);

        const testValue = Buffer.from([0x01, 0x02]).toString('base64');

        // Test write with response delay
        bleManager.setWriteWithResponseDelay(
            heartMonitorId,
            serviceUUID,
            charUUID,
            50 // 50ms delay
        );

        const startTime = Date.now();
        await bleManager.writeCharacteristicWithResponseForDevice(
            heartMonitorId,
            serviceUUID,
            charUUID,
            testValue
        );
        const elapsedTime = Date.now() - startTime;
        assert.ok(elapsedTime >= 45, 'Should have at least 45ms delay'); // Allow some margin

        // Test write without response delay
        bleManager.setWriteWithoutResponseDelay(
            heartMonitorId,
            serviceUUID,
            charUUID,
            30 // 30ms delay
        );

        const startTime2 = Date.now();
        await bleManager.writeCharacteristicWithoutResponseForDevice(
            heartMonitorId,
            serviceUUID,
            charUUID,
            testValue
        );
        const elapsedTime2 = Date.now() - startTime2;
        assert.ok(elapsedTime2 >= 25, 'Should have at least 25ms delay'); // Allow some margin
    });

    it('should properly destroy and clean up resources', async () => {
        // Setup with connections and monitoring
        await bleManager.connectToDevice(heartMonitorId);
        await bleManager.connectToDevice(thermoId);
        await bleManager.discoverAllServicesAndCharacteristicsForDevice(heartMonitorId);

        // Set up monitoring
        bleManager.setCharacteristicValueForReading(
            heartMonitorId,
            serviceUUID,
            charUUID,
            'test-value'
        );

        const monitoringSub = bleManager.monitorCharacteristicForDevice(
            heartMonitorId,
            serviceUUID,
            charUUID,
            () => {} // Empty listener
        );

        // Start scanning
        bleManager.startDeviceScan(null, null, () => {});

        // Start simulated notifications
        bleManager.startSimulatedNotifications(
            heartMonitorId,
            serviceUUID,
            charUUID,
            10 // 10ms intervals
        );

        // Verify devices are connected
        assert.ok(bleManager.isDeviceConnected(heartMonitorId));
        assert.ok(bleManager.isDeviceConnected(thermoId));

        // Listen for disconnection events
        const disconnectionEvents: string[] = [];
        const disconnectSub1 = bleManager.onDeviceDisconnected(
            heartMonitorId,
            (error) => {
                if (error && error.message === 'Manager destroyed') {
                    disconnectionEvents.push(heartMonitorId);
                }
            }
        );
        const disconnectSub2 = bleManager.onDeviceDisconnected(
            thermoId,
            (error) => {
                if (error && error.message === 'Manager destroyed') {
                    disconnectionEvents.push(thermoId);
                }
            }
        );

        // Call destroy
        bleManager.destroy();

        // Allow cleanup to complete
        await new Promise(resolve => setTimeout(resolve, 20));

        // Verify all devices were disconnected
        assert.ok(!bleManager.isDeviceConnected(heartMonitorId));
        assert.ok(!bleManager.isDeviceConnected(thermoId));
        assert.strictEqual(disconnectionEvents.length, 2);
        assert.ok(disconnectionEvents.includes(heartMonitorId));
        assert.ok(disconnectionEvents.includes(thermoId));

        // Verify scanning stopped
        // Note: We can't directly test internal state, but destroy should have stopped scanning

        // Clean up subscriptions
        monitoringSub.remove();
        disconnectSub1.remove();
        disconnectSub2.remove();
    });

    it('should handle connection and disconnection delays', async () => {
        // Test connection delay
        bleManager.setConnectionDelay(heartMonitorId, 30);
        
        const startTime = Date.now();
        await bleManager.connectToDevice(heartMonitorId);
        const elapsedTime = Date.now() - startTime;
        assert.ok(elapsedTime >= 25, 'Should have at least 25ms connection delay');
        
        assert.ok(bleManager.isDeviceConnected(heartMonitorId));
        
        // Test disconnection (no specific delay method, but testing the flow)
        await bleManager.cancelDeviceConnection(heartMonitorId);
        assert.ok(!bleManager.isDeviceConnected(heartMonitorId));
    });

    it('should handle characteristic error simulation during monitoring', async () => {
        // Setup
        await bleManager.connectToDevice(heartMonitorId);
        await bleManager.discoverAllServicesAndCharacteristicsForDevice(heartMonitorId);

        let receivedError: Error | null = null;
        const monitoringSub = bleManager.monitorCharacteristicForDevice(
            heartMonitorId,
            serviceUUID,
            charUUID,
            (error, char) => {
                if (error) receivedError = error;
            }
        );

        // Simulate characteristic error
        const testError = new Error('Characteristic monitoring error');
        bleManager.simulateCharacteristicError(
            heartMonitorId,
            serviceUUID,
            charUUID,
            testError
        );

        // Allow error to propagate
        await new Promise(resolve => setTimeout(resolve, 1));

        assert.ok(receivedError);
        assert.strictEqual((receivedError as Error).message, 'Characteristic monitoring error');

        monitoringSub.remove();
    });

    it('should handle edge cases in notifications', async () => {
        // Setup
        await bleManager.connectToDevice(heartMonitorId);
        await bleManager.discoverAllServicesAndCharacteristicsForDevice(heartMonitorId);

        // Test notifications without listeners (should not crash)
        bleManager.setCharacteristicValueForReading(
            heartMonitorId,
            serviceUUID,
            charUUID,
            'test-value'
        );

        bleManager.startSimulatedNotifications(
            heartMonitorId,
            serviceUUID,
            charUUID,
            5 // 5ms intervals
        );

        // Wait a bit then stop
        await new Promise(resolve => setTimeout(resolve, 10));
        bleManager.stopSimulatedNotifications(
            heartMonitorId,
            serviceUUID,
            charUUID
        );

        // Test stopping notifications that don't exist (should not crash)
        bleManager.stopSimulatedNotifications(
            'non-existent-device',
            'non-existent-service',
            'non-existent-char'
        );
    });
});
