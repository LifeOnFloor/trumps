import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { LobbyScreen } from '../../src/ui/screens/LobbyScreen.js';
import { TableScreen } from '../../src/ui/screens/TableScreen.js';
import { DEFAULT_DAIFUGO_CONFIG } from '../../src/core/rules/daifugo/config.js';
import { I18nProvider } from '../../src/i18n/context.js';
import type { SanitizedState } from '../../src/core/types/engine.js';
import type { DaifugoRuleState } from '../../src/core/rules/daifugo/types.js';

describe('Chips Settings UI and Badges', () => {
  it('displays rich chip options when chipsMode is toggled on in LobbyScreen', () => {
    const onUpdateConfig = vi.fn();

    const { rerender } = render(
      <I18nProvider>
        <LobbyScreen
          isHost={true}
          peerId="host_1"
          players={[{ id: 'host_1', name: 'Host' }]}
          error={null}
          roomConfig={{ ...DEFAULT_DAIFUGO_CONFIG, chipsMode: false }}
          onUpdateConfig={onUpdateConfig}
          onStartHost={vi.fn()}
          onJoinClient={vi.fn()}
          onStartGame={vi.fn()}
        />
      </I18nProvider>
    );

    // Click "部屋を作る (Host)" to enter host mode
    fireEvent.click(screen.getByText(/部屋を作る \(Host\)/));

    // Initial chips selection should not be visible when chipsMode is false
    expect(screen.queryByText('初期チップ')).toBeNull();

    // Rerender with chipsMode: true
    rerender(
      <I18nProvider>
        <LobbyScreen
          isHost={true}
          peerId="host_1"
          players={[{ id: 'host_1', name: 'Host' }]}
          error={null}
          roomConfig={{ ...DEFAULT_DAIFUGO_CONFIG, chipsMode: true, initialChips: 1000, ante: 50 }}
          onUpdateConfig={onUpdateConfig}
          onStartHost={vi.fn()}
          onJoinClient={vi.fn()}
          onStartGame={vi.fn()}
        />
      </I18nProvider>
    );

    // Now rich options should be visible
    expect(screen.getByText('初期チップ')).toBeDefined();
    expect(screen.getByText('アンティ (参加費)')).toBeDefined();
    expect(screen.getByText('精算方式')).toBeDefined();
    expect(screen.getByText('5,000枚')).toBeDefined();

    // Clicking 5,000枚 triggers update with initialChips: 5000
    fireEvent.click(screen.getByText('5,000枚'));
    expect(onUpdateConfig).toHaveBeenCalledWith(
      expect.objectContaining({ initialChips: 5000 })
    );

    // Clicking 100枚 ante
    fireEvent.click(screen.getByText('100枚'));
    expect(onUpdateConfig).toHaveBeenCalledWith(
      expect.objectContaining({ ante: 100 })
    );

    // Clicking pot_split mode
    fireEvent.click(screen.getByText('ポット配分 (上位入賞比率)'));
    expect(onUpdateConfig).toHaveBeenCalledWith(
      expect.objectContaining({ chipSettlementType: 'pot_split' })
    );
  });

  it('renders pot badge on TableScreen when pot > 0 and chipsMode is active', () => {
    const dummyState: SanitizedState<DaifugoRuleState> = {
      context: {
        gameId: 'g1',
        players: [
          { id: 'p1', name: 'Alice', handCount: 5, isFinished: false, chips: 950 },
          { id: 'p2', name: 'Bob', handCount: 5, isFinished: false, chips: 950 },
        ],
        currentTurnPlayerId: 'p1',
        isGameOver: false,
        winnerPlayerIds: [],
      },
      ruleState: {
        config: { ...DEFAULT_DAIFUGO_CONFIG, chipsMode: true, ante: 50 },
        isRevolution: false,
        isElevenBack: false,
        turnDirection: 1,
        isSequenceLocked: false,
        isGekokujo: false,
        pendingHandAction: null,
        table: {
          lastPlay: null,
          lockedSuits: null,
          isSequenceLocked: false,
          requiredNextRank: null,
          passedPlayerIds: [],
        },
        rankings: [],
        foulPlayerIds: [],
        pot: 150,
      },
    };

    render(
      <I18nProvider>
        <TableScreen
          state={dummyState}
          myPlayerId="p1"
          recentEvents={[]}
          onPlay={vi.fn()}
          onPass={vi.fn()}
        />
      </I18nProvider>
    );

    expect(screen.getByTestId('chips-mode-badge')).toBeDefined();
    const potBadge = screen.getByTestId('pot-badge');
    expect(potBadge).toBeDefined();
    expect(potBadge.textContent).toContain('150');
  });
});
