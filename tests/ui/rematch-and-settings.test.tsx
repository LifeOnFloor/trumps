import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryNetworkHub, MemoryTransport } from '../../src/network/memory-transport.js';
import { HostSession } from '../../src/network/host-session.js';
import { ClientSession } from '../../src/network/client-session.js';
import { ResultModal } from '../../src/ui/components/ResultModal.js';
import { TableScreen } from '../../src/ui/screens/TableScreen.js';
import { GameTable } from '../../src/ui/components/GameTable.js';
import { I18nProvider } from '../../src/i18n/context.js';
import { DEFAULT_DAIFUGO_CONFIG } from '../../src/core/rules/daifugo/config.js';

describe('Rematch Flow and Settings UI', () => {
  it('HostSession: startNextRound() によりチップを引き継ぎ、次ラウンドのゲームを開始すること', async () => {
    const hub = new MemoryNetworkHub();
    const tHost = new MemoryTransport('peer_host', hub);
    const tClient1 = new MemoryTransport('peer_c1', hub);
    const tClient2 = new MemoryTransport('peer_c2', hub);

    const hostSession = new HostSession(tHost, { id: 'p_host', name: 'Host' }, {
      config: { chipsMode: true, initialChips: 1000 },
    });
    const client1 = new ClientSession(tClient1, { id: 'p_c1', name: 'Client 1' });
    const client2 = new ClientSession(tClient2, { id: 'p_c2', name: 'Client 2' });

    await client1.joinRoom('peer_host');
    await client2.joinRoom('peer_host');

    // Start round 1
    hostSession.startGame();
    expect(hostSession.getGameRunner()).not.toBeNull();

    // Simulate game over context
    const runner = hostSession.getGameRunner()!;
    (runner as any).context.isGameOver = true;
    (runner as any).context.winnerPlayerIds = ['p_host', 'p_c1', 'p_c2'];
    // Update player chips
    (runner as any).context.players = [
      { id: 'p_host', name: 'Host', chips: 1300, hand: [], isFinished: true },
      { id: 'p_c1', name: 'Client 1', chips: 900, hand: [], isFinished: true },
      { id: 'p_c2', name: 'Client 2', chips: 800, hand: [], isFinished: true },
    ];

    // Host triggers next round!
    hostSession.startNextRound();

    const newRunner = hostSession.getGameRunner()!;
    expect(newRunner.getContext().isGameOver).toBe(false);

    // Verify chips carried over from previous round
    const hostPlayerAfter = newRunner.getContext().players.find((p) => p.id === 'p_host');
    const c1PlayerAfter = newRunner.getContext().players.find((p) => p.id === 'p_c1');
    expect(hostPlayerAfter?.chips).toBe(1300);
    expect(c1PlayerAfter?.chips).toBe(900);
  });

  it('ResultModal: ホストには再戦開始ボタンが表示され、非ホストには待機メッセージが表示されること', () => {
    const handleNextRound = vi.fn();

    // 1. Host view
    const { rerender } = render(
      <ResultModal
        rankings={['p1', 'p2']}
        players={[
          { id: 'p1', name: 'Alice', handCount: 0, isFinished: true, chips: 1200 },
          { id: 'p2', name: 'Bob', handCount: 2, isFinished: false, chips: 800 },
        ]}
        isHost={true}
        onNextRound={handleNextRound}
      />
    );

    const nextBtn = screen.getByTestId('next-round-button');
    expect(nextBtn).toBeInTheDocument();
    fireEvent.click(nextBtn);
    expect(handleNextRound).toHaveBeenCalledTimes(1);

    // 2. Client view
    rerender(
      <ResultModal
        rankings={['p1', 'p2']}
        players={[
          { id: 'p1', name: 'Alice', handCount: 0, isFinished: true, chips: 1200 },
          { id: 'p2', name: 'Bob', handCount: 2, isFinished: false, chips: 800 },
        ]}
        isHost={false}
        onNextRound={handleNextRound}
      />
    );

    expect(screen.queryByTestId('next-round-button')).toBeNull();
    expect(screen.getByTestId('waiting-next-round')).toBeInTheDocument();
  });

  it('GameTable: 日本語モード時に革命バッジが「革命中」と表示されること', () => {
    render(
      <I18nProvider>
        <GameTable
          lastPlay={null}
          isRevolution={true}
          lockedSuits={null}
        />
      </I18nProvider>
    );

    const badge = screen.getByTestId('revolution-badge');
    expect(badge).toHaveTextContent('革命中');
  });

  it('TableScreen: モバイル表示用の設定ボタン（settings-button）をクリックすると設定モーダルが開くこと', () => {
    const mockState = {
      context: {
        gameId: 'g1',
        players: [{ id: 'p1', name: 'Alice', handCount: 3, isFinished: false, hand: [] }],
        currentTurnPlayerId: 'p1',
        isGameOver: false,
        winnerPlayerIds: [],
      },
      ruleState: {
        config: DEFAULT_DAIFUGO_CONFIG,
        isRevolution: false,
        isElevenBack: false,
        turnDirection: 1 as const,
        isSequenceLocked: false,
        isGekokujo: false,
        table: {
          lastPlay: null,
          lockedSuits: null,
          isSequenceLocked: false,
          requiredNextRank: null,
          passedPlayerIds: [],
        },
        rankings: [],
        foulPlayerIds: [],
      },
    };

    render(
      <I18nProvider>
        <TableScreen
          state={mockState as any}
          myPlayerId="p1"
          recentEvents={[]}
          onPlay={vi.fn()}
          onPass={vi.fn()}
        />
      </I18nProvider>
    );

    expect(screen.queryByTestId('settings-modal')).toBeNull();

    const settingsBtn = screen.getByTestId('settings-button');
    fireEvent.click(settingsBtn);

    expect(screen.getByTestId('settings-modal')).toBeInTheDocument();
  });
});
