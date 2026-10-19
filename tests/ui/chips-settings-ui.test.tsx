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
  it('supports template presets and custom settings tabs in LobbyScreen', () => {
    const onUpdateConfig = vi.fn();

    render(
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

    // Initially when chipsMode is false, tabs are not displayed
    expect(screen.queryByTestId('chip-tab-preset')).toBeNull();

    // Clicking the entire chips-mode-row toggles chipsMode to true
    const chipsRow = screen.getByTestId('chips-mode-row');
    fireEvent.click(chipsRow);
    expect(onUpdateConfig).toHaveBeenCalledWith(
      expect.objectContaining({ chipsMode: true })
    );

    // Now template tabs and preset buttons should be visible
    expect(screen.getByTestId('chip-tab-preset')).toBeDefined();
    expect(screen.getByTestId('chip-tab-custom')).toBeDefined();
    expect(screen.getByTestId('chip-preset-high_roller')).toBeDefined();

    // Clicking high roller preset sets initialChips: 5000 and escalating ante
    fireEvent.click(screen.getByTestId('chip-preset-high_roller'));
    expect(onUpdateConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        preset: 'high_roller',
        initialChips: 5000,
        anteType: 'escalating',
      })
    );

    // Switch to Custom Details tab
    fireEvent.click(screen.getByTestId('chip-tab-custom'));
    expect(screen.getByText('破産・借金ルール (所持チップ0時)')).toBeDefined();

    // Click Allow Debt (Mahjong black stick)
    fireEvent.click(screen.getByText(/借金OK/));
    expect(onUpdateConfig).toHaveBeenCalledWith(
      expect.objectContaining({ bankruptcyRule: 'allow_debt' })
    );
  });

  it('renders pot badge and debt warning on TableScreen', () => {
    const dummyState: SanitizedState<DaifugoRuleState> = {
      context: {
        gameId: 'g1',
        players: [
          { id: 'p1', name: 'Alice', handCount: 5, isFinished: false, chips: -150 },
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

    // My chips (Alice) has debt: -150
    const myChips = screen.getByTestId('my-chips');
    expect(myChips.textContent).toContain('借金');
    expect(myChips.textContent).toContain('-150');
  });
});
