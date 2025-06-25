export type State =
    | 'Unknown'
    | 'Resetting'
    | 'Unsupported'
    | 'Unauthorized'
    | 'PoweredOff'
    | 'PoweredOn';

export type UUID = string;
export type DeviceId = string;
export type TransactionId = string | null;

export interface ScanOptions {
    allowDuplicates?: boolean;
}

export interface ConnectionOptions {
    autoConnect?: boolean;
    requestMTU?: number;
}

export interface MockDevice {
    id: string;
    name?: string | null;
    rssi?: number | null;
    mtu?: number;
    manufacturerData?: string | null;
    serviceData?: Record<string, string> | null;
    serviceUUIDs?: string[] | null;
    isConnectable?: boolean; // Added for connection simulation
    discoverAllServicesAndCharacteristics?: () => Promise<MockDevice>;
}

export interface Characteristic {
    uuid: UUID;
    serviceUUID: UUID;
    deviceID: DeviceId;
    value: string | null;
    isNotifiable: boolean;
    isIndicatable: boolean;
}
export interface Service {
    uuid: UUID;
    deviceID: DeviceId;
    // Add other properties as needed
}

export interface CharacteristicMetadata {
    uuid: UUID;
    isReadable?: boolean;
    isWritableWithResponse?: boolean;
    isWritableWithoutResponse?: boolean;
    isNotifiable?: boolean;
    // Add other properties as needed
}

export interface ServiceMetadata {
    uuid: UUID;
    characteristics: CharacteristicMetadata[];
}
export interface MtuChangedListener {
    (mtu: number): void;
}
export interface RestoredState {
    connectedPeripherals: MockDevice[];
}

export interface BleManagerOptions {
    restoreStateIdentifier?: string;
    restoreStateFunction?: (restoredState: RestoredState | null) => void;
}

type StateChangeListener = (state: State) => void;
type Subscription = { remove: () => void };
type DeviceScanListener = (error: Error | null, device: MockDevice | null) => void;
type CharacteristicListener = (error: Error | null, characteristic: Characteristic | null) => void;
type MonitorSubscription = { remove: () => void };
type ConnectionListener = (error: Error | null, device: MockDevice | null) => void;

// Static store for restored state
const restoredStateStore: Map<string, RestoredState> = new Map();

export class MockBleManager {
    // State management
    private currentState: State = 'PoweredOn';
    private stateListeners: StateChangeListener[] = [];

    // Scanning
    private scanListener: DeviceScanListener | null = null;
    private isScanning = false;
    private discoveredDevices: Map<string, MockDevice> = new Map();
    private scanOptions: ScanOptions = {};
    private scanUUIDs: string[] | null = null;
    private scanInterval: NodeJS.Timeout | null = null;
    private discoveryInterval: number = 800; // Default discovery interval in ms

    // Characteristic monitoring
    private monitoredCharacteristics: Map<string, CharacteristicListener[]> = new Map();
    private characteristicValues: Map<string, string> = new Map();
    private notificationIntervals: Map<string, NodeJS.Timeout> = new Map();

    // properties for read operations
    private readDelays: Map<string, number> = new Map();
    private readErrors: Map<string, Error> = new Map();

    // properties for write operations
    private writeWithResponseDelays: Map<string, number> = new Map();
    private writeWithoutResponseDelays: Map<string, number> = new Map();
    private writeWithResponseErrors: Map<string, Error> = new Map();
    private writeWithoutResponseErrors: Map<string, Error> = new Map();
    private writeListeners: Map<string, (value: string) => void> = new Map();

    // Connection management
    private connectedDevices: Set<DeviceId> = new Set();
    private connectionListeners: Map<DeviceId, ConnectionListener[]> = new Map();
    private connectionDelays: Map<DeviceId, number> = new Map();
    private connectionErrors: Map<DeviceId, Error> = new Map();
    private disconnectionErrors: Map<DeviceId, Error> = new Map();

    // Background mode
    private restoreStateIdentifier?: string;
    private restoreStateFunction?: (restoredState: RestoredState | null) => void;

    // For error simulation
    private scanErrorSimulation: Error | null = null;

    constructor(options?: BleManagerOptions) {
        if (options) {
            this.restoreStateIdentifier = options.restoreStateIdentifier;
            this.restoreStateFunction = options.restoreStateFunction;

            if (this.restoreStateIdentifier && this.restoreStateFunction) {
                // Simulate iOS state restoration
                setImmediate(() => {
                    const restoredState = restoredStateStore.get(this.restoreStateIdentifier!);
                    this.restoreStateFunction!(restoredState || null);
                });
            }
        }
    }

    /**
     * Simulate a scan error on next discovery event
     */
    simulateScanError(error: Error) {
        this.scanErrorSimulation = error;
    }

    /**
     * Clear simulated scan errors
     */
    clearScanError() {
        this.scanErrorSimulation = null;
    }

    clearAllSimulatedErrors() {
        this.scanErrorSimulation = null;
        this.connectionErrors.clear();
        this.readErrors.clear();
        this.writeWithResponseErrors.clear();
        this.writeWithoutResponseErrors.clear();
        this.disconnectionErrors.clear();
    }
    /**
     * Simulate iOS state restoration by saving connected devices
     */
    private saveRestorationState() {
        if (!this.restoreStateIdentifier) return;

        const connectedDevices = Array.from(this.connectedDevices).map(id => {
            const device = this.discoveredDevices.get(id);
            return { ...device! }; // Return a copy
        });

        restoredStateStore.set(this.restoreStateIdentifier, {
            connectedPeripherals: connectedDevices
        });
    }

    // MTU management
    private mtuListeners: Map<DeviceId, MtuChangedListener[]> = new Map();
    private deviceMaxMTUs: Map<DeviceId, number> = new Map();

    // ======================
    // MTU Negotiation
    // ======================

    /**
     * Set the maximum MTU a device can support
     */
    setDeviceMaxMTU(deviceId: DeviceId, maxMTU: number) {
        this.deviceMaxMTUs.set(deviceId, maxMTU);
    }

    /**
     * Request MTU change during connection
     */
    async requestMTUForDevice(
        deviceIdentifier: DeviceId,
        mtu: number
    ): Promise<MockDevice> {
        // Ensure device is connected
        if (!this.isDeviceConnected(deviceIdentifier)) {
            throw new Error('Device not connected');
        }

        const device = this.discoveredDevices.get(deviceIdentifier);
        if (!device) {
            throw new Error('Device not found');
        }

        // Get device's maximum supported MTU
        const maxMTU = this.deviceMaxMTUs.get(deviceIdentifier) || 512;

        // Determine actual MTU (minimum of requested and max supported)
        const actualMTU = Math.min(mtu, maxMTU);

        // Update device MTU
        device.mtu = actualMTU;

        // Notify MTU listeners
        this.notifyMTUChange(deviceIdentifier, actualMTU);

        return device;
    }

    /**
     * Listen for MTU changes
     */
    onMTUChanged(
        deviceIdentifier: DeviceId,
        listener: MtuChangedListener
    ): Subscription {
        if (!this.mtuListeners.has(deviceIdentifier)) {
            this.mtuListeners.set(deviceIdentifier, []);
        }

        const listeners = this.mtuListeners.get(deviceIdentifier)!;
        listeners.push(listener);

        return {
            remove: () => {
                const updatedListeners = listeners.filter(l => l !== listener);
                if (updatedListeners.length === 0) {
                    this.mtuListeners.delete(deviceIdentifier);
                } else {
                    this.mtuListeners.set(deviceIdentifier, updatedListeners);
                }
            }
        };
    }

    /**
     * Notify MTU listeners
     */
    private notifyMTUChange(deviceId: DeviceId, mtu: number) {
        const listeners = this.mtuListeners.get(deviceId) || [];
        listeners.forEach(listener => listener(mtu));
    }

    // Service discovery
    private deviceServicesMetadata: Map<DeviceId, ServiceMetadata[]> = new Map();
    private discoveredServices: Map<DeviceId, Service[]> = new Map();

    // ======================
    // Service Discovery
    // ======================

    /**
     * Set services and characteristics metadata for a device
     */
    setDeviceServices(
        deviceId: DeviceId,
        services: ServiceMetadata[]
    ) {
        this.deviceServicesMetadata.set(deviceId, services);
    }

    /**
     * Discover all services and characteristics for a device
     */
    async discoverAllServicesAndCharacteristicsForDevice(
        deviceIdentifier: DeviceId
    ): Promise<MockDevice> {
        // Ensure device is connected
        if (!this.isDeviceConnected(deviceIdentifier)) {
            throw new Error('Device not connected');
        }

        const device = this.discoveredDevices.get(deviceIdentifier);
        if (!device) {
            throw new Error('Device not found');
        }

        // Get services metadata
        const servicesMetadata = this.deviceServicesMetadata.get(deviceIdentifier) || [];

        // Create service objects
        const services: Service[] = servicesMetadata.map(service => ({
            uuid: service.uuid,
            deviceID: deviceIdentifier
        }));

        // Store discovered services
        this.discoveredServices.set(deviceIdentifier, services);

        return device;
    }

    /**
     * Get discovered services for a device
     */
    async servicesForDevice(
        deviceIdentifier: DeviceId
    ): Promise<Service[]> {
        if (!this.discoveredServices.has(deviceIdentifier)) {
            throw new Error('Services not discovered for device');
        }

        return this.discoveredServices.get(deviceIdentifier) || [];
    }

    /**
     * Get characteristics for a service
     */
    async characteristicsForService(
        serviceUUID: UUID,
        deviceIdentifier: DeviceId
    ): Promise<CharacteristicMetadata[]> {
        const servicesMetadata = this.deviceServicesMetadata.get(deviceIdentifier) || [];
        const service = servicesMetadata.find(s => s.uuid === serviceUUID);

        if (!service) {
            throw new Error(`Service ${serviceUUID} not found`);
        }

        return service.characteristics;
    }



    // ======================
    // State Management
    // ======================
    async state(): Promise<State> {
        return this.currentState;
    }

    setState(newState: State) {
        this.currentState = newState;
        this.stateListeners.forEach(listener => listener(newState));

        // Automatically stop scanning when not powered on
        if (newState !== 'PoweredOn' && this.isScanning) {
            this.stopDeviceScan();
        }

        // Disconnect all devices when Bluetooth is powered off
        if (newState === 'PoweredOff') {
            Array.from(this.connectedDevices).forEach(deviceId => {
                this.simulateDeviceDisconnection(
                    deviceId,
                    new Error('Bluetooth powered off')
                );
            });
        }
    }

    onStateChange(
        listener: StateChangeListener,
        emitCurrentState: boolean = false
    ): Subscription {
        this.stateListeners.push(listener);

        if (emitCurrentState) {
            // Emit current state immediately
            listener(this.currentState);
        }

        return {
            remove: () => {
                this.stateListeners = this.stateListeners.filter(l => l !== listener);
            }
        };
    }

    // ======================
    // Connection Management
    // ======================

    /**
     * Connect to a device
     */
    async connectToDevice(
        deviceIdentifier: DeviceId,
        options?: ConnectionOptions
    ): Promise<MockDevice> {
        // Ensure Bluetooth is on
        if (this.currentState !== 'PoweredOn') {
            throw new Error('Bluetooth is not powered on');
        }

        const device = this.discoveredDevices.get(deviceIdentifier);
        if (!device) {
            throw new Error(`Device ${deviceIdentifier} not found`);
        }

        if (device.isConnectable === false) {
            throw new Error(`Device ${deviceIdentifier} is not connectable`);
        }

        // Check for simulated connection error
        if (this.connectionErrors.has(deviceIdentifier)) {
            const error = this.connectionErrors.get(deviceIdentifier)!;
            throw error;
        }

        // Get connection delay
        const delay = this.connectionDelays.get(deviceIdentifier) || 0;

        // Simulate connection time
        if (delay > 0) {
            await new Promise(resolve => setTimeout(resolve, delay));
        }

        // Update MTU if requested
        if (options?.requestMTU) {
            // Get device's maximum supported MTU
            const maxMTU = this.deviceMaxMTUs.get(deviceIdentifier) || 512;

            // Determine actual MTU (minimum of requested and max supported)
            const actualMTU = Math.min(options.requestMTU, maxMTU);

            // Update device MTU
            device.mtu = actualMTU;

            // Notify MTU listeners
            this.notifyMTUChange(deviceIdentifier, actualMTU);
        }

        // Mark device as connected
        this.connectedDevices.add(deviceIdentifier);

        // Notify connection listeners
        this.notifyConnectionListeners(deviceIdentifier, null, device);

        // Save restoration state
        this.saveRestorationState();

        return device;
    }

    /**
     * Disconnect from a device
     */
    async cancelDeviceConnection(deviceIdentifier: DeviceId): Promise<MockDevice> {
        const device = this.discoveredDevices.get(deviceIdentifier);
        if (!device) {
            throw new Error(`Device ${deviceIdentifier} not found`);
        }

        // Check if device is connected
        if (!this.connectedDevices.has(deviceIdentifier)) {
            throw new Error(`Device ${deviceIdentifier} is not connected`);
        }
        // Check if it should fail with an error
        if (this.disconnectionErrors.has(deviceIdentifier)) {
            const error = this.disconnectionErrors.get(deviceIdentifier)!;
            this.notifyConnectionListeners(deviceIdentifier, error, device);
            throw error;
        }

        // Remove from connected devices
        this.connectedDevices.delete(deviceIdentifier);

        // Notify disconnection listeners
        this.notifyConnectionListeners(
            deviceIdentifier,
            this.disconnectionErrors.get(deviceIdentifier) || null,
            device
        );
        // Clear discovered services
        this.discoveredServices.delete(deviceIdentifier);

        // Save restoration state
        this.saveRestorationState();

        return device;
    }

    /**
     * Check if a device is connected
     */
    isDeviceConnected(deviceIdentifier: DeviceId): boolean {
        return this.connectedDevices.has(deviceIdentifier);
    }

    /**
     * Listen for connection state changes
     */
    onDeviceDisconnected(
        deviceIdentifier: DeviceId,
        listener: ConnectionListener
    ): Subscription {
        if (!this.connectionListeners.has(deviceIdentifier)) {
            this.connectionListeners.set(deviceIdentifier, []);
        }

        const listeners = this.connectionListeners.get(deviceIdentifier)!;
        listeners.push(listener);

        return {
            remove: () => {
                const updatedListeners = listeners.filter(l => l !== listener);
                if (updatedListeners.length === 0) {
                    this.connectionListeners.delete(deviceIdentifier);
                } else {
                    this.connectionListeners.set(deviceIdentifier, updatedListeners);
                }
            }
        };
    }

    /**
     * Simulate a device disconnection (e.g., out of range)
     */
    simulateDeviceDisconnection(deviceIdentifier: DeviceId, error?: Error) {
        if (this.connectedDevices.has(deviceIdentifier)) {
            this.connectedDevices.delete(deviceIdentifier);

            // Clear discovered services
            this.discoveredServices.delete(deviceIdentifier);

            const device = this.discoveredDevices.get(deviceIdentifier);
            this.notifyConnectionListeners(
                deviceIdentifier,
                error || new Error('Simulated disconnection'),
                device || null
            );
        }
    }

    /**
     * Simulate a connection error
     */
    simulateConnectionError(deviceIdentifier: DeviceId, error: Error) {
        this.connectionErrors.set(deviceIdentifier, error);
    }

    /**
     * Clear connection error
     */
    clearConnectionError(deviceIdentifier: DeviceId) {
        this.connectionErrors.delete(deviceIdentifier);
    }

    /**
     * Simulate a disconnection error
     */
    simulateDisconnectionError(deviceIdentifier: DeviceId, error: Error) {
        this.disconnectionErrors.set(deviceIdentifier, error);
    }

    /**
     * Clear disconnection error
     */
    clearDisconnectionError(deviceIdentifier: DeviceId) {
        this.disconnectionErrors.delete(deviceIdentifier);
    }

    /**
     * Set connection delay
     */
    setConnectionDelay(deviceIdentifier: DeviceId, delayMs: number) {
        this.connectionDelays.set(deviceIdentifier, delayMs);
    }

    /**
     * Notify connection listeners
     */
    private notifyConnectionListeners(
        deviceIdentifier: DeviceId,
        error: Error | null,
        device: MockDevice | null
    ) {
        const listeners = this.connectionListeners.get(deviceIdentifier) || [];
        listeners.forEach(listener => listener(error, device));
    }

    // ======================
    // Device Scanning
    // ======================
    addMockDevice(device: MockDevice) {
        // Default to connectable if not specified
        if (device.isConnectable === undefined) {
            device.isConnectable = true;
        }
        // Attach discovery method
        const mockDevice: MockDevice = {
            ...device,
            discoverAllServicesAndCharacteristics: () => {
                return this.discoverAllServicesAndCharacteristicsForDevice(device.id);
            }
        };
        this.discoveredDevices.set(device.id, mockDevice);
        // Automatically create service metadata
        if (device.serviceUUIDs) {
            const servicesMetadata: ServiceMetadata[] = device.serviceUUIDs.map(uuid => ({
                uuid,
                characteristics: []
            }));
            this.setDeviceServices(device.id, servicesMetadata);
        }
    }

    removeMockDevice(deviceId: string) {
        this.discoveredDevices.delete(deviceId);
    }

    clearMockDevices() {
        this.discoveredDevices.clear();
    }
    /**
     * Update a mock device's properties
     */
    updateMockDevice(deviceId: string, updates: Partial<MockDevice>) {
        const device = this.discoveredDevices.get(deviceId);
        if (device) {
            this.discoveredDevices.set(deviceId, { ...device, ...updates });

        } else {
            throw new Error(`Device ${deviceId} not found`);
        }
    }

    startDeviceScan(
        UUIDs: string[] | null,
        options: ScanOptions | null,
        listener: DeviceScanListener
    ) {
        if (this.isScanning) {
            throw new Error('Scan already in progress');
        }

        this.isScanning = true;
        this.scanListener = listener;
        this.scanOptions = options || {};
        this.scanUUIDs = UUIDs;

        this.simulateDeviceDiscovery();
    }

    stopDeviceScan() {
        this.isScanning = false;
        this.scanListener = null;

        if (this.scanInterval) {
            clearInterval(this.scanInterval);
            this.scanInterval = null;
        }
    }

    private simulateDeviceDiscovery() {
        // Remove UUID filtering - send all devices in initial batch
        const devices = Array.from(this.discoveredDevices.values());

        // Send initial devices (all devices, ignoring scan UUIDs)
        devices.forEach(device => {
            if (this.scanListener) {
                this.scanListener(null, device);
            }
        });

        // Helper to start the interval
        const startInterval = () => {
            if (this.scanInterval) {
                clearInterval(this.scanInterval);
            }
            this.scanInterval = setInterval(() => {
                if (!this.isScanning || !this.scanListener) return;
                // Simulate error if requested
                if (this.scanErrorSimulation) {
                    this.scanListener(this.scanErrorSimulation, null);
                    this.scanErrorSimulation = null; // Clear after firing
                    return;
                }
                // Send random device (with duplicates allowed)
                if (this.discoveredDevices.size > 0) {
                    const randomIndex = Math.floor(Math.random() * this.discoveredDevices.size);
                    const randomDevice = Array.from(this.discoveredDevices.values())[randomIndex];

                    if (this.scanOptions.allowDuplicates || Math.random() > 0.7) {
                        this.scanListener(null, randomDevice);
                    }
                }
            }, this.discoveryInterval);
        };

        startInterval();
    }

    /**
     * Set the discovery interval (ms) and restart the scan interval if scanning
     */
    setDiscoveryInterval(interval: number): void {
        this.discoveryInterval = interval;
        if (this.isScanning) {
            // Restart the scan interval with the new value
            if (this.scanInterval) {
                clearInterval(this.scanInterval);
                this.scanInterval = null;
            }
            // Re-run simulateDeviceDiscovery to restart interval
            this.simulateDeviceDiscovery();
        }
    }
    // ======================
    // Characteristic Reading
    // ======================
    async readCharacteristicForDevice(
        deviceIdentifier: DeviceId,
        serviceUUID: UUID,
        characteristicUUID: UUID,
        transactionId: TransactionId = null
    ): Promise<Characteristic> {
        // Ensure device is connected
        if (!this.isDeviceConnected(deviceIdentifier)) {
            throw new Error(`Device ${deviceIdentifier} is not connected`);
        }

        const key = this.getCharacteristicKey(deviceIdentifier, serviceUUID, characteristicUUID);

        // Check if we should simulate an error for this characteristic
        if (this.readErrors.has(key)) {
            const error = this.readErrors.get(key)!;
            return this.simulateReadOperation(key, () => Promise.reject(error));
        }

        // Get the current value
        const value = this.characteristicValues.get(key) || null;

        return this.simulateReadOperation(key, () => Promise.resolve({
            uuid: characteristicUUID,
            serviceUUID,
            deviceID: deviceIdentifier,
            value,
            isNotifiable: true,
            isIndicatable: false
        }));
    }

    /**
     * Set mock characteristic value for reading
     */
    setCharacteristicValueForReading(
        deviceIdentifier: DeviceId,
        serviceUUID: UUID,
        characteristicUUID: UUID,
        value: string
    ) {
        const key = this.getCharacteristicKey(deviceIdentifier, serviceUUID, characteristicUUID);
        this.characteristicValues.set(key, value);
    }

    /**
     * Simulate a read error for a characteristic
     */
    simulateCharacteristicReadError(
        deviceIdentifier: DeviceId,
        serviceUUID: UUID,
        characteristicUUID: UUID,
        error: Error
    ) {
        const key = this.getCharacteristicKey(deviceIdentifier, serviceUUID, characteristicUUID);
        this.readErrors.set(key, error);
    }

    /**
     * Clear simulated read error for a characteristic
     */
    clearCharacteristicReadError(
        deviceIdentifier: DeviceId,
        serviceUUID: UUID,
        characteristicUUID: UUID
    ) {
        const key = this.getCharacteristicKey(deviceIdentifier, serviceUUID, characteristicUUID);
        this.readErrors.delete(key);
    }

    /**
     * Set read delay for a characteristic (ms)
     */
    setCharacteristicReadDelay(
        deviceIdentifier: DeviceId,
        serviceUUID: UUID,
        characteristicUUID: UUID,
        delayMs: number
    ) {
        const key = this.getCharacteristicKey(deviceIdentifier, serviceUUID, characteristicUUID);
        this.readDelays.set(key, delayMs);
    }

    // ======================
    // Characteristic Writing
    // ======================

    // Write with response (acknowledged write)
    async writeCharacteristicWithResponseForDevice(
        deviceIdentifier: DeviceId,
        serviceUUID: UUID,
        characteristicUUID: UUID,
        base64Value: string,
        transactionId: TransactionId = null
    ): Promise<Characteristic> {
        // Ensure device is connected
        if (!this.isDeviceConnected(deviceIdentifier)) {
            throw new Error(`Device ${deviceIdentifier} is not connected`);
        }

        const key = this.getCharacteristicKey(deviceIdentifier, serviceUUID, characteristicUUID);

        // Check for simulated error
        if (this.writeWithResponseErrors.has(key)) {
            const error = this.writeWithResponseErrors.get(key)!;
            return this.simulateWriteOperation(key, true, () => Promise.reject(error));
        }

        // Update the characteristic value
        this.characteristicValues.set(key, base64Value);
        this.notifyWriteListeners(key, base64Value);

        return this.simulateWriteOperation(key, true, () => Promise.resolve({
            uuid: characteristicUUID,
            serviceUUID,
            deviceID: deviceIdentifier,
            value: base64Value,
            isNotifiable: true,
            isIndicatable: false
        }));
    }

    // Write without response (unacknowledged write)
    async writeCharacteristicWithoutResponseForDevice(
        deviceIdentifier: DeviceId,
        serviceUUID: UUID,
        characteristicUUID: UUID,
        base64Value: string,
        transactionId: TransactionId = null
    ): Promise<Characteristic> {
        // Ensure device is connected
        if (!this.isDeviceConnected(deviceIdentifier)) {
            throw new Error(`Device ${deviceIdentifier} is not connected`);
        }

        const key = this.getCharacteristicKey(deviceIdentifier, serviceUUID, characteristicUUID);

        // Check for simulated error
        if (this.writeWithoutResponseErrors.has(key)) {
            const error = this.writeWithoutResponseErrors.get(key)!;
            return this.simulateWriteOperation(key, false, () => Promise.reject(error));
        }

        // Update the characteristic value
        this.characteristicValues.set(key, base64Value);
        this.notifyWriteListeners(key, base64Value);

        return this.simulateWriteOperation(key, false, () => Promise.resolve({
            uuid: characteristicUUID,
            serviceUUID,
            deviceID: deviceIdentifier,
            value: base64Value,
            isNotifiable: true,
            isIndicatable: false
        }));
    }

    // ======================
    // Characteristic Monitoring
    // ======================
    monitorCharacteristicForDevice(
        deviceIdentifier: DeviceId,
        serviceUUID: UUID,
        characteristicUUID: UUID,
        listener: CharacteristicListener,
        transactionId: TransactionId = null
    ): MonitorSubscription {
        // Ensure device is connected
        if (!this.isDeviceConnected(deviceIdentifier)) {
            throw new Error(`Device ${deviceIdentifier} is not connected`);
        }

        const key = this.getCharacteristicKey(deviceIdentifier, serviceUUID, characteristicUUID);

        if (!this.monitoredCharacteristics.has(key)) {
            this.monitoredCharacteristics.set(key, []);
        }

        const listeners = this.monitoredCharacteristics.get(key)!;
        listeners.push(listener);

        // Return current value immediately
        const currentValue = this.characteristicValues.get(key) || null;
        if (currentValue) {
            setTimeout(() => listener(null, {
                uuid: characteristicUUID,
                serviceUUID,
                deviceID: deviceIdentifier,
                value: currentValue,
                isNotifiable: true,
                isIndicatable: false
            }), 0);
        }

        return {
            remove: () => {
                const updatedListeners = listeners.filter(l => l !== listener);
                if (updatedListeners.length === 0) {
                    this.monitoredCharacteristics.delete(key);
                    this.stopSimulatedNotificationsForKey(key);
                } else {
                    this.monitoredCharacteristics.set(key, updatedListeners);
                }
            }
        };
    }

    setCharacteristicValue(
        deviceIdentifier: DeviceId,
        serviceUUID: UUID,
        characteristicUUID: UUID,
        value: string,
        options: { notify: boolean } = { notify: true }
    ) {
        const key = this.getCharacteristicKey(deviceIdentifier, serviceUUID, characteristicUUID);
        this.characteristicValues.set(key, value);

        if (options.notify) {
            this.notifyCharacteristicChange(deviceIdentifier, serviceUUID, characteristicUUID);
        }
    }

    startSimulatedNotifications(
        deviceIdentifier: DeviceId,
        serviceUUID: UUID,
        characteristicUUID: UUID,
        intervalMs: number = 1000
    ) {
        const key = this.getCharacteristicKey(deviceIdentifier, serviceUUID, characteristicUUID);
        this.stopSimulatedNotificationsForKey(key);

        const interval = setInterval(() => {
            this.notifyCharacteristicChange(deviceIdentifier, serviceUUID, characteristicUUID);
        }, intervalMs);

        this.notificationIntervals.set(key, interval);
    }

    stopSimulatedNotifications(
        deviceIdentifier: DeviceId,
        serviceUUID: UUID,
        characteristicUUID: UUID
    ) {
        const key = this.getCharacteristicKey(deviceIdentifier, serviceUUID, characteristicUUID);
        this.stopSimulatedNotificationsForKey(key);
    }

    private stopSimulatedNotificationsForKey(key: string) {
        const interval = this.notificationIntervals.get(key);
        if (interval) {
            clearInterval(interval);
            this.notificationIntervals.delete(key);
        }
    }

    simulateCharacteristicError(
        deviceIdentifier: DeviceId,
        serviceUUID: UUID,
        characteristicUUID: UUID,
        error: Error
    ) {
        const key = this.getCharacteristicKey(deviceIdentifier, serviceUUID, characteristicUUID);
        const listeners = this.monitoredCharacteristics.get(key) || [];
        listeners.forEach(listener => listener(error, null));
    }

    // ======================
    // Helper Methods
    // ======================
    private notifyCharacteristicChange(
        deviceIdentifier: DeviceId,
        serviceUUID: UUID,
        characteristicUUID: UUID
    ) {
        const key = this.getCharacteristicKey(deviceIdentifier, serviceUUID, characteristicUUID);
        const value = this.characteristicValues.get(key) || null;
        const listeners = this.monitoredCharacteristics.get(key) || [];

        if (value && listeners.length > 0) {
            const characteristic: Characteristic = {
                uuid: characteristicUUID,
                serviceUUID,
                deviceID: deviceIdentifier,
                value,
                isNotifiable: true,
                isIndicatable: false
            };

            listeners.forEach(listener => listener(null, characteristic));
        }
    }

    private getCharacteristicKey(
        deviceId: DeviceId,
        serviceUUID: UUID,
        characteristicUUID: UUID
    ): string {
        return `${deviceId}|${serviceUUID}|${characteristicUUID}`;
    }

    /**
     * Simulate read operation with optional delay
     */
    private async simulateReadOperation<T>(key: string, operation: () => Promise<T>): Promise<T> {
        const delay = this.readDelays.get(key) || 0;

        if (delay > 0) {
            await new Promise(resolve => setTimeout(resolve, delay));
        }

        return operation();
    }

    /**
     * Simulate write operation with optional delay
     */
    private async simulateWriteOperation<T>(
        key: string,
        withResponse: boolean,
        operation: () => Promise<T>
    ): Promise<T> {
        const delay = withResponse
            ? this.writeWithResponseDelays.get(key) || 0
            : this.writeWithoutResponseDelays.get(key) || 0;

        if (delay > 0) {
            await new Promise(resolve => setTimeout(resolve, delay));
        }

        return operation();
    }

    /**
     * Register a listener for write operations
     */
    onCharacteristicWrite(
        deviceIdentifier: DeviceId,
        serviceUUID: UUID,
        characteristicUUID: UUID,
        listener: (value: string) => void
    ): { remove: () => void } {
        const key = this.getCharacteristicKey(deviceIdentifier, serviceUUID, characteristicUUID);
        this.writeListeners.set(key, listener);

        return {
            remove: () => this.writeListeners.delete(key)
        };
    }

    /**
     * Notify write listeners
     */
    private notifyWriteListeners(key: string, value: string) {
        const listener = this.writeListeners.get(key);
        if (listener) {
            listener(value);
        }
    }

    /**
     * Simulate write errors
     */
    simulateWriteWithResponseError(
        deviceIdentifier: DeviceId,
        serviceUUID: UUID,
        characteristicUUID: UUID,
        error: Error
    ) {
        const key = this.getCharacteristicKey(deviceIdentifier, serviceUUID, characteristicUUID);
        this.writeWithResponseErrors.set(key, error);
    }

    simulateWriteWithoutResponseError(
        deviceIdentifier: DeviceId,
        serviceUUID: UUID,
        characteristicUUID: UUID,
        error: Error
    ) {
        const key = this.getCharacteristicKey(deviceIdentifier, serviceUUID, characteristicUUID);
        this.writeWithoutResponseErrors.set(key, error);
    }

    /**
     * Clear write errors
     */
    clearWriteWithResponseError(
        deviceIdentifier: DeviceId,
        serviceUUID: UUID,
        characteristicUUID: UUID
    ) {
        const key = this.getCharacteristicKey(deviceIdentifier, serviceUUID, characteristicUUID);
        this.writeWithResponseErrors.delete(key);
    }

    clearWriteWithoutResponseError(
        deviceIdentifier: DeviceId,
        serviceUUID: UUID,
        characteristicUUID: UUID
    ) {
        const key = this.getCharacteristicKey(deviceIdentifier, serviceUUID, characteristicUUID);
        this.writeWithoutResponseErrors.delete(key);
    }

    /**
     * Set write delays
     */
    setWriteWithResponseDelay(
        deviceIdentifier: DeviceId,
        serviceUUID: UUID,
        characteristicUUID: UUID,
        delayMs: number
    ) {
        const key = this.getCharacteristicKey(deviceIdentifier, serviceUUID, characteristicUUID);
        this.writeWithResponseDelays.set(key, delayMs);
    }

    setWriteWithoutResponseDelay(
        deviceIdentifier: DeviceId,
        serviceUUID: UUID,
        characteristicUUID: UUID,
        delayMs: number
    ) {
        const key = this.getCharacteristicKey(deviceIdentifier, serviceUUID, characteristicUUID);
        this.writeWithoutResponseDelays.set(key, delayMs);
    }
}