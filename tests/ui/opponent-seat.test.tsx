import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { OpponentSeat } from '../../src/ui/components/OpponentSeat.js';

describe('OpponentSeat Component', () => {
  it('プレイヤー情報と手札枚数が描画されること', () => {
    render(
      <OpponentSeat
        player={{ id: 'p2', name: 'Bob', handCount: 5, isFinished: false }}
        isCurrentTurn={false}
      />
    );

    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('× 5')).toBeInTheDocument();
  });

  it('chips がある場合、チップ残高が表示されること', () => {
    render(
      <OpponentSeat
        player={{ id: 'p2', name: 'Bob', handCount: 5, isFinished: false, chips: 1500 }}
        isCurrentTurn={false}
      />
    );

    expect(screen.getByTestId('chips-p2')).toHaveTextContent('1,500');
  });

  it('isDisconnected: true の時、切断バッジが表示されること', () => {
    const { rerender } = render(
      <OpponentSeat
        player={{ id: 'p2', name: 'Bob', handCount: 5, isFinished: false }}
        isCurrentTurn={false}
        isDisconnected={false}
      />
    );
    expect(screen.queryByTestId('disconnected-badge-p2')).not.toBeInTheDocument();

    rerender(
      <OpponentSeat
        player={{ id: 'p2', name: 'Bob', handCount: 5, isFinished: false }}
        isCurrentTurn={false}
        isDisconnected={true}
      />
    );
    expect(screen.getByTestId('disconnected-badge-p2')).toBeInTheDocument();
    expect(screen.getByTestId('disconnected-badge-p2')).toHaveTextContent('切断');
  });
});
