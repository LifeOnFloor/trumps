import { describe, it, expect, beforeEach } from 'vitest';
import {
  MemoryNetworkHub,
  MemoryTransport,
  HostSession,
  ClientSession,
} from '../../src/network/index.js';
import type { SanitizedState, GameEvent } from '../../src/core/types/engine.js';
import type { DaifugoRuleState } from '../../src/core/rules/daifugo/types.js';

describe('P2P Multi-player Session (Host-Client with MemoryTransport)', () => {
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

    hostSession = new HostSession(hostTransport, { id: 'host_p', name: 'Host Player' });
    client1Session = new ClientSession(client1Transport, { id: 'c1_p', name: 'Alice' });
    client2Session = new ClientSession(client2Transport, { id: 'c2_p', name: 'Bob' });
  });

  it('1. 接続とハンドシェイク: ホスト1名に対しクライアント2名がJOIN_ROOMし、ゲームが開始できること', async () => {
    await client1Session.joinRoom('host_peer');
    await client2Session.joinRoom('host_peer');

    expect(hostSession.getPlayers()).toHaveLength(3);
    expect(client1Session.getPlayers()).toHaveLength(3);
    expect(client2Session.getPlayers()).toHaveLength(3);

    // Host starts game
    hostSession.startGame();

    // Check states received by all
    const hostState = hostSession.getHostState();
    const c1State = client1Session.getState();
    const c2State = client2Session.getState();

    expect(hostState).not.toBeNull();
    expect(c1State).not.toBeNull();
    expect(c2State).not.toBeNull();
    expect(c1State?.context.isGameOver).toBe(false);
  });

  it('2. 情報隠蔽（チート耐性）: 自分自身の手札のみ具象カードが存在し、他プレイヤーの手札は枚数情報のみであること', async () => {
    await client1Session.joinRoom('host_peer');
    await client2Session.joinRoom('host_peer');
    hostSession.startGame();

    const c1State = client1Session.getState()!;
    const c1Players = c1State.context.players;

    // c1's own player
    const me = c1Players.find((p) => p.id === 'c1_p')!;
    expect(me.hand).toBeDefined();
    expect(me.hand?.length).toBe(me.handCount);
    expect(me.handCount).toBeGreaterThan(0);

    // Other players in c1's view
    const other1 = c1Players.find((p) => p.id === 'host_p')!;
    expect(other1.hand).toBeUndefined();
    expect(other1.handCount).toBeGreaterThan(0);

    const other2 = c1Players.find((p) => p.id === 'c2_p')!;
    expect(other2.hand).toBeUndefined();
    expect(other2.handCount).toBeGreaterThan(0);
  });

  it('3. ゲーム進行とステート同期: 手番プレイヤーのアクションが実行され、全ピアに同期されること', async () => {
    await client1Session.joinRoom('host_peer');
    await client2Session.joinRoom('host_peer');
    hostSession.startGame();

    const initialState = hostSession.getHostState()!;
    const currentTurnId = initialState.context.currentTurnPlayerId!;

    let activeSession: ClientSession | HostSession;
    let cardToPlayId: string;

    if (currentTurnId === 'host_p') {
      activeSession = hostSession;
      const hostCards = hostSession.getHostState()!.context.players.find((p) => p.id === 'host_p')!.hand!;
      const targetCard = hostCards.find((c) => !c.id.endsWith('_8')) ?? hostCards[0]!;
      cardToPlayId = targetCard.id;
      hostSession.dispatchHostAction({ type: 'PLAY', cardIds: [cardToPlayId] });
    } else {
      activeSession = currentTurnId === 'c1_p' ? client1Session : client2Session;
      const playerState = activeSession.getState()!.context.players.find((p) => p.id === currentTurnId)!;
      const clientCards = playerState.hand!;
      const targetCard = clientCards.find((c) => !c.id.endsWith('_8')) ?? clientCards[0]!;
      cardToPlayId = targetCard.id;
      (activeSession as ClientSession).dispatch({ type: 'PLAY', cardIds: [cardToPlayId] });
    }

    // Verify all sessions have updated lastPlay
    const updatedHost = hostSession.getHostState()!;
    const updatedC1 = client1Session.getState()!;
    const updatedC2 = client2Session.getState()!;

    expect(updatedHost.ruleState.table.lastPlay).not.toBeNull();
    expect(updatedC1.ruleState.table.lastPlay?.cards[0]?.id).toBe(cardToPlayId);
    expect(updatedC2.ruleState.table.lastPlay?.cards[0]?.id).toBe(cardToPlayId);
  });

  it('4. 不正アクションの拒絶: 手番外や不正なアクションが送られた場合、ACTION_REJECTEDが返り状態が汚染されないこと', async () => {
    await client1Session.joinRoom('host_peer');
    await client2Session.joinRoom('host_peer');
    hostSession.startGame();

    const currentTurnId = hostSession.getHostState()!.context.currentTurnPlayerId!;
    // Pick a player who is NOT current turn
    const notTurnClient = currentTurnId === 'c1_p' ? client2Session : client1Session;

    let rejectedReason = '';
    notTurnClient.onActionRejected((reason) => {
      rejectedReason = reason;
    });

    // Try to pass when it is not their turn or table is empty
    notTurnClient.dispatch({ type: 'PASS' });

    expect(rejectedReason).toContain('Invalid action');
    expect(hostSession.getHostState()!.ruleState.table.lastPlay).toBeNull();
  });

  it('5. 切断ハンドリング: プレイ中にクライアントが切断した場合、PLAYER_DISCONNECTEDが他プレイヤーへ通知されること', async () => {
    await client1Session.joinRoom('host_peer');
    await client2Session.joinRoom('host_peer');
    hostSession.startGame();

    let disconnectedPlayerId = '';
    client2Session.onPlayerDisconnected((playerId) => {
      disconnectedPlayerId = playerId;
    });

    // Client1 leaves / disconnects
    client1Session.leaveRoom();

    expect(disconnectedPlayerId).toBe('c1_p');
    expect(hostSession.getPlayers().some((p) => p.id === 'c1_p')).toBe(false);
  });

  it('6. ホストのルール変更同期: ホストがupdateConfigを実行すると、クライアントに最新Configが届くこと', async () => {
    await client1Session.joinRoom('host_peer');

    let clientConfig: any = null;
    client1Session.onConfigUpdated((conf) => {
      clientConfig = conf;
    });

    // Host updates config (e.g. chipsMode: true)
    hostSession.updateConfig({ chipsMode: true, eightCut: false });

    expect(clientConfig).not.toBeNull();
    expect(clientConfig.chipsMode).toBe(true);
    expect(clientConfig.eightCut).toBe(false);
  });

  it('7. 新規参加のリアルタイム通知: 他クライアントが途中入室した際、既存クライアントへ即座に通知されること', async () => {
    await client1Session.joinRoom('host_peer');

    let newJoinedPlayer: any = null;
    client1Session.onPlayerJoined((p) => {
      newJoinedPlayer = p;
    });

    // Client 2 joins room
    await client2Session.joinRoom('host_peer');

    expect(newJoinedPlayer).not.toBeNull();
    expect(newJoinedPlayer.id).toBe('c2_p');
    expect(client1Session.getPlayers()).toHaveLength(3);
  });

  it('8. イベントサニタイズ: CARDS_PASSED イベントで第三者には渡されたカード詳細が送られず、枚数情報のみとなること', async () => {
    await client1Session.joinRoom('host_peer');
    await client2Session.joinRoom('host_peer');

    hostSession.updateConfig({ sevenPass: true });
    hostSession.startGame();

    // Trigger CARDS_PASSED manually through runner
    const runner = hostSession.getGameRunner()!;
    // Setup state where host has 7
    let c1Events: readonly GameEvent[] = [];
    client1Session.onStateChange((_, events) => {
      c1Events = events;
    });

    // Simulate 7-pass action from host_p to c2_p
    // Dispatch action that triggers CARDS_PASSED
    // We can directly invoke dispatchHostAction or simulate via game runner
    const testCard = { id: 'c_test', suit: 'spade' as const, rank: 3 as const, isJoker: false };
    const rawEvents: GameEvent[] = [
      {
        type: 'CARDS_PASSED',
        payload: { from: 'host_p', to: 'c2_p', cards: [testCard] },
      },
    ];

    // Check sanitizeEvents helper method directly or verify client1 receives sanitized payload
    // If client1 is a third-party (neither host_p nor c2_p), client1 should not see cards
    const { sanitizeEventsForPlayer } = await import('../../src/network/host-session.js');
    const sanitizedForC1 = sanitizeEventsForPlayer(rawEvents, 'c1_p');
    expect((sanitizedForC1[0]!.payload as any).cards).toBeUndefined();
    expect((sanitizedForC1[0]!.payload as any).count).toBe(1);

    // But c2_p (recipient) does see cards
    const sanitizedForC2 = sanitizeEventsForPlayer(rawEvents, 'c2_p');
    expect((sanitizedForC2[0]!.payload as any).cards).toBeDefined();
  });

  it('9. 参加連打防止（冪等性）: 同一Peerまたは同一PlayerIdから複数回JOIN_ROOMが送られても増殖しないこと', async () => {
    // Client 1 sends JOIN_ROOM multiple times (rapid clicks)
    await client1Session.joinRoom('host_peer');
    await client1Session.joinRoom('host_peer');
    await client1Session.joinRoom('host_peer');

    // Host must still have only 2 players (host + client1)
    expect(hostSession.getPlayers()).toHaveLength(2);
  });

  it('10. クライアント切断時の安全な終了: 3人ゲーム中にクライアントが切断した場合、人数不足でゲームが安全終了すること', async () => {
    await client1Session.joinRoom('host_peer');
    await client2Session.joinRoom('host_peer');
    hostSession.startGame();

    const runner = hostSession.getGameRunner()!;
    expect(runner.getContext().players.filter((p) => !p.isFinished)).toHaveLength(3);

    // Client 2 suddenly disconnects
    client2Transport.close();

    // After disconnect, client2 should be marked isFinished / dropped
    const updatedContext = runner.getContext();
    const c2InGame = updatedContext.players.find((p) => p.id === 'c2_p');
    expect(c2InGame?.isFinished).toBe(true);

    // Since remaining active players are 2 (< minPlayers 3), game ends safely
    expect(updatedContext.isGameOver).toBe(true);
  });

  it('11. ホスト切断ハンドリング: ホストが切断した場合、クライアントが onHostDisconnected を検知できること', async () => {
    await client1Session.joinRoom('host_peer');

    let hostDisconnectedCalled = false;
    client1Session.onHostDisconnected(() => {
      hostDisconnectedCalled = true;
    });

    // Host closes transport
    hostTransport.close();

    expect(hostDisconnectedCalled).toBe(true);
  });
});
