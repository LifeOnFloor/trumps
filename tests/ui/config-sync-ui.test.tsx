import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { TableScreen } from '../../src/ui/screens/TableScreen.js';
import { LobbyScreen } from '../../src/ui/screens/LobbyScreen.js';
import { I18nProvider } from '../../src/i18n/context.js';
import type { SanitizedState } from '../../src/core/types/engine.js';
import type { DaifugoRuleState } from '../../src/core/rules/daifugo/types.js';
import { DEFAULT_DAIFUGO_CONFIG, type DaifugoConfig } from '../../src/core/rules/daifugo/config.js';

describe('UI Config Synchronization', () => {
  const customConfig: DaifugoConfig = {
    ...DEFAULT_DAIFUGO_CONFIG,
    suitLock: 'geki',
    nineEffect: 'revolution',
    sandstorm: true,
    elevenBack: true,
    miyakoOchi: true,
  };

  const dummyState: SanitizedState<DaifugoRuleState> = {
    context: {
      gameId: 'daifugo',
      currentTurnPlayerId: 'player-1',
      winnerPlayerIds: [],
      isGameOver: false,
      players: [
        { id: 'player-1', name: 'Player 1', isFinished: false, handCount: 1, hand: [{ id: 's1', suit: 'spade', rank: 1, isJoker: false }] },
        { id: 'player-2', name: 'Player 2', isFinished: false, handCount: 5 },
      ],
    },
    ruleState: {
      config: customConfig, // Custom config in ruleState
      isRevolution: false,
      isElevenBack: false,
      turnDirection: 1,
      isSequenceLocked: false,
      isGekokujo: false,
      pendingHandAction: null,
      table: {
        lastPlay: null,
        lockedSuits: [],
        isSequenceLocked: false,
        requiredNextRank: null,
        passedPlayerIds: [],
      },
      rankings: [],
      foulPlayerIds: [],
    },
  };

  it('prioritizes ruleState.config in TableScreen so rules modal displays host custom settings', () => {
    render(
      <I18nProvider>
        <TableScreen
          state={dummyState}
          myPlayerId="player-1"
          roomConfig={DEFAULT_DAIFUGO_CONFIG} // Stale or default roomConfig
          recentEvents={[]}
          onPlay={vi.fn()}
          onPass={vi.fn()}
        />
      </I18nProvider>
    );

    // Open Rules Modal
    const rulesButton = screen.getByTestId('table-rules-button');
    fireEvent.click(rulesButton);

    // Check that host custom settings are displayed in modal
    expect(screen.getAllByText(/激縛り/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/9一時革命/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/砂嵐/).length).toBeGreaterThan(0);
  });

  it('displays full host room rules badges in LobbyScreen client mode', () => {
    render(
      <I18nProvider>
        <LobbyScreen
          isHost={false}
          peerId=""
          players={[{ id: 'host-1', name: 'Host' }, { id: 'client-1', name: 'Client' }]}
          roomConfig={customConfig} // Config received from host
          error={null}
          onStartHost={vi.fn()}
          onJoinClient={vi.fn()}
          onStartGame={vi.fn()}
        />
      </I18nProvider>
    );

    // Switch to client mode or ensure client mode displays the custom settings
    // In client mode, it should display active rules including suitLock, nineEffect, sandstorm, etc.
    expect(screen.getByText(/激縛り/)).toBeDefined();
    expect(screen.getByText(/9一時革命/)).toBeDefined();
    expect(screen.getByText(/砂嵐/)).toBeDefined();
  });
});
