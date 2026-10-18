import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { CardView } from '../../src/ui/components/CardView.js';
import type { RegularCard, JokerCard } from '../../src/core/types/card.js';

describe('CardView Component', () => {
  it('スートとランク、ジョーカーが適切に描画されること', () => {
    const spadeAce: RegularCard = {
      id: 'S_1',
      isJoker: false,
      suit: 'spade',
      rank: 1,
    };
    const { rerender } = render(<CardView card={spadeAce} />);
    expect(screen.getByTestId('card-S_1')).toBeInTheDocument();
    expect(screen.getAllByText('♠').length).toBeGreaterThan(0);
    expect(screen.getAllByText('A').length).toBeGreaterThan(0);

    const joker: JokerCard = {
      id: 'JOKER_1',
      isJoker: true,
    };
    rerender(<CardView card={joker} />);
    expect(screen.getByTestId('card-JOKER_1')).toBeInTheDocument();
    expect(screen.getByText('Joker')).toBeInTheDocument();
  });

  it('isSelected: true の際に選択用クラス（上部移動・枠線強調）が付与されること', () => {
    const heartKing: RegularCard = {
      id: 'H_13',
      isJoker: false,
      suit: 'heart',
      rank: 13,
    };
    const { rerender } = render(<CardView card={heartKing} isSelected={false} />);
    const cardEl = screen.getByTestId('card-H_13');
    expect(cardEl.className).not.toContain('selected');

    rerender(<CardView card={heartKing} isSelected={true} />);
    expect(cardEl.className).toContain('selected');
    expect(cardEl.className).toContain('-translate-y-4');
  });

  it('クリック時にonClickが呼ばれること', () => {
    const card: RegularCard = {
      id: 'D_10',
      isJoker: false,
      suit: 'diamond',
      rank: 10,
    };
    const handleClick = vi.fn();
    render(<CardView card={card} onClick={handleClick} />);
    fireEvent.click(screen.getByTestId('card-D_10'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
