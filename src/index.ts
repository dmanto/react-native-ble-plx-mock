export * from './BleManagerMock';

// Drop-in replacement exports
export { MockBleManager as BleManager } from './BleManagerMock';
export { MockDevice as Device } from './BleManagerMock';
export type { State, Subscription } from './BleManagerMock';
