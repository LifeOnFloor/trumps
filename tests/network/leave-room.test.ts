import { describe, it, expect } from 'vitest';
import { MemoryNetworkHub, MemoryTransport } from '../../src/network/memory-transport.js';
import { HostSession } from '../../src/network/host-session.js';
import { ClientSession } from '../../src/network/client-session.js';

describe('Leave Room functionality', () => {
  it('allows client to leave room and notifies host', async () => {
    const hub = new MemoryNetworkHub();
    const hostTransport = new MemoryTransport('host-peer', hub);
    const clientTransport = new MemoryTransport('client-peer', hub);

    const hostSession = new HostSession(hostTransport, { id: 'host-1', name: 'Host' });
    const clientSession = new ClientSession(clientTransport, { id: 'client-1', name: 'Client 1' });

    await clientSession.joinRoom('host-peer');
    expect(hostSession.getPlayers()).toHaveLength(2);

    let disconnectedId: string | null = null;
    let disconnectedName: string | null = null;
    hostSession.onPlayerDisconnected((playerId, playerName) => {
      disconnectedId = playerId;
      disconnectedName = playerName;
    });

    clientSession.leaveRoom();

    expect(hostSession.getPlayers()).toHaveLength(1);
    expect(disconnectedId).toBe('client-1');
    expect(disconnectedName).toBe('Client 1');
  });

  it('allows host to leave room and closes all connections', async () => {
    const hub = new MemoryNetworkHub();
    const hostTransport = new MemoryTransport('host-peer', hub);
    const clientTransport = new MemoryTransport('client-peer', hub);

    const hostSession = new HostSession(hostTransport, { id: 'host-1', name: 'Host' });
    const clientSession = new ClientSession(clientTransport, { id: 'client-1', name: 'Client 1' });

    await clientSession.joinRoom('host-peer');
    expect(hostSession.getPlayers()).toHaveLength(2);

    let hostDisconnectedNotified = false;
    clientSession.onHostDisconnected(() => {
      hostDisconnectedNotified = true;
    });

    hostSession.leaveRoom();

    expect(hostDisconnectedNotified).toBe(true);
  });
});
