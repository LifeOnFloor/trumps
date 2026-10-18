import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { GameTable } from '../../src/ui/components/GameTable.js';
import type { PlayMeld } from '../../src/core/rules/daifugo/types.js';

describe('GameTable Component', () => {
  it('場が空（null）の時は「場が流れています」等のプレースホルダーが表示されること', () => {
    render(
      <GameTable
        lastPlay={null}
        isRevolution={false}
        lockedSuits={null}
      />
    );

    expect(screen.getByTestId('table-placeholder')).toHaveTextContent('場が流れています');
    expect(screen.queryByTestId('table-cards')).not.toBeInTheDocument();
  });

  it('isRevolution: true の時に革命インジケータが表示されること', () => {
    const { rerender } = render(
      <GameTable
        lastPlay={null}
        isRevolution={false}
        lockedSuits={null}
      />
    );
    expect(screen.queryByTestId('revolution-badge')).not.toBeInTheDocument();

    rerender(
      <GameTable
        lastPlay={null}
        isRevolution={true}
        lockedSuits={null}
      />
    );
    expect(screen.getByTestId('revolution-badge')).toBeInTheDocument();
    expect(screen.getByTestId('revolution-badge')).toHaveTextContent('REVOLUTION');
  });

  it('カードが出ている時はカード一覧が表示されること', () => {
    const lastPlay: PlayMeld = {
      type: 'pair',
      cards: [
        { id: 'S_5', isJoker: false, suit: 'spade', rank: 5 },
        { id: 'H_5', isJoker: false, suit: 'heart', rank: 5 },
      ],
      effectiveStrength: 5,
      suits: ['spade', 'heart'],
      playerId: 'p1',
    };

    render(
      <GameTable
        lastPlay={lastPlay}
        isRevolution={false}
        lockedSuits={null}
      />
    );

    expect(screen.getByTestId('table-cards')).toBeInTheDocument();
    expect(screen.getByTestId('card-S_5')).toBeInTheDocument();
    expect(screen.getByTestId('card-H_5')).toBeInTheDocument();
  });
});
