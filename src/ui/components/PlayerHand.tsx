import React from 'react';
import type { Card } from '../../core/types/card.js';
import { CardView } from './CardView.js';
import { playTapSound } from '../utils/sound.js';
import { useTranslation } from '../../i18n/context.js';

export interface PlayerHandProps {
  cards: readonly Card[];
  selectedCardIds: readonly string[];
  onToggleSelect: (cardId: string) => void;
  disabled?: boolean;
  chips?: number;
}

export const PlayerHand: React.FC<PlayerHandProps> = ({
  cards,
  selectedCardIds,
  onToggleSelect,
  disabled = false,
  chips,
}) => {
  const { t } = useTranslation();
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

  const handleToggle = (cardId: string) => {
    if (disabled) return;
    playTapSound();
    onToggleSelect(cardId);
  };

  return (
    <div className="flex flex-col items-center w-full max-w-4xl">
      {/* Hand status bar: selected count and chips */}
      {(chips !== undefined || selectedCardIds.length > 0) && (
        <div className="flex items-center justify-between w-full px-4 mb-1 text-xs">
          <div className="flex items-center space-x-2">
            {chips !== undefined && (
              <div
                data-testid="my-chips"
                className={`flex items-center space-x-1 font-black px-3 py-1 rounded-full border shadow-sm ${
                  chips < 0
                    ? 'bg-red-950/95 text-red-400 border-red-500/80'
                    : 'bg-emerald-950/90 text-yellow-400 border-yellow-500/50'
                }`}
              >
                <span>{chips < 0 ? `🔴 ${t.table.debt}` : '🪙'}</span>
                <span>{chips.toLocaleString()}</span>
              </div>
            )}
          </div>

          {selectedCardIds.length > 0 && (
            <span className="font-extrabold text-yellow-300 bg-emerald-900 px-2.5 py-0.5 rounded-full border border-yellow-400/80 shadow-md">
              {selectedCardIds.length} {t.table.selectedCount}
            </span>
          )}
        </div>
      )}

      <div
        data-testid="player-hand"
        className="w-full overflow-x-auto py-2 px-4 sm:px-6 select-none scrollbar-thin touch-pan-x flex items-end"
      >
        <div
          className={`flex items-end m-auto transition-all ${
            sortedCards.length > 12
              ? '-space-x-5 sm:-space-x-5'
              : sortedCards.length > 8
              ? '-space-x-4 sm:-space-x-4'
              : '-space-x-3 sm:-space-x-4'
          }`}
        >
          {sortedCards.map((card) => (
            <div
              key={card.id}
              data-card-id={card.id}
              className="flex-shrink-0 transition-transform duration-150"
            >
              <CardView
                card={card}
                isSelected={selectedSet.has(card.id)}
                onClick={() => handleToggle(card.id)}
                disabled={disabled}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
