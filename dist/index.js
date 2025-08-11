// src/BleManagerMock.ts
var restoredStateStore = /* @__PURE__ */ new Map();
var MockBleManager = class {
  constructor(options) {
    // State management
    this.currentState = "PoweredOn";
    this.stateListeners = [];
    // Scanning
    this.scanListener = null;
    this.isScanning = false;
    this.discoveredDevices = /* @__PURE__ */ new Map();
    this.scanOptions = {};
    this.scanUUIDs = null;
    this.scanInterval = null;
    this.discoveryInterval = 800;
    // Default discovery interval in ms
    // Characteristic monitoring
    this.monitoredCharacteristics = /* @__PURE__ */ new Map();
    this.characteristicValues = /* @__PURE__ */ new Map();
    this.notificationIntervals = /* @__PURE__ */ new Map();
    // properties for read operations
    this.readDelays = /* @__PURE__ */ new Map();
    this.readErrors = /* @__PURE__ */ new Map();
    // properties for write operations
    this.writeWithResponseDelays = /* @__PURE__ */ new Map();
    this.writeWithoutResponseDelays = /* @__PURE__ */ new Map();
    this.writeWithResponseErrors = /* @__PURE__ */ new Map();
    this.writeWithoutResponseErrors = /* @__PURE__ */ new Map();
    this.writeListeners = /* @__PURE__ */ new Map();
    // Connection management
    this.connectedDevices = /* @__PURE__ */ new Set();
    this.connectionListeners = /* @__PURE__ */ new Map();
    this.connectionDelays = /* @__PURE__ */ new Map();
    this.connectionErrors = /* @__PURE__ */ new Map();
    this.disconnectionErrors = /* @__PURE__ */ new Map();
    // For error simulation
    this.scanErrorSimulation = null;
    // MTU management
    this.mtuListeners = /* @__PURE__ */ new Map();
    this.deviceMaxMTUs = /* @__PURE__ */ new Map();
    // Service discovery
    this.discoveredServices = /* @__PURE__ */ new Map();
    this.descriptorValues = /* @__PURE__ */ new Map();
    this.descriptorErrors = /* @__PURE__ */ new Map();
    if (options) {
      this.restoreStateIdentifier = options.restoreStateIdentifier;
      this.restoreStateFunction = options.restoreStateFunction;
      if (this.restoreStateIdentifier && this.restoreStateFunction) {
        setImmediate(() => {
          const restoredState = restoredStateStore.get(this.restoreStateIdentifier);
          this.restoreStateFunction(restoredState || null);
        });
      }
    }
  }
  /**
   * Simulate a scan error on next discovery event
   */
  simulateScanError(error) {
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
  saveRestorationState() {
    if (!this.restoreStateIdentifier) return;
    const connectedDevices = Array.from(this.connectedDevices).map((id) => {
      const device = this.discoveredDevices.get(id);
      return { ...device };
    });
    restoredStateStore.set(this.restoreStateIdentifier, {
      connectedPeripherals: connectedDevices
    });
  }
  // ======================
  // MTU Negotiation
  // ======================
  /**
   * Set the maximum MTU a device can support
   */
  setDeviceMaxMTU(deviceId, maxMTU) {
    this.deviceMaxMTUs.set(deviceId, maxMTU);
  }
  /**
   * Request MTU change during connection
   */
  async requestMTUForDevice(deviceIdentifier, mtu) {
    if (!this.isDeviceConnected(deviceIdentifier)) {
      throw new Error("Device not connected");
    }
    const device = this.discoveredDevices.get(deviceIdentifier);
    if (!device) {
      throw new Error("Device not found");
    }
    const maxMTU = this.deviceMaxMTUs.get(deviceIdentifier) || 512;
    const actualMTU = Math.min(mtu, maxMTU);
    device.mtu = actualMTU;
    this.notifyMTUChange(deviceIdentifier, actualMTU);
    return device;
  }
  /**
   * Listen for MTU changes
   */
  onMTUChanged(deviceIdentifier, listener) {
    if (!this.mtuListeners.has(deviceIdentifier)) {
      this.mtuListeners.set(deviceIdentifier, []);
    }
    const listeners = this.mtuListeners.get(deviceIdentifier);
    listeners.push(listener);
    return {
      remove: () => {
        const updatedListeners = listeners.filter((l) => l !== listener);
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
  notifyMTUChange(deviceId, mtu) {
    const listeners = this.mtuListeners.get(deviceId) || [];
    listeners.forEach((listener) => listener(mtu));
  }
  // ======================
  // Service Discovery
  // ======================
  /**
   * Discover all services and characteristics for a device
   */
  async discoverAllServicesAndCharacteristicsForDevice(deviceIdentifier) {
    if (!this.isDeviceConnected(deviceIdentifier)) {
      throw new Error("Device not connected");
    }
    const device = this.discoveredDevices.get(deviceIdentifier);
    if (!device) {
      throw new Error("Device not found");
    }
    const staticServices = device.services || [];
    const services = staticServices.map((service) => ({
      uuid: service.uuid,
      deviceID: deviceIdentifier
    }));
    this.discoveredServices.set(deviceIdentifier, services);
    return device;
  }
  /**
   * Get services for a device (must call discoverAllServicesAndCharacteristicsForDevice first)
   */
  async servicesForDevice(deviceIdentifier) {
    if (!this.discoveredServices.has(deviceIdentifier)) {
      throw new Error("Services not discovered for device");
    }
    return this.discoveredServices.get(deviceIdentifier) || [];
  }
  /**
   * Get characteristics for a service
   */
  async characteristicsForService(serviceUUID, deviceIdentifier) {
    const device = this.discoveredDevices.get(deviceIdentifier);
    if (!device || !device.services) {
      throw new Error(`Device ${deviceIdentifier} not found or has no services`);
    }
    const service = device.services.find((s) => s.uuid === serviceUUID);
    if (!service) {
      throw new Error(`Service ${serviceUUID} not found`);
    }
    return service.characteristics;
  }
  // ======================
  // State Management
  // ======================
  async state() {
    return this.currentState;
  }
  setState(newState) {
    this.currentState = newState;
    this.stateListeners.forEach((listener) => listener(newState));
    if (newState !== "PoweredOn" && this.isScanning) {
      this.stopDeviceScan();
    }
    if (newState === "PoweredOff") {
      Array.from(this.connectedDevices).forEach((deviceId) => {
        this.simulateDeviceDisconnection(
          deviceId,
          new Error("Bluetooth powered off")
        );
      });
    }
  }
  onStateChange(listener, emitCurrentState = false) {
    this.stateListeners.push(listener);
    if (emitCurrentState) {
      listener(this.currentState);
    }
    return {
      remove: () => {
        this.stateListeners = this.stateListeners.filter((l) => l !== listener);
      }
    };
  }
  // ======================
  // Connection Management
  // ======================
  /**
   * Connect to a device
   */
  async connectToDevice(deviceIdentifier, options) {
    if (this.currentState !== "PoweredOn") {
      throw new Error("Bluetooth is not powered on");
    }
    const device = this.discoveredDevices.get(deviceIdentifier);
    if (!device) {
      throw new Error(`Device ${deviceIdentifier} not found`);
    }
    if (device.isConnectable === false) {
      throw new Error(`Device ${deviceIdentifier} is not connectable`);
    }
    if (this.connectionErrors.has(deviceIdentifier)) {
      const error = this.connectionErrors.get(deviceIdentifier);
      throw error;
    }
    const delay = this.connectionDelays.get(deviceIdentifier) || 0;
    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
    if (options?.requestMTU) {
      const maxMTU = this.deviceMaxMTUs.get(deviceIdentifier) || 512;
      const actualMTU = Math.min(options.requestMTU, maxMTU);
      device.mtu = actualMTU;
      this.notifyMTUChange(deviceIdentifier, actualMTU);
    }
    this.connectedDevices.add(deviceIdentifier);
    this.notifyConnectionListeners(deviceIdentifier, null, device);
    this.saveRestorationState();
    return device;
  }
  /**
   * Disconnect from a device
   */
  async cancelDeviceConnection(deviceIdentifier) {
    const device = this.discoveredDevices.get(deviceIdentifier);
    if (!device) {
      throw new Error(`Device ${deviceIdentifier} not found`);
    }
    if (!this.connectedDevices.has(deviceIdentifier)) {
      throw new Error(`Device ${deviceIdentifier} is not connected`);
    }
    if (this.disconnectionErrors.has(deviceIdentifier)) {
      const error = this.disconnectionErrors.get(deviceIdentifier);
      this.notifyConnectionListeners(deviceIdentifier, error, device);
      throw error;
    }
    this.connectedDevices.delete(deviceIdentifier);
    this.notifyConnectionListeners(
      deviceIdentifier,
      this.disconnectionErrors.get(deviceIdentifier) || null,
      device
    );
    this.discoveredServices.delete(deviceIdentifier);
    this.saveRestorationState();
    return device;
  }
  /**
   * Check if a device is connected
   */
  isDeviceConnected(deviceIdentifier) {
    return this.connectedDevices.has(deviceIdentifier);
  }
  /**
   * Listen for connection state changes
   */
  onDeviceDisconnected(deviceIdentifier, listener) {
    if (!this.connectionListeners.has(deviceIdentifier)) {
      this.connectionListeners.set(deviceIdentifier, []);
    }
    const listeners = this.connectionListeners.get(deviceIdentifier);
    listeners.push(listener);
    return {
      remove: () => {
        const updatedListeners = listeners.filter((l) => l !== listener);
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
  simulateDeviceDisconnection(deviceIdentifier, error) {
    if (this.connectedDevices.has(deviceIdentifier)) {
      this.connectedDevices.delete(deviceIdentifier);
      this.discoveredServices.delete(deviceIdentifier);
      const device = this.discoveredDevices.get(deviceIdentifier);
      this.notifyConnectionListeners(
        deviceIdentifier,
        error || new Error("Simulated disconnection"),
        device || null
      );
    }
  }
  /**
   * Simulate a connection error
   */
  simulateConnectionError(deviceIdentifier, error) {
    this.connectionErrors.set(deviceIdentifier, error);
  }
  /**
   * Clear connection error
   */
  clearConnectionError(deviceIdentifier) {
    this.connectionErrors.delete(deviceIdentifier);
  }
  /**
   * Simulate a disconnection error
   */
  simulateDisconnectionError(deviceIdentifier, error) {
    this.disconnectionErrors.set(deviceIdentifier, error);
  }
  /**
   * Clear disconnection error
   */
  clearDisconnectionError(deviceIdentifier) {
    this.disconnectionErrors.delete(deviceIdentifier);
  }
  /**
   * Set connection delay
   */
  setConnectionDelay(deviceIdentifier, delayMs) {
    this.connectionDelays.set(deviceIdentifier, delayMs);
  }
  /**
   * Notify connection listeners
   */
  notifyConnectionListeners(deviceIdentifier, error, device) {
    const listeners = this.connectionListeners.get(deviceIdentifier) || [];
    listeners.forEach((listener) => listener(error, device));
  }
  // ======================
  // Device Scanning
  // ======================
  addMockDevice(device) {
    if (device.isConnectable === void 0) {
      device.isConnectable = true;
    }
    const mockDevice = {
      id: device.id,
      name: device.name ?? null,
      rssi: device.rssi ?? null,
      mtu: device.mtu || 517,
      // Default MTU
      manufacturerData: device.manufacturerData ?? null,
      serviceData: device.serviceData ?? null,
      serviceUUIDs: device.services ? device.services.map((s) => s.uuid) : device.serviceUUIDs ?? null,
      isConnectable: device.isConnectable,
      services: device.services
      // Static services data for mocking
    };
    this.discoveredDevices.set(device.id, mockDevice);
  }
  removeMockDevice(deviceId) {
    this.discoveredDevices.delete(deviceId);
  }
  clearMockDevices() {
    this.discoveredDevices.clear();
  }
  /**
   * Update a mock device's properties
   */
  updateMockDevice(deviceId, updates) {
    const device = this.discoveredDevices.get(deviceId);
    if (device) {
      this.discoveredDevices.set(deviceId, { ...device, ...updates });
    } else {
      throw new Error(`Device ${deviceId} not found`);
    }
  }
  startDeviceScan(UUIDs, options, listener) {
    if (this.isScanning) {
      throw new Error("Scan already in progress");
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
  simulateDeviceDiscovery() {
    const devices = Array.from(this.discoveredDevices.values());
    devices.forEach((device) => {
      if (this.scanListener) {
        this.scanListener(null, device);
      }
    });
    const startInterval = () => {
      if (this.scanInterval) {
        clearInterval(this.scanInterval);
      }
      this.scanInterval = setInterval(() => {
        if (!this.isScanning || !this.scanListener) return;
        if (this.scanErrorSimulation) {
          this.scanListener(this.scanErrorSimulation, null);
          this.scanErrorSimulation = null;
          return;
        }
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
  setDiscoveryInterval(interval) {
    this.discoveryInterval = interval;
    if (this.isScanning) {
      if (this.scanInterval) {
        clearInterval(this.scanInterval);
        this.scanInterval = null;
      }
      this.simulateDeviceDiscovery();
    }
  }
  // ======================
  // Characteristic Reading
  // ======================
  async readCharacteristicForDevice(deviceIdentifier, serviceUUID, characteristicUUID, transactionId = null) {
    if (!this.isDeviceConnected(deviceIdentifier)) {
      throw new Error(`Device ${deviceIdentifier} is not connected`);
    }
    const key = this.getCharacteristicKey(deviceIdentifier, serviceUUID, characteristicUUID);
    if (this.readErrors.has(key)) {
      const error = this.readErrors.get(key);
      return this.simulateReadOperation(key, () => Promise.reject(error));
    }
    const device = this.discoveredDevices.get(deviceIdentifier);
    const staticServices = device?.services || [];
    const service = staticServices.find((s) => s.uuid === serviceUUID);
    const charMetadata = service?.characteristics.find((c) => c.uuid === characteristicUUID);
    const value = this.characteristicValues.get(key) || null;
    let descriptors;
    if (charMetadata?.descriptors) {
      descriptors = charMetadata.descriptors.map((desc) => ({
        uuid: desc.uuid,
        characteristicUUID,
        serviceUUID,
        deviceID: deviceIdentifier,
        value: this.descriptorValues.get(this.getDescriptorKey(deviceIdentifier, serviceUUID, characteristicUUID, desc.uuid)) || desc.value || null
      }));
    }
    return this.simulateReadOperation(key, () => Promise.resolve({
      uuid: characteristicUUID,
      serviceUUID,
      deviceID: deviceIdentifier,
      value,
      isNotifiable: charMetadata?.isNotifiable ?? true,
      isIndicatable: charMetadata?.isIndicatable ?? false,
      isNotifying: charMetadata?.isNotifying ?? false,
      isReadable: charMetadata?.isReadable ?? true,
      isWritableWithResponse: charMetadata?.isWritableWithResponse ?? false,
      isWritableWithoutResponse: charMetadata?.isWritableWithoutResponse ?? false,
      properties: charMetadata?.properties,
      descriptors
    }));
  }
  /**
   * Set mock characteristic value for reading
   */
  setCharacteristicValueForReading(deviceIdentifier, serviceUUID, characteristicUUID, value) {
    const key = this.getCharacteristicKey(deviceIdentifier, serviceUUID, characteristicUUID);
    this.characteristicValues.set(key, value);
  }
  /**
   * Set characteristic value from Buffer (convenience method)
   * Automatically converts Buffer to base64 string as expected by react-native-ble-plx
   */
  setCharacteristicValueFromBuffer(deviceIdentifier, serviceUUID, characteristicUUID, bufferValue) {
    const base64Value = bufferValue.toString("base64");
    this.setCharacteristicValueForReading(deviceIdentifier, serviceUUID, characteristicUUID, base64Value);
  }
  /**
   * Set characteristic value from binary string (convenience method)
   * Automatically converts binary string to base64 as expected by react-native-ble-plx
   */
  setCharacteristicValueFromBinary(deviceIdentifier, serviceUUID, characteristicUUID, binaryValue) {
    const base64Value = Buffer.from(binaryValue, "binary").toString("base64");
    this.setCharacteristicValueForReading(deviceIdentifier, serviceUUID, characteristicUUID, base64Value);
  }
  /**
   * Simulate a read error for a characteristic
   */
  simulateCharacteristicReadError(deviceIdentifier, serviceUUID, characteristicUUID, error) {
    const key = this.getCharacteristicKey(deviceIdentifier, serviceUUID, characteristicUUID);
    this.readErrors.set(key, error);
  }
  /**
   * Clear simulated read error for a characteristic
   */
  clearCharacteristicReadError(deviceIdentifier, serviceUUID, characteristicUUID) {
    const key = this.getCharacteristicKey(deviceIdentifier, serviceUUID, characteristicUUID);
    this.readErrors.delete(key);
  }
  /**
   * Set read delay for a characteristic (ms)
   */
  setCharacteristicReadDelay(deviceIdentifier, serviceUUID, characteristicUUID, delayMs) {
    const key = this.getCharacteristicKey(deviceIdentifier, serviceUUID, characteristicUUID);
    this.readDelays.set(key, delayMs);
  }
  // ======================
  // Characteristic Writing
  // ======================
  // Write with response (acknowledged write)
  async writeCharacteristicWithResponseForDevice(deviceIdentifier, serviceUUID, characteristicUUID, base64Value, transactionId = null) {
    if (!this.isDeviceConnected(deviceIdentifier)) {
      throw new Error(`Device ${deviceIdentifier} is not connected`);
    }
    const key = this.getCharacteristicKey(deviceIdentifier, serviceUUID, characteristicUUID);
    if (this.writeWithResponseErrors.has(key)) {
      const error = this.writeWithResponseErrors.get(key);
      return this.simulateWriteOperation(key, true, () => Promise.reject(error));
    }
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
  async writeCharacteristicWithoutResponseForDevice(deviceIdentifier, serviceUUID, characteristicUUID, base64Value, transactionId = null) {
    if (!this.isDeviceConnected(deviceIdentifier)) {
      throw new Error(`Device ${deviceIdentifier} is not connected`);
    }
    const key = this.getCharacteristicKey(deviceIdentifier, serviceUUID, characteristicUUID);
    if (this.writeWithoutResponseErrors.has(key)) {
      const error = this.writeWithoutResponseErrors.get(key);
      return this.simulateWriteOperation(key, false, () => Promise.reject(error));
    }
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
  monitorCharacteristicForDevice(deviceIdentifier, serviceUUID, characteristicUUID, listener, transactionId = null) {
    if (!this.isDeviceConnected(deviceIdentifier)) {
      throw new Error(`Device ${deviceIdentifier} is not connected`);
    }
    const key = this.getCharacteristicKey(deviceIdentifier, serviceUUID, characteristicUUID);
    if (!this.monitoredCharacteristics.has(key)) {
      this.monitoredCharacteristics.set(key, []);
    }
    const listeners = this.monitoredCharacteristics.get(key);
    listeners.push(listener);
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
        const updatedListeners = listeners.filter((l) => l !== listener);
        if (updatedListeners.length === 0) {
          this.monitoredCharacteristics.delete(key);
          this.stopSimulatedNotificationsForKey(key);
        } else {
          this.monitoredCharacteristics.set(key, updatedListeners);
        }
      }
    };
  }
  setCharacteristicValue(deviceIdentifier, serviceUUID, characteristicUUID, value, options = { notify: true }) {
    const key = this.getCharacteristicKey(deviceIdentifier, serviceUUID, characteristicUUID);
    this.characteristicValues.set(key, value);
    if (options.notify) {
      this.notifyCharacteristicChange(deviceIdentifier, serviceUUID, characteristicUUID);
    }
  }
  startSimulatedNotifications(deviceIdentifier, serviceUUID, characteristicUUID, intervalMs = 1e3) {
    const key = this.getCharacteristicKey(deviceIdentifier, serviceUUID, characteristicUUID);
    this.stopSimulatedNotificationsForKey(key);
    const interval = setInterval(() => {
      this.notifyCharacteristicChange(deviceIdentifier, serviceUUID, characteristicUUID);
    }, intervalMs);
    this.notificationIntervals.set(key, interval);
  }
  stopSimulatedNotifications(deviceIdentifier, serviceUUID, characteristicUUID) {
    const key = this.getCharacteristicKey(deviceIdentifier, serviceUUID, characteristicUUID);
    this.stopSimulatedNotificationsForKey(key);
  }
  stopSimulatedNotificationsForKey(key) {
    const interval = this.notificationIntervals.get(key);
    if (interval) {
      clearInterval(interval);
      this.notificationIntervals.delete(key);
    }
  }
  simulateCharacteristicError(deviceIdentifier, serviceUUID, characteristicUUID, error) {
    const key = this.getCharacteristicKey(deviceIdentifier, serviceUUID, characteristicUUID);
    const listeners = this.monitoredCharacteristics.get(key) || [];
    listeners.forEach((listener) => listener(error, null));
  }
  // ======================
  // Helper Methods
  // ======================
  notifyCharacteristicChange(deviceIdentifier, serviceUUID, characteristicUUID) {
    const key = this.getCharacteristicKey(deviceIdentifier, serviceUUID, characteristicUUID);
    const value = this.characteristicValues.get(key) || null;
    const listeners = this.monitoredCharacteristics.get(key) || [];
    if (value && listeners.length > 0) {
      const characteristic = {
        uuid: characteristicUUID,
        serviceUUID,
        deviceID: deviceIdentifier,
        value,
        isNotifiable: true,
        isIndicatable: false
      };
      listeners.forEach((listener) => listener(null, characteristic));
    }
  }
  getCharacteristicKey(deviceId, serviceUUID, characteristicUUID) {
    return `${deviceId}|${serviceUUID}|${characteristicUUID}`;
  }
  /**
   * Simulate read operation with optional delay
   */
  async simulateReadOperation(key, operation) {
    const delay = this.readDelays.get(key) || 0;
    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
    return operation();
  }
  /**
   * Simulate write operation with optional delay
   */
  async simulateWriteOperation(key, withResponse, operation) {
    const delay = withResponse ? this.writeWithResponseDelays.get(key) || 0 : this.writeWithoutResponseDelays.get(key) || 0;
    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
    return operation();
  }
  /**
   * Register a listener for write operations
   */
  onCharacteristicWrite(deviceIdentifier, serviceUUID, characteristicUUID, listener) {
    const key = this.getCharacteristicKey(deviceIdentifier, serviceUUID, characteristicUUID);
    this.writeListeners.set(key, listener);
    return {
      remove: () => this.writeListeners.delete(key)
    };
  }
  /**
   * Notify write listeners
   */
  notifyWriteListeners(key, value) {
    const listener = this.writeListeners.get(key);
    if (listener) {
      listener(value);
    }
  }
  /**
   * Simulate write errors
   */
  simulateWriteWithResponseError(deviceIdentifier, serviceUUID, characteristicUUID, error) {
    const key = this.getCharacteristicKey(deviceIdentifier, serviceUUID, characteristicUUID);
    this.writeWithResponseErrors.set(key, error);
  }
  simulateWriteWithoutResponseError(deviceIdentifier, serviceUUID, characteristicUUID, error) {
    const key = this.getCharacteristicKey(deviceIdentifier, serviceUUID, characteristicUUID);
    this.writeWithoutResponseErrors.set(key, error);
  }
  /**
   * Clear write errors
   */
  clearWriteWithResponseError(deviceIdentifier, serviceUUID, characteristicUUID) {
    const key = this.getCharacteristicKey(deviceIdentifier, serviceUUID, characteristicUUID);
    this.writeWithResponseErrors.delete(key);
  }
  clearWriteWithoutResponseError(deviceIdentifier, serviceUUID, characteristicUUID) {
    const key = this.getCharacteristicKey(deviceIdentifier, serviceUUID, characteristicUUID);
    this.writeWithoutResponseErrors.delete(key);
  }
  /**
   * Set write delays
   */
  setWriteWithResponseDelay(deviceIdentifier, serviceUUID, characteristicUUID, delayMs) {
    const key = this.getCharacteristicKey(deviceIdentifier, serviceUUID, characteristicUUID);
    this.writeWithResponseDelays.set(key, delayMs);
  }
  setWriteWithoutResponseDelay(deviceIdentifier, serviceUUID, characteristicUUID, delayMs) {
    const key = this.getCharacteristicKey(deviceIdentifier, serviceUUID, characteristicUUID);
    this.writeWithoutResponseDelays.set(key, delayMs);
  }
  // ======================
  // Descriptor Operations
  // ======================
  /**
   * Read descriptor value
   */
  async readDescriptorForCharacteristic(characteristicUUID, serviceUUID, deviceIdentifier, descriptorUUID) {
    if (!this.isDeviceConnected(deviceIdentifier)) {
      throw new Error(`Device ${deviceIdentifier} is not connected`);
    }
    const key = this.getDescriptorKey(deviceIdentifier, serviceUUID, characteristicUUID, descriptorUUID);
    if (this.descriptorErrors.has(key)) {
      const error = this.descriptorErrors.get(key);
      throw error;
    }
    const value = this.descriptorValues.get(key) || null;
    return {
      uuid: descriptorUUID,
      characteristicUUID,
      serviceUUID,
      deviceID: deviceIdentifier,
      value
    };
  }
  /**
   * Write descriptor value
   */
  async writeDescriptorForCharacteristic(characteristicUUID, serviceUUID, deviceIdentifier, descriptorUUID, base64Value) {
    if (!this.isDeviceConnected(deviceIdentifier)) {
      throw new Error(`Device ${deviceIdentifier} is not connected`);
    }
    const key = this.getDescriptorKey(deviceIdentifier, serviceUUID, characteristicUUID, descriptorUUID);
    if (this.descriptorErrors.has(key)) {
      const error = this.descriptorErrors.get(key);
      throw error;
    }
    this.descriptorValues.set(key, base64Value);
    return {
      uuid: descriptorUUID,
      characteristicUUID,
      serviceUUID,
      deviceID: deviceIdentifier,
      value: base64Value
    };
  }
  /**
   * Set descriptor value for testing
   */
  setDescriptorValue(deviceIdentifier, serviceUUID, characteristicUUID, descriptorUUID, value) {
    const key = this.getDescriptorKey(deviceIdentifier, serviceUUID, characteristicUUID, descriptorUUID);
    this.descriptorValues.set(key, value);
  }
  /**
   * Simulate descriptor read/write error
   */
  simulateDescriptorError(deviceIdentifier, serviceUUID, characteristicUUID, descriptorUUID, error) {
    const key = this.getDescriptorKey(deviceIdentifier, serviceUUID, characteristicUUID, descriptorUUID);
    this.descriptorErrors.set(key, error);
  }
  /**
   * Clear descriptor error
   */
  clearDescriptorError(deviceIdentifier, serviceUUID, characteristicUUID, descriptorUUID) {
    const key = this.getDescriptorKey(deviceIdentifier, serviceUUID, characteristicUUID, descriptorUUID);
    this.descriptorErrors.delete(key);
  }
  getDescriptorKey(deviceId, serviceUUID, characteristicUUID, descriptorUUID) {
    return `${deviceId}|${serviceUUID}|${characteristicUUID}|${descriptorUUID}`;
  }
  /**
   * Destroy the BLE manager and clean up resources
   * Matches the original react-native-ble-plx destroy() method
   */
  destroy() {
    if (this.isScanning) {
      this.stopDeviceScan();
    }
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
    }
    this.notificationIntervals.forEach((interval) => clearInterval(interval));
    this.notificationIntervals.clear();
    Array.from(this.connectedDevices).forEach((deviceId) => {
      this.simulateDeviceDisconnection(deviceId, new Error("Manager destroyed"));
    });
    this.stateListeners = [];
    this.discoveredDevices.clear();
    this.connectedDevices.clear();
    this.monitoredCharacteristics.clear();
    this.characteristicValues.clear();
    this.connectionListeners.clear();
    this.mtuListeners.clear();
    this.deviceMaxMTUs.clear();
    this.discoveredServices.clear();
    this.readDelays.clear();
    this.readErrors.clear();
    this.writeWithResponseDelays.clear();
    this.writeWithoutResponseDelays.clear();
    this.writeWithResponseErrors.clear();
    this.writeWithoutResponseErrors.clear();
    this.writeListeners.clear();
    this.connectionDelays.clear();
    this.connectionErrors.clear();
    this.disconnectionErrors.clear();
    this.descriptorValues.clear();
    this.descriptorErrors.clear();
  }
};
export {
  MockBleManager as BleManager,
  MockBleManager
};
