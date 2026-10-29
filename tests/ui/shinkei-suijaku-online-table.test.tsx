import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { ShinkeiSuijakuOnlineTable } from '../../src/ui/screens/ShinkeiSuijakuOnlineTable.js';
import type { SanitizedState } from '../../src/core/types/engine.js';
import type { ShinkeiSuijakuRuleState } from '../../src/core/rules/shinkei-suijaku/types.js';

describe('ShinkeiSuijakuOnlineTable Component', () => {
  const createMockState = (
    currentTurnPlayerId: string = 'p1',
    isGameOver: boolean = false
  ): SanitizedState<ShinkeiSuijakuRuleState> => {
    const cards = Array.from({ length: 52 }, (_, i) => ({
      index: i,
      card: null,
      isFlipped: false,
      isTaken: false,
      takenByPlayerId: null,
    }));

    return {
      context: {
        gameId: 'shinkei-suijaku',
        players: [
          { id: 'p1', name: 'Alice', handCount: 0, isFinished: false },
          { id: 'p2', name: 'Bob', handCount: 0, isFinished: false },
          { id: 'p3', name: 'Charlie', handCount: 0, isFinished: false },
        ],
        currentTurnPlayerId,
        isGameOver,
        winnerPlayerIds: isGameOver ? ['p1'] : [],
      },
      ruleState: {
        config: { pairRule: 'rank', jokerCount: 0 },
        cards,
        firstFlippedIndex: null,
        secondFlippedIndex: null,
        lastMatchResult: null,
        playerScores: { p1: 5, p2: 3, p3: 2 },
        turnCount: 10,
      },
    };
  };

  it('初期レンダリングで1〜6人のプレイヤー情報、獲得組数、52枚のカードが表示されること', () => {
    const state = createMockState('p1');
    render(
      <ShinkeiSuijakuOnlineTable
        state={state}
        myPlayerId="p1"
        recentEvents={[]}
        onFlip={vi.fn()}
        onNextTurn={vi.fn()}
      />
    );

    expect(screen.getByText(/神経衰弱（オンライン対戦）/)).toBeInTheDocument();
    expect(screen.getByText(/Alice/)).toBeInTheDocument();
    expect(screen.getByText(/Bob/)).toBeInTheDocument();
    expect(screen.getByText(/Charlie/)).toBeInTheDocument();

    const cards = screen.getAllByTestId(/^online-memory-card-\d+$/);
    expect(cards.length).toBe(52);
  });

  it('自分の手番のとき、カードをクリックすると onFlip が呼び出されること', () => {
    const state = createMockState('p1');
    const onFlip = vi.fn();
    render(
      <ShinkeiSuijakuOnlineTable
        state={state}
        myPlayerId="p1"
        recentEvents={[]}
        onFlip={onFlip}
        onNextTurn={vi.fn()}
      />
    );

    const card = screen.getByTestId('online-memory-card-3');
    fireEvent.click(card);

    expect(onFlip).toHaveBeenCalledWith(3);
  });

  it('相手の手番のときはカードをクリックしても onFlip が呼び出されないこと', () => {
    const state = createMockState('p2'); // Current turn is Bob (p2)
    const onFlip = vi.fn();
    render(
      <ShinkeiSuijakuOnlineTable
        state={state}
        myPlayerId="p1" // I am Alice (p1)
        recentEvents={[]}
        onFlip={onFlip}
        onNextTurn={vi.fn()}
      />
    );

    const card = screen.getByTestId('online-memory-card-3');
    fireEvent.click(card);

    expect(onFlip).not.toHaveBeenCalled();
  });

  it('ゲーム終了時に最終順位モーダルが表示されること', () => {
    const state = createMockState('p1', true); // isGameOver = true
    render(
      <ShinkeiSuijakuOnlineTable
        state={state}
        myPlayerId="p1"
        recentEvents={[]}
        onFlip={vi.fn()}
        onNextTurn={vi.fn()}
      />
    );

    expect(screen.getByText('対戦終了！')).toBeInTheDocument();
    expect(screen.getByText(/1位: Alice/)).toBeInTheDocument();
  });

  it('退室ボタンを押すと onLeaveRoom が呼ばれること', () => {
    const state = createMockState('p1');
    const onLeaveRoom = vi.fn();
    render(
      <ShinkeiSuijakuOnlineTable
        state={state}
        myPlayerId="p1"
        recentEvents={[]}
        onFlip={vi.fn()}
        onNextTurn={vi.fn()}
        onLeaveRoom={onLeaveRoom}
      />
    );

    const leaveButton = screen.getByRole('button', { name: /退室する/ });
    fireEvent.click(leaveButton);

    expect(onLeaveRoom).toHaveBeenCalledTimes(1);
  });
});
