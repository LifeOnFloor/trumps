import { describe, it, expect } from 'vitest';
import { MemoryNetworkHub, MemoryTransport } from '../../src/network/memory-transport.js';
import { HostSession } from '../../src/network/host-session.js';
import { ClientSession } from '../../src/network/client-session.js';
import { ShinkeiSuijakuPlugin } from '../../src/core/rules/shinkei-suijaku/index.js';
import type { ShinkeiSuijakuRuleState } from '../../src/core/rules/shinkei-suijaku/types.js';

describe('ShinkeiSuijaku (Concentration) Online P2P Session', () => {
  it('ホストが神経衰弱の部屋を作成し、クライアントが参加してオンライン対戦できること（1〜6人対応）', async () => {
    const hub = new MemoryNetworkHub();
    const hostTransport = new MemoryTransport('host-peer', hub);
    const clientTransport = new MemoryTransport('client-peer', hub);

    const plugin = new ShinkeiSuijakuPlugin();
    expect(plugin.minPlayers).toBe(1);
    expect(plugin.maxPlayers).toBe(6);

    const hostSession = new HostSession(
      hostTransport,
      { id: 'host-player', name: 'Alice' },
      { plugin }
    );

    const clientSession = new ClientSession(
      clientTransport,
      { id: 'client-player', name: 'Bob' }
    );

    // Client joins room
    await clientSession.joinRoom('host-peer');
    expect(hostSession.getPlayers().length).toBe(2);

    // Host starts game
    hostSession.startGame();

    // Verify host and client received initial sanitized state
    const hostState = hostSession.getHostState() as { ruleState: ShinkeiSuijakuRuleState };
    expect(hostState).not.toBeNull();
    expect(hostState.ruleState.cards.length).toBe(52);
    // Face-down cards must be sanitized to null
    expect(hostState.ruleState.cards[0]?.card).toBeNull();

    const clientState = clientSession.getState() as { ruleState: ShinkeiSuijakuRuleState };
    expect(clientState).not.toBeNull();
    expect(clientState.ruleState.cards.length).toBe(52);
    expect(clientState.ruleState.cards[0]?.card).toBeNull();

    // Current turn player flips 1st card
    const turnPlayerId = hostState.ruleState ? hostSession.getGameRunner()?.getContext().currentTurnPlayerId : null;
    expect(turnPlayerId).toBe('host-player');

    hostSession.dispatchHostAction({ type: 'FLIP', cardIndex: 0 });

    // Both host and client should see card 0 flipped
    const updatedHostState = hostSession.getHostState() as { ruleState: ShinkeiSuijakuRuleState };
    expect(updatedHostState.ruleState.cards[0]?.isFlipped).toBe(true);
    expect(updatedHostState.ruleState.cards[0]?.card).not.toBeNull(); // flipped card details visible

    const updatedClientState = clientSession.getState() as { ruleState: ShinkeiSuijakuRuleState };
    expect(updatedClientState.ruleState.cards[0]?.isFlipped).toBe(true);
    expect(updatedClientState.ruleState.cards[0]?.card).not.toBeNull();
  });

  it('最大6人まで部屋に参加でき、7人目は満室エラーとなること', async () => {
    const hub = new MemoryNetworkHub();
    const hostTransport = new MemoryTransport('host-peer', hub);
    const plugin = new ShinkeiSuijakuPlugin();
    const hostSession = new HostSession(
      hostTransport,
      { id: 'host-player', name: 'Host' },
      { plugin }
    );

    const clientSessions: ClientSession[] = [];
    for (let i = 1; i <= 5; i++) {
      const ct = new MemoryTransport(`client-peer-${i}`, hub);
      const cs = new ClientSession(ct, { id: `client-${i}`, name: `Player ${i}` });
      await cs.joinRoom('host-peer');
      clientSessions.push(cs);
    }

    expect(hostSession.getPlayers().length).toBe(6);

    // 7th player tries to join
    let errorMessage: string | null = null;
    const ct7 = new MemoryTransport('client-peer-7', hub);
    ct7.onReceive((_, data) => {
      const msg = data as { type: string; message: string };
      if (msg.type === 'ERROR') {
        errorMessage = msg.message;
      }
    });
    const cs7 = new ClientSession(ct7, { id: 'client-7', name: 'Player 7' });
    await cs7.joinRoom('host-peer');

    expect(errorMessage).toBe('Room is full');
    expect(hostSession.getPlayers().length).toBe(6);
  });
});
