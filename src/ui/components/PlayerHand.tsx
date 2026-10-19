import React, { useRef } from 'react';
import type { Card } from '../../core/types/card.js';
import { CardView } from './CardView.js';
import { playTapSound } from '../utils/sound.js';

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
  const selectedSet = new Set(selectedCardIds);
  const touchedCardIdsRef = useRef<Set<string>>(new Set());

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

  const handleTouchStart = () => {
    touchedCardIdsRef.current.clear();
  };

  const handleTouchEnd = () => {
    touchedCardIdsRef.current.clear();
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (disabled) return;
    const touch = e.touches[0];
    if (!touch || typeof document === 'undefined' || !document.elementFromPoint) return;
    const targetElement = document.elementFromPoint(touch.clientX, touch.clientY);
    const cardEl = targetElement?.closest?.('[data-card-id]');
    if (cardEl) {
      const cardId = cardEl.getAttribute('data-card-id');
      if (cardId && !touchedCardIdsRef.current.has(cardId)) {
        touchedCardIdsRef.current.add(cardId);
        handleToggle(cardId);
      }
    }
  };

  return (
    <div className="flex flex-col items-center w-full max-w-4xl">
      {/* Hand status bar: selected count and chips */}
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
              <span>{chips < 0 ? '🔴 借金' : '🪙'}</span>
              <span>{chips.toLocaleString()}</span>
            </div>
          )}
          <span className="text-emerald-200/90 font-bold">
            手札: {cards.length}枚
          </span>
        </div>

        {selectedCardIds.length > 0 && (
          <span className="font-extrabold text-yellow-300 bg-emerald-900 px-2.5 py-0.5 rounded-full border border-yellow-400/80 shadow-md">
            {selectedCardIds.length}枚選択中
          </span>
        )}
      </div>

      <div
        data-testid="player-hand"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="w-full overflow-x-auto py-3 px-4 sm:px-6 select-none scrollbar-thin touch-pan-x flex items-end"
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
