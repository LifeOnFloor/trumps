import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  MemoryNetworkHub,
  MemoryTransport,
  HostSession,
  ClientSession,
} from '../../src/network/index.js';

describe('Race Condition and Concurrent Action Handling', () => {
  let hub: MemoryNetworkHub;
  let hostTransport: MemoryTransport;
  let client1Transport: MemoryTransport;
  let client2Transport: MemoryTransport;

  let hostSession: HostSession;
  let client1Session: ClientSession;
  let client2Session: ClientSession;

  beforeEach(async () => {
    hub = new MemoryNetworkHub();

    hostTransport = new MemoryTransport('host_peer', hub);
    client1Transport = new MemoryTransport('client1_peer', hub);
    client2Transport = new MemoryTransport('client2_peer', hub);

    hostSession = new HostSession(hostTransport, { id: 'host_p', name: 'Host' });
    client1Session = new ClientSession(client1Transport, { id: 'c1_p', name: 'Alice' });
    client2Session = new ClientSession(client2Transport, { id: 'c2_p', name: 'Bob' });

    await client1Session.joinRoom('host_peer');
    await client2Session.joinRoom('host_peer');
  });

  it('1. 同時着手（レースコンディション）時に手番外プレイヤーのアクションがACTION_REJECTEDとして安全に弾かれること', () => {
    hostSession.startGame();

    const runner = hostSession.getGameRunner()!;
    const currentTurn = runner.getContext().currentTurnPlayerId;
    expect(currentTurn).toBeDefined();

    const nonTurnClient = currentTurn === 'c1_p' ? client2Session : client1Session;
    const turnClient = currentTurn === 'c1_p' ? client1Session : client2Session;

    const rejectionSpy = vi.fn();
    nonTurnClient.onActionRejected(rejectionSpy);

    // Non-turn player attempts to pass or play out of turn
    nonTurnClient.dispatch({ type: 'PASS' });

    expect(rejectionSpy).toHaveBeenCalledWith('Invalid action or not your turn');
  });

  it('2. 3人プレイ時の手札枚数不均衡 (18, 18, 17枚) で配り切られ、D_3所持者または先頭プレイヤーから安全に開始されること', () => {
    hostSession.startGame();

    const runner = hostSession.getGameRunner()!;
    const players = runner.getContext().players;
    expect(players).toHaveLength(3);

    const totalCards = players.reduce((sum, p) => sum + p.hand.length, 0);
    // 52 cards + 1 joker = 53 cards
    expect(totalCards).toBe(53);

    const counts = players.map((p) => p.hand.length).sort((a, b) => a - b);
    expect(counts).toEqual([17, 18, 18]);

    // Current turn player must have D_3 if D_3 was dealt, or be one of the players
    const currentTurnId = runner.getContext().currentTurnPlayerId;
    expect(currentTurnId).toBeDefined();
    const d3Holder = players.find((p) => p.hand.some((c) => c.id === 'D_3'));
    if (d3Holder) {
      expect(currentTurnId).toBe(d3Holder.id);
    }
  });
});
