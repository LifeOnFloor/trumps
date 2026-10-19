import { describe, it, expect } from 'vitest';
import { DaifugoPlugin } from '../../src/core/rules/daifugo/index.js';
import { HostSession } from '../../src/network/host-session.js';
import { ClientSession } from '../../src/network/client-session.js';
import { MemoryNetworkHub, MemoryTransport } from '../../src/network/memory-transport.js';

describe('Daifugo Insufficient Players Game Over', () => {
  it('terminates game with GAME_OVER_INSUFFICIENT_PLAYERS when SURRENDER reduces active players below minPlayers (3)', () => {
    const plugin = new DaifugoPlugin();
    const players = [
      { id: 'p1', name: 'Player 1' },
      { id: 'p2', name: 'Player 2' },
      { id: 'p3', name: 'Player 3' },
    ];

    const { context, ruleState } = plugin.init(players);
    expect(context.isGameOver).toBe(false);

    // p2 surrenders -> only 2 players left -> cannot continue daifugo
    const result = plugin.execute(context, ruleState, 'p2', { type: 'SURRENDER' });

    expect(result.nextContext.isGameOver).toBe(true);
    const insufficientEvent = result.events.find(
      (e) => e.type === 'GAME_OVER_INSUFFICIENT_PLAYERS'
    );
    expect(insufficientEvent).toBeDefined();
    expect((insufficientEvent?.payload as any)?.message).toContain('人数不足');
  });

  it('triggers game over across network when a client disconnects in a 3-player game', async () => {
    const hub = new MemoryNetworkHub();
    const hostTransport = new MemoryTransport('host-peer', hub);
    const client1Transport = new MemoryTransport('client-1-peer', hub);
    const client2Transport = new MemoryTransport('client-2-peer', hub);

    const hostSession = new HostSession(hostTransport, { id: 'host-1', name: 'Host' });
    const client1 = new ClientSession(client1Transport, { id: 'c1', name: 'Client 1' });
    const client2 = new ClientSession(client2Transport, { id: 'c2', name: 'Client 2' });

    await client1.joinRoom('host-peer');
    await client2.joinRoom('host-peer');

    expect(hostSession.getPlayers()).toHaveLength(3);

    hostSession.startGame();

    let client2GameOver = false;
    let client2ReceivedInsufficientNotice = false;
    client2.onStateChange((state, events) => {
      if (state.context.isGameOver) {
        client2GameOver = true;
      }
      if (events.some((e) => e.type === 'GAME_OVER_INSUFFICIENT_PLAYERS')) {
        client2ReceivedInsufficientNotice = true;
      }
    });

    // Client 1 leaves room (disconnects)
    client1.leaveRoom();

    expect(hostSession.getHostState()?.context.isGameOver).toBe(true);
    expect(client2GameOver).toBe(true);
    expect(client2ReceivedInsufficientNotice).toBe(true);
  });
});
