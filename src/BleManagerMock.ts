type Device = { id: string; name?: string };
type ScanListener = (error: any, device?: Device) => void;

export class BleManagerMock {
  private scanListeners: ScanListener[] = [];

  startDeviceScan(_uuids: string[] | null, _options: any, listener: ScanListener) {
    this.scanListeners.push(listener);
  }

  stopDeviceScan() {
    this.scanListeners = [];
  }

  simulateDeviceDiscovery(device: Device) {
    this.scanListeners.forEach(listener => listener(null, device));
  }
}