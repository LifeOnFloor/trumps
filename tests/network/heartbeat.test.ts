import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PeerJsTransport } from '../../src/network/peerjs-transport.js';

describe('PeerJsTransport Heartbeat', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('filters out heartbeat ping-pong from application receive handlers', () => {
    const mockConn: any = {
      peer: 'peer-2',
      open: true,
      send: vi.fn(),
      on: vi.fn(),
      close: vi.fn(),
    };

    const mockPeer: any = {
      id: 'peer-1',
      on: vi.fn(),
      destroy: vi.fn(),
    };

    const transport = new PeerJsTransport(mockPeer);

    // Get the incoming connection handler registered on peer
    const connectionHandler = mockPeer.on.mock.calls.find((call: any[]) => call[0] === 'connection')?.[1];
    expect(connectionHandler).toBeDefined();

    // Trigger incoming connection
    connectionHandler(mockConn);

    // Get the open handler registered on conn
    const openHandler = mockConn.on.mock.calls.find((call: any[]) => call[0] === 'open')?.[1];
    expect(openHandler).toBeDefined();
    openHandler();

    // Now conn data handler should be registered
    const dataHandler = mockConn.on.mock.calls.find((call: any[]) => call[0] === 'data')?.[1];
    expect(dataHandler).toBeDefined();

    const received: unknown[] = [];
    transport.onReceive((fromPeerId, data) => {
      received.push({ fromPeerId, data });
    });

    // When ping is received: should reply with pong and NOT notify receive handler
    dataHandler({ __trumps_hb: 'ping' });
    expect(mockConn.send).toHaveBeenCalledWith({ __trumps_hb: 'pong' });
    expect(received).toHaveLength(0);

    // When pong is received: should NOT notify receive handler
    dataHandler({ __trumps_hb: 'pong' });
    expect(received).toHaveLength(0);

    // When regular data is received: should notify receive handler
    dataHandler({ type: 'TEST_MESSAGE' });
    expect(received).toHaveLength(1);
    expect(received[0]).toEqual({
      fromPeerId: 'peer-2',
      data: { type: 'TEST_MESSAGE' },
    });

    // Advance 3 seconds: should send ping
    vi.advanceTimersByTime(3000);
    expect(mockConn.send).toHaveBeenCalledWith({ __trumps_hb: 'ping' });

    // Cleanup
    transport.close();
    expect(mockPeer.destroy).toHaveBeenCalled();
  });
});
