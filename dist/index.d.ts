type State = 'Unknown' | 'Resetting' | 'Unsupported' | 'Unauthorized' | 'PoweredOff' | 'PoweredOn';
type UUID = string;
type DeviceId = string;
type TransactionId = string | null;
interface ScanOptions {
    allowDuplicates?: boolean;
}
interface ConnectionOptions {
    autoConnect?: boolean;
    requestMTU?: number;
}
interface MockDevice {
    id: string;
    name?: string | null;
    rssi?: number | null;
    mtu?: number;
    manufacturerData?: string | null;
    serviceData?: Record<string, string> | null;
    serviceUUIDs?: string[] | null;
    isConnectable?: boolean;
    services?: () => Promise<Service[]>;
    discoverAllServicesAndCharacteristics?: () => Promise<MockDevice>;
    writeCharacteristicWithResponseForService?: (serviceUUID: UUID, characteristicUUID: UUID, base64Value: string, transactionId?: TransactionId) => Promise<Characteristic>;
    writeCharacteristicWithoutResponseForService?: (serviceUUID: UUID, characteristicUUID: UUID, base64Value: string, transactionId?: TransactionId) => Promise<Characteristic>;
    readCharacteristicForService?: (serviceUUID: UUID, characteristicUUID: UUID, transactionId?: TransactionId) => Promise<Characteristic>;
    monitorCharacteristicForService?: (serviceUUID: UUID, characteristicUUID: UUID, listener: CharacteristicListener, transactionId?: TransactionId) => MonitorSubscription;
    isConnected?: () => Promise<boolean>;
    cancelConnection?: () => Promise<MockDevice>;
}
/**
 * Configuration interface for adding mock devices via addMockDevice()
 * This uses ServiceMetadata[] for services, which gets converted to the async function format
 */
interface MockDeviceConfig {
    id: string;
    name?: string | null;
    rssi?: number | null;
    mtu?: number;
    manufacturerData?: string | null;
    serviceData?: Record<string, string> | null;
    serviceUUIDs?: string[] | null;
    isConnectable?: boolean;
    services?: ServiceMetadata[];
}
interface Descriptor {
    uuid: UUID;
    characteristicUUID: UUID;
    serviceUUID: UUID;
    deviceID: DeviceId;
    value: string | null;
}
interface DescriptorMetadata {
    uuid: UUID;
    value?: string | null;
    isReadable?: boolean;
    isWritable?: boolean;
}
interface CharacteristicProperties {
    broadcast?: boolean;
    read?: boolean;
    writeWithoutResponse?: boolean;
    write?: boolean;
    notify?: boolean;
    indicate?: boolean;
    authenticatedSignedWrites?: boolean;
    extendedProperties?: boolean;
}
interface Characteristic {
    uuid: UUID;
    serviceUUID: UUID;
    deviceID: DeviceId;
    value: string | null;
    isNotifiable: boolean;
    isIndicatable: boolean;
    isNotifying?: boolean;
    isReadable?: boolean;
    isWritableWithResponse?: boolean;
    isWritableWithoutResponse?: boolean;
    properties?: CharacteristicProperties;
    descriptors?: Descriptor[];
}
interface Service {
    uuid: UUID;
    deviceID: DeviceId;
    isPrimary?: boolean;
    includedServices?: string[];
}
interface CharacteristicMetadata {
    uuid: UUID;
    isReadable?: boolean;
    isWritableWithResponse?: boolean;
    isWritableWithoutResponse?: boolean;
    isNotifiable?: boolean;
    isIndicatable?: boolean;
    isNotifying?: boolean;
    properties?: CharacteristicProperties;
    descriptors?: DescriptorMetadata[];
}
interface ServiceMetadata {
    uuid: UUID;
    characteristics: CharacteristicMetadata[];
}
interface MtuChangedListener {
    (mtu: number): void;
}
interface RestoredState {
    connectedPeripherals: MockDevice[];
}
interface BleManagerOptions {
    restoreStateIdentifier?: string;
    restoreStateFunction?: (restoredState: RestoredState | null) => void;
}
type StateChangeListener = (state: State) => void;
type Subscription = {
    remove: () => void;
};
type DeviceScanListener = (error: Error | null, device: MockDevice | null) => void;
type CharacteristicListener = (error: Error | null, characteristic: Characteristic | null) => void;
type MonitorSubscription = {
    remove: () => void;
};
type ConnectionListener = (error: Error | null, device: MockDevice | null) => void;
declare class MockBleManager {
    private currentState;
    private stateListeners;
    private scanListener;
    private isScanning;
    private discoveredDevices;
    private scanOptions;
    private scanUUIDs;
    private scanInterval;
    private discoveryInterval;
    private monitoredCharacteristics;
    private characteristicValues;
    private notificationIntervals;
    private readDelays;
    private readErrors;
    private writeWithResponseDelays;
    private writeWithoutResponseDelays;
    private writeWithResponseErrors;
    private writeWithoutResponseErrors;
    private writeListeners;
    private connectedDevices;
    private connectionListeners;
    private connectionDelays;
    private connectionErrors;
    private disconnectionErrors;
    private restoreStateIdentifier?;
    private restoreStateFunction?;
    private scanErrorSimulation;
    constructor(options?: BleManagerOptions);
    /**
     * Simulate a scan error on next discovery event
     */
    simulateScanError(error: Error): void;
    /**
     * Clear simulated scan errors
     */
    clearScanError(): void;
    clearAllSimulatedErrors(): void;
    /**
     * Simulate iOS state restoration by saving connected devices
     */
    private saveRestorationState;
    private mtuListeners;
    private deviceMaxMTUs;
    /**
     * Set the maximum MTU a device can support
     */
    setDeviceMaxMTU(deviceId: DeviceId, maxMTU: number): void;
    /**
     * Request MTU change during connection
     */
    requestMTUForDevice(deviceIdentifier: DeviceId, mtu: number): Promise<MockDevice>;
    /**
     * Listen for MTU changes
     */
    onMTUChanged(deviceIdentifier: DeviceId, listener: MtuChangedListener): Subscription;
    /**
     * Notify MTU listeners
     */
    private notifyMTUChange;
    private discoveredServices;
    private serviceMetadata;
    private descriptorValues;
    private descriptorErrors;
    /**
     * Discover all services and characteristics for a device
     */
    discoverAllServicesAndCharacteristicsForDevice(deviceIdentifier: DeviceId): Promise<MockDevice>;
    /**
     * Get services for a device (must call discoverAllServicesAndCharacteristicsForDevice first)
     */
    servicesForDevice(deviceIdentifier: DeviceId): Promise<Service[]>;
    /**
     * Get characteristics for a service
     */
    characteristicsForService(serviceUUID: UUID, deviceIdentifier: DeviceId): Promise<CharacteristicMetadata[]>;
    state(): Promise<State>;
    setState(newState: State): void;
    onStateChange(listener: StateChangeListener, emitCurrentState?: boolean): Subscription;
    /**
     * Connect to a device
     */
    connectToDevice(deviceIdentifier: DeviceId, options?: ConnectionOptions): Promise<MockDevice>;
    /**
     * Disconnect from a device
     */
    cancelDeviceConnection(deviceIdentifier: DeviceId): Promise<MockDevice>;
    /**
     * Check if a device is connected
     */
    isDeviceConnected(deviceIdentifier: DeviceId): boolean;
    /**
     * Listen for connection state changes
     */
    onDeviceDisconnected(deviceIdentifier: DeviceId, listener: ConnectionListener): Subscription;
    /**
     * Simulate a device disconnection (e.g., out of range)
     */
    simulateDeviceDisconnection(deviceIdentifier: DeviceId, error?: Error): void;
    /**
     * Simulate a connection error
     */
    simulateConnectionError(deviceIdentifier: DeviceId, error: Error): void;
    /**
     * Clear connection error
     */
    clearConnectionError(deviceIdentifier: DeviceId): void;
    /**
     * Simulate a disconnection error
     */
    simulateDisconnectionError(deviceIdentifier: DeviceId, error: Error): void;
    /**
     * Clear disconnection error
     */
    clearDisconnectionError(deviceIdentifier: DeviceId): void;
    /**
     * Set connection delay
     */
    setConnectionDelay(deviceIdentifier: DeviceId, delayMs: number): void;
    /**
     * Notify connection listeners
     */
    private notifyConnectionListeners;
    addMockDevice(device: MockDeviceConfig): void;
    removeMockDevice(deviceId: string): void;
    clearMockDevices(): void;
    /**
     * Update a mock device's properties
     */
    updateMockDevice(deviceId: string, updates: Partial<MockDevice>): void;
    startDeviceScan(UUIDs: string[] | null, options: ScanOptions | null, listener: DeviceScanListener): void;
    stopDeviceScan(): void;
    private simulateDeviceDiscovery;
    /**
     * Set the discovery interval (ms) and restart the scan interval if scanning
     */
    setDiscoveryInterval(interval: number): void;
    readCharacteristicForDevice(deviceIdentifier: DeviceId, serviceUUID: UUID, characteristicUUID: UUID, transactionId?: TransactionId): Promise<Characteristic>;
    /**
     * Set mock characteristic value for reading
     */
    setCharacteristicValueForReading(deviceIdentifier: DeviceId, serviceUUID: UUID, characteristicUUID: UUID, value: string): void;
    /**
     * Set characteristic value from Buffer (convenience method)
     * Automatically converts Buffer to base64 string as expected by react-native-ble-plx
     */
    setCharacteristicValueFromBuffer(deviceIdentifier: DeviceId, serviceUUID: UUID, characteristicUUID: UUID, bufferValue: Buffer): void;
    /**
     * Set characteristic value from binary string (convenience method)
     * Automatically converts binary string to base64 as expected by react-native-ble-plx
     */
    setCharacteristicValueFromBinary(deviceIdentifier: DeviceId, serviceUUID: UUID, characteristicUUID: UUID, binaryValue: string): void;
    /**
     * Simulate a read error for a characteristic
     */
    simulateCharacteristicReadError(deviceIdentifier: DeviceId, serviceUUID: UUID, characteristicUUID: UUID, error: Error): void;
    /**
     * Clear simulated read error for a characteristic
     */
    clearCharacteristicReadError(deviceIdentifier: DeviceId, serviceUUID: UUID, characteristicUUID: UUID): void;
    /**
     * Set read delay for a characteristic (ms)
     */
    setCharacteristicReadDelay(deviceIdentifier: DeviceId, serviceUUID: UUID, characteristicUUID: UUID, delayMs: number): void;
    writeCharacteristicWithResponseForDevice(deviceIdentifier: DeviceId, serviceUUID: UUID, characteristicUUID: UUID, base64Value: string, transactionId?: TransactionId): Promise<Characteristic>;
    writeCharacteristicWithoutResponseForDevice(deviceIdentifier: DeviceId, serviceUUID: UUID, characteristicUUID: UUID, base64Value: string, transactionId?: TransactionId): Promise<Characteristic>;
    monitorCharacteristicForDevice(deviceIdentifier: DeviceId, serviceUUID: UUID, characteristicUUID: UUID, listener: CharacteristicListener, transactionId?: TransactionId): MonitorSubscription;
    setCharacteristicValue(deviceIdentifier: DeviceId, serviceUUID: UUID, characteristicUUID: UUID, value: string, options?: {
        notify: boolean;
    }): void;
    startSimulatedNotifications(deviceIdentifier: DeviceId, serviceUUID: UUID, characteristicUUID: UUID, intervalMs?: number): void;
    stopSimulatedNotifications(deviceIdentifier: DeviceId, serviceUUID: UUID, characteristicUUID: UUID): void;
    private stopSimulatedNotificationsForKey;
    simulateCharacteristicError(deviceIdentifier: DeviceId, serviceUUID: UUID, characteristicUUID: UUID, error: Error): void;
    private notifyCharacteristicChange;
    private getCharacteristicKey;
    /**
     * Simulate read operation with optional delay
     */
    private simulateReadOperation;
    /**
     * Simulate write operation with optional delay
     */
    private simulateWriteOperation;
    /**
     * Register a listener for write operations
     */
    onCharacteristicWrite(deviceIdentifier: DeviceId, serviceUUID: UUID, characteristicUUID: UUID, listener: (value: string) => void): {
        remove: () => void;
    };
    /**
     * Notify write listeners
     */
    private notifyWriteListeners;
    /**
     * Simulate write errors
     */
    simulateWriteWithResponseError(deviceIdentifier: DeviceId, serviceUUID: UUID, characteristicUUID: UUID, error: Error): void;
    simulateWriteWithoutResponseError(deviceIdentifier: DeviceId, serviceUUID: UUID, characteristicUUID: UUID, error: Error): void;
    /**
     * Clear write errors
     */
    clearWriteWithResponseError(deviceIdentifier: DeviceId, serviceUUID: UUID, characteristicUUID: UUID): void;
    clearWriteWithoutResponseError(deviceIdentifier: DeviceId, serviceUUID: UUID, characteristicUUID: UUID): void;
    /**
     * Set write delays
     */
    setWriteWithResponseDelay(deviceIdentifier: DeviceId, serviceUUID: UUID, characteristicUUID: UUID, delayMs: number): void;
    setWriteWithoutResponseDelay(deviceIdentifier: DeviceId, serviceUUID: UUID, characteristicUUID: UUID, delayMs: number): void;
    /**
     * Read descriptor value
     */
    readDescriptorForCharacteristic(characteristicUUID: UUID, serviceUUID: UUID, deviceIdentifier: DeviceId, descriptorUUID: UUID): Promise<Descriptor>;
    /**
     * Write descriptor value
     */
    writeDescriptorForCharacteristic(characteristicUUID: UUID, serviceUUID: UUID, deviceIdentifier: DeviceId, descriptorUUID: UUID, base64Value: string): Promise<Descriptor>;
    /**
     * Set descriptor value for testing
     */
    setDescriptorValue(deviceIdentifier: DeviceId, serviceUUID: UUID, characteristicUUID: UUID, descriptorUUID: UUID, value: string): void;
    /**
     * Simulate descriptor read/write error
     */
    simulateDescriptorError(deviceIdentifier: DeviceId, serviceUUID: UUID, characteristicUUID: UUID, descriptorUUID: UUID, error: Error): void;
    /**
     * Clear descriptor error
     */
    clearDescriptorError(deviceIdentifier: DeviceId, serviceUUID: UUID, characteristicUUID: UUID, descriptorUUID: UUID): void;
    private getDescriptorKey;
    /**
     * Destroy the BLE manager and clean up resources
     * Matches the original react-native-ble-plx destroy() method
     */
    destroy(): void;
}

export { MockBleManager as BleManager, type BleManagerOptions, type Characteristic, type CharacteristicMetadata, type CharacteristicProperties, type ConnectionOptions, type Descriptor, type DescriptorMetadata, type MockDevice as Device, type DeviceId, MockBleManager, type MockDevice, type MockDeviceConfig, type MtuChangedListener, type RestoredState, type ScanOptions, type Service, type ServiceMetadata, type State, type Subscription, type TransactionId, type UUID };
