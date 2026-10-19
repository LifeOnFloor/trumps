import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PeerJsTransport } from '../../src/network/peerjs-transport.js';

describe('PeerJsTransport Connection Timeout & Peer Unavailable Handling', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('rejects with timeout error when connection does not open within 5000ms', async () => {
    const mockConn: any = {
      peer: 'unknown-host',
      open: false,
      on: vi.fn(),
      close: vi.fn(),
    };

    const mockPeer: any = {
      id: 'client-peer',
      connect: vi.fn().mockReturnValue(mockConn),
      on: vi.fn(),
      off: vi.fn(),
      destroy: vi.fn(),
    };

    const transport = new PeerJsTransport(mockPeer);

    const connectPromise = transport.connect('unknown-host');

    // Advance time by 5000ms
    vi.advanceTimersByTime(5000);

    await expect(connectPromise).rejects.toThrow(/タイムアウト/);
    expect(mockConn.close).toHaveBeenCalled();
  });

  it('rejects immediately when peer-unavailable error is received for the target peer', async () => {
    const mockConn: any = {
      peer: 'non-existent-host',
      open: false,
      on: vi.fn(),
      close: vi.fn(),
    };

    const peerEventHandlers: Record<string, ((...args: any[]) => void)[]> = {};
    const mockPeer: any = {
      id: 'client-peer',
      connect: vi.fn().mockReturnValue(mockConn),
      on: vi.fn((event, handler) => {
        if (!peerEventHandlers[event]) peerEventHandlers[event] = [];
        peerEventHandlers[event].push(handler);
      }),
      off: vi.fn((event, handler) => {
        if (peerEventHandlers[event]) {
          peerEventHandlers[event] = peerEventHandlers[event].filter((h) => h !== handler);
        }
      }),
      destroy: vi.fn(),
    };

    const transport = new PeerJsTransport(mockPeer);

    const connectPromise = transport.connect('non-existent-host');

    // Simulate PeerJS firing 'peer-unavailable' error
    const errorHandlers = peerEventHandlers['error'] ?? [];
    expect(errorHandlers.length).toBeGreaterThan(0);

    const peerError: any = new Error('Could not connect to peer non-existent-host');
    peerError.type = 'peer-unavailable';
    errorHandlers.forEach((h) => h(peerError));

    await expect(connectPromise).rejects.toThrow(/見つかりません/);
  });
});
