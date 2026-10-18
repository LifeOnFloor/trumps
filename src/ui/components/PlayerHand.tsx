import React from 'react';
import type { Card } from '../../core/types/card.js';
import { CardView } from './CardView.js';

export interface PlayerHandProps {
  cards: readonly Card[];
  selectedCardIds: readonly string[];
  onToggleSelect: (cardId: string) => void;
  disabled?: boolean;
}

export const PlayerHand: React.FC<PlayerHandProps> = ({
  cards,
  selectedCardIds,
  onToggleSelect,
  disabled = false,
}) => {
  const selectedSet = new Set(selectedCardIds);

  // Sort hand: Jokers last, then rank (3 -> 13 -> 1 -> 2)
  const sortedCards = [...cards].sort((a, b) => {
    if (a.isJoker) return 1;
    if (b.isJoker) return -1;
    const rankValA = a.rank === 1 ? 14 : a.rank === 2 ? 15 : a.rank;
    const rankValB = b.rank === 1 ? 14 : b.rank === 2 ? 15 : b.rank;
    if (rankValA !== rankValB) return rankValA - rankValB;
    return a.suit.localeCompare(b.suit);
  });

  return (
    <div
      data-testid="player-hand"
      className="flex items-end justify-center overflow-x-auto py-4 px-2 w-full max-w-4xl -space-x-3 sm:-space-x-4 select-none scrollbar-thin"
    >
      {sortedCards.map((card) => (
        <div key={card.id} className="flex-shrink-0 transition-transform duration-150">
          <CardView
            card={card}
            isSelected={selectedSet.has(card.id)}
            onClick={() => onToggleSelect(card.id)}
            disabled={disabled}
          />
        </div>
      ))}
    </div>
  );
};
