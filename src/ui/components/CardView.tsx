import React from 'react';
import type { Card, Suit, Rank } from '../../core/types/card.js';

export interface CardViewProps {
  card: Card;
  isSelected?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  isFaceDown?: boolean;
  className?: string;
}

const SUIT_SYMBOLS: Record<Suit, string> = {
  spade: '♠',
  heart: '♥',
  diamond: '♦',
  club: '♣',
};

const SUIT_COLORS: Record<Suit, string> = {
  spade: 'text-gray-900',
  heart: 'text-red-600',
  diamond: 'text-red-600',
  club: 'text-gray-900',
};

function formatRank(rank: Rank): string {
  if (rank === 1) return 'A';
  if (rank === 11) return 'J';
  if (rank === 12) return 'Q';
  if (rank === 13) return 'K';
  return String(rank);
}

export const CardView: React.FC<CardViewProps> = ({
  card,
  isSelected = false,
  onClick,
  disabled = false,
  isFaceDown = false,
  className = '',
}) => {
  if (isFaceDown) {
    return (
      <div
        data-testid={`card-back-${card.id}`}
        className={`relative w-14 h-20 sm:w-16 sm:h-24 rounded-lg bg-indigo-900 border-2 border-indigo-300/80 shadow-md flex items-center justify-center p-1 select-none overflow-hidden ${className}`}
      >
        <div className="w-full h-full rounded border border-indigo-400/40 bg-gradient-to-br from-indigo-800 to-blue-950 flex items-center justify-center text-indigo-300/40 text-lg">
          ❖
        </div>
      </div>
    );
  }

  const isJoker = card.isJoker;

  return (
    <button
      type="button"
      data-testid={`card-${card.id}`}
      disabled={disabled}
      onClick={onClick}
      className={`relative w-14 h-20 sm:w-16 sm:h-24 rounded-lg bg-white shadow-md border flex flex-col justify-between p-1.5 cursor-pointer transition-all duration-200 select-none ${className} ${
        isSelected
          ? '-translate-y-4 shadow-xl ring-2 ring-yellow-400 border-yellow-400 selected z-20'
          : 'hover:-translate-y-1'
      } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
    >
      {isJoker ? (
        <div className="w-full h-full flex flex-col items-center justify-center text-purple-600 font-black">
          <span className="text-xs uppercase tracking-tighter">Joker</span>
          <span className="text-xl">★</span>
        </div>
      ) : (
        <>
          <div className={`flex items-center space-x-0.5 text-xs font-bold leading-none ${SUIT_COLORS[card.suit]}`}>
            <span>{SUIT_SYMBOLS[card.suit]}</span>
            <span>{formatRank(card.rank)}</span>
          </div>
          <div className={`text-center text-2xl font-black ${SUIT_COLORS[card.suit]}`}>
            {SUIT_SYMBOLS[card.suit]}
          </div>
          <div className={`flex items-center justify-end space-x-0.5 text-xs font-bold leading-none ${SUIT_COLORS[card.suit]}`}>
            <span>{formatRank(card.rank)}</span>
            <span>{SUIT_SYMBOLS[card.suit]}</span>
          </div>
        </>
      )}
    </button>
  );
};
