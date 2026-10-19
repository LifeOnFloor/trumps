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

  it('triggers onDisconnect when a peer fails to respond to pings for 6 seconds (dead peer detection)', () => {
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
    const connectionHandler = mockPeer.on.mock.calls.find((call: any[]) => call[0] === 'connection')?.[1];
    connectionHandler(mockConn);

    const openHandler = mockConn.on.mock.calls.find((call: any[]) => call[0] === 'open')?.[1];
    openHandler();

    let disconnectedPeer: string | null = null;
    transport.onDisconnect((peerId) => {
      disconnectedPeer = peerId;
    });

    // Advance 3 seconds: ping sent, but peer does not reply
    vi.advanceTimersByTime(3000);
    expect(mockConn.send).toHaveBeenCalledWith({ __trumps_hb: 'ping' });
    expect(disconnectedPeer).toBeNull();

    // Advance another 3 seconds (total 6s >= threshold): should detect dead peer, close connection and trigger onDisconnect
    vi.advanceTimersByTime(3100);
    expect(mockConn.close).toHaveBeenCalled();
    expect(disconnectedPeer).toBe('peer-2');

    transport.close();
  });
});
