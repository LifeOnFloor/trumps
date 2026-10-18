import React from 'react';
import type { SanitizedPlayerState } from '../../core/types/engine.js';

export interface OpponentSeatProps {
  player: SanitizedPlayerState;
  isCurrentTurn: boolean;
}

export const OpponentSeat: React.FC<OpponentSeatProps> = ({
  player,
  isCurrentTurn,
}) => {
  return (
    <div
      data-testid={`opponent-${player.id}`}
      className={`flex flex-col items-center p-2 rounded-xl border transition-all ${
        isCurrentTurn
          ? 'bg-amber-500/20 border-amber-400 shadow-md ring-2 ring-amber-400'
          : 'bg-emerald-800/40 border-emerald-700/50'
      }`}
    >
      <div className="flex items-center space-x-1.5 mb-1">
        <span className="font-bold text-xs sm:text-sm text-gray-100 max-w-[90px] truncate">
          {player.name}
        </span>
        {player.isFinished && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500 text-gray-900 font-black">
            {player.rankPosition ? `${player.rankPosition}位` : 'Finish'}
          </span>
        )}
      </div>

      <div className="flex items-center space-x-1 text-xs text-emerald-200">
        {/* Card back visual */}
        <div className="w-6 h-8 rounded bg-blue-700 border border-blue-400 shadow flex items-center justify-center font-bold text-[10px] text-white">
          🂠
        </div>
        <span className="font-bold">× {player.handCount}</span>
      </div>
    </div>
  );
};
