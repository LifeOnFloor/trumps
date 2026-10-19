import React from 'react';
import type { PlayMeld } from '../../core/rules/daifugo/types.js';
import type { Suit } from '../../core/types/card.js';
import { CardView } from './CardView.js';

export interface GameTableProps {
  lastPlay: PlayMeld | null;
  isRevolution: boolean;
  lockedSuits: readonly Suit[] | null;
}

const SUIT_SYMBOLS: Record<Suit, string> = {
  spade: '♠',
  heart: '♥',
  diamond: '♦',
  club: '♣',
};

export const GameTable: React.FC<GameTableProps> = ({
  lastPlay,
  isRevolution,
  lockedSuits,
}) => {
  return (
    <div className="relative flex flex-col items-center justify-center w-full max-w-lg h-56 sm:h-64 rounded-2xl bg-emerald-900/60 border-2 border-emerald-700/50 shadow-inner p-4 my-2">
      {/* Revolution Badge */}
      {isRevolution && (
        <div
          data-testid="revolution-badge"
          className="absolute top-2 left-3 px-3 py-1 bg-red-600 border border-red-300 text-white font-extrabold text-xs tracking-wider rounded-md uppercase shadow-md"
        >
          REVOLUTION
        </div>
      )}

      {/* Suit Lock Badge */}
      {lockedSuits && lockedSuits.length > 0 && (
        <div
          data-testid="suit-lock-badge"
          className="absolute top-2 right-3 px-3 py-1 bg-blue-600 text-white font-bold text-xs rounded-md shadow-md flex items-center space-x-1"
        >
          <span>縛り:</span>
          <span>{lockedSuits.map((s) => SUIT_SYMBOLS[s]).join(' ')}</span>
        </div>
      )}

      {/* Center Table Area */}
      {lastPlay && lastPlay.cards.length > 0 ? (
        <div data-testid="table-cards" className="flex items-center justify-center -space-x-3 sm:-space-x-4">
          {lastPlay.cards.map((card) => (
            <div key={card.id} className="transition-transform duration-300">
              <CardView card={card} disabled />
            </div>
          ))}
        </div>
      ) : (
        <div
          data-testid="table-placeholder"
          className="text-emerald-300/60 font-semibold text-sm tracking-wide"
        >
          場が流れています
        </div>
      )}
    </div>
  );
};
