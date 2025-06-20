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

    before(() => {
        bleManager = new MockBleManager();
    });

    beforeEach(() => {
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
});