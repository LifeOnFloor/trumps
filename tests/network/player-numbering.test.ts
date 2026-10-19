import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryNetworkHub, MemoryTransport } from '../../src/network/memory-transport.js';
import { HostSession } from '../../src/network/host-session.js';
import { ClientSession } from '../../src/network/client-session.js';

describe('Player Default Sequential Numbering', () => {
  let hub: MemoryNetworkHub;

  beforeEach(() => {
    hub = new MemoryNetworkHub();
  });

  it('ホストはデフォルトで#1、参加者は入室順に#2, #3と自動採番されること', async () => {
    const hostTransport = new MemoryTransport('host-peer', hub);
    const client1Transport = new MemoryTransport('c1-peer', hub);
    const client2Transport = new MemoryTransport('c2-peer', hub);

    const hostSession = new HostSession(hostTransport, { id: 'p1', name: '#1' });

    // Client 1 joins with default name '#2'
    const client1 = new ClientSession(client1Transport, { id: 'p2', name: '#2' });
    await client1.joinRoom('host-peer');

    // Client 2 joins with default name '#2' (same default initial value from UI)
    const client2 = new ClientSession(client2Transport, { id: 'p3', name: '#2' });
    await client2.joinRoom('host-peer');

    // Host should have players: #1, #2, #3
    const players = hostSession.getPlayers();
    expect(players).toHaveLength(3);
    expect(players[0].name).toBe('#1');
    expect(players[1].name).toBe('#2');
    expect(players[2].name).toBe('#3');
  });

  it('参加者がカスタム名を入力していた場合はその名前が保持されること', async () => {
    const hostTransport = new MemoryTransport('host-peer', hub);
    const client1Transport = new MemoryTransport('c1-peer', hub);

    const hostSession = new HostSession(hostTransport, { id: 'p1', name: '#1' });

    const client1 = new ClientSession(client1Transport, { id: 'p2', name: 'Alice' });
    await client1.joinRoom('host-peer');

    const players = hostSession.getPlayers();
    expect(players).toHaveLength(2);
    expect(players[0].name).toBe('#1');
    expect(players[1].name).toBe('Alice');
  });
});
