import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { BleManagerMock } from '../src/BleManagerMock';

describe('BleManagerMock', () => {
  it('detects simulated devices', () => {
    const bleManager = new BleManagerMock();
    const listener = mock.fn();
    
    bleManager.startDeviceScan(null, null, listener);
    bleManager.simulateDeviceDiscovery({ id: 'test-1' });
    
    assert.equal(listener.mock.calls.length, 1);
    assert.equal(listener.mock.calls[0]?.arguments[1]?.id, 'test-1');
  });

  it('stops scanning', () => {
    const bleManager = new BleManagerMock();
    const listener = mock.fn();
    
    bleManager.startDeviceScan(null, null, listener);
    bleManager.stopDeviceScan();
    bleManager.simulateDeviceDiscovery({ id: 'test-2' });
    
    assert.equal(listener.mock.calls.length, 0);
  });
});