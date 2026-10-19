import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { TableScreen } from '../../src/ui/screens/TableScreen.js';
import { LobbyScreen } from '../../src/ui/screens/LobbyScreen.js';
import { EventBanner } from '../../src/ui/components/EventBanner.js';
import { I18nProvider } from '../../src/i18n/context.js';
import type { SanitizedState } from '../../src/core/types/engine.js';
import type { DaifugoRuleState } from '../../src/core/rules/daifugo/types.js';
import { DEFAULT_DAIFUGO_CONFIG } from '../../src/core/rules/daifugo/config.js';

describe('Disconnect and Leave Room UI', () => {
  const dummyState: SanitizedState<DaifugoRuleState> = {
    context: {
      gameId: 'daifugo',
      currentTurnPlayerId: 'player-1',
      winnerPlayerIds: [],
      isGameOver: false,
      players: [
        { id: 'player-1', name: 'Player 1', isFinished: false, handCount: 1, hand: [{ id: 's1', suit: 'spade', rank: 1, isJoker: false }] },
        { id: 'player-2', name: 'Player 2', isFinished: false, handCount: 5 },
        { id: 'player-3', name: 'Player 3', isFinished: false, handCount: 5 },
      ],
    },
    ruleState: {
      config: DEFAULT_DAIFUGO_CONFIG,
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

  it('displays disconnected badge on opponent seat in TableScreen when player is in disconnectedPlayerIds', () => {
    const { rerender } = render(
      <I18nProvider>
        <TableScreen
          state={dummyState}
          myPlayerId="player-1"
          disconnectedPlayerIds={[]}
          recentEvents={[]}
          onPlay={vi.fn()}
          onPass={vi.fn()}
        />
      </I18nProvider>
    );

    // Initially both opponents are visible and not disconnected
    expect(screen.getByText('Player 2')).toBeDefined();
    expect(screen.getByText('Player 3')).toBeDefined();
    expect(screen.queryByTestId('disconnected-badge-player-2')).toBeNull();

    // Now player-2 is disconnected
    rerender(
      <I18nProvider>
        <TableScreen
          state={dummyState}
          myPlayerId="player-1"
          disconnectedPlayerIds={['player-2']}
          recentEvents={[]}
          onPlay={vi.fn()}
          onPass={vi.fn()}
        />
      </I18nProvider>
    );

    // Player 2 remains visible with disconnected badge
    expect(screen.getByText('Player 2')).toBeDefined();
    expect(screen.getByTestId('disconnected-badge-player-2')).toBeDefined();
    expect(screen.getByText('Player 3')).toBeDefined();
  });

  it('renders leave room button in TableScreen and triggers onLeaveRoom', () => {
    const onLeaveRoom = vi.fn();
    render(
      <I18nProvider>
        <TableScreen
          state={dummyState}
          myPlayerId="player-1"
          recentEvents={[]}
          onPlay={vi.fn()}
          onPass={vi.fn()}
          onLeaveRoom={onLeaveRoom}
        />
      </I18nProvider>
    );

    const leaveButton = screen.getByTestId('leave-room-button');
    expect(leaveButton).toBeDefined();
    fireEvent.click(leaveButton);
    expect(onLeaveRoom).toHaveBeenCalledTimes(1);
  });

  it('renders leave room button in LobbyScreen when connected and triggers onLeaveRoom', () => {
    const onLeaveRoom = vi.fn();
    render(
      <I18nProvider>
        <LobbyScreen
          isHost={true}
          peerId="host-peer-123"
          players={[{ id: 'player-1', name: 'Player 1' }]}
          error={null}
          onStartHost={vi.fn()}
          onJoinClient={vi.fn()}
          onStartGame={vi.fn()}
          onLeaveRoom={onLeaveRoom}
        />
      </I18nProvider>
    );

    const leaveButton = screen.getByTestId('leave-room-button');
    expect(leaveButton).toBeDefined();
    fireEvent.click(leaveButton);
    expect(onLeaveRoom).toHaveBeenCalledTimes(1);
  });

  it('displays toast with player name when PLAYER_DISCONNECTED occurs in EventBanner', () => {
    render(
      <EventBanner
        events={[
          {
            type: 'PLAYER_DISCONNECTED',
            payload: { playerId: 'player-2', playerName: 'Alice' },
          },
        ]}
      />
    );

    expect(screen.getByText(/Alice さんが切断・離脱しました/)).toBeDefined();
  });

  it('displays toast when GAME_OVER_INSUFFICIENT_PLAYERS occurs in EventBanner', () => {
    render(
      <EventBanner
        events={[
          {
            type: 'GAME_OVER_INSUFFICIENT_PLAYERS',
            payload: { message: '人数不足のためゲームを終了しました' },
          },
        ]}
      />
    );

    expect(screen.getByText(/人数不足のためゲームを終了しました/)).toBeDefined();
  });
});
