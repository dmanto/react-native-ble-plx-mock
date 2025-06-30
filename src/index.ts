export * from './BleManagerMock';

// Critical exports for drop-in replacement compatibility
export { MockBleManager as BleManager } from './BleManagerMock';
export { MockDevice as Device } from './BleManagerMock';
export type { State, Subscription } from './BleManagerMock';
