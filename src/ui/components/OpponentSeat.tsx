import React from 'react';
import type { SanitizedPlayerState } from '../../core/types/engine.js';
import { useTranslation } from '../../i18n/context.js';

export interface OpponentSeatProps {
  player: SanitizedPlayerState;
  isCurrentTurn: boolean;
  isDisconnected?: boolean;
}

export const OpponentSeat: React.FC<OpponentSeatProps> = ({
  player,
  isCurrentTurn,
  isDisconnected = false,
}) => {
  const { t, language } = useTranslation();

  return (
    <div
      data-testid={`opponent-${player.id}`}
      className={`relative flex flex-col items-center px-3 py-2 rounded-2xl border transition-all duration-300 min-w-[80px] sm:min-w-[100px] shadow-sm ${
        isDisconnected
          ? 'bg-red-950/40 border-red-800/60 opacity-60'
          : isCurrentTurn
          ? 'bg-gradient-to-b from-yellow-500/25 to-amber-600/30 border-yellow-400 ring-2 ring-yellow-400 shadow-yellow-500/20 shadow-lg scale-105'
          : 'bg-emerald-900/90 border-emerald-700/60'
      }`}
    >
      {isDisconnected && (
        <span
          data-testid={`disconnected-badge-${player.id}`}
          className="absolute -top-2 px-1.5 py-0.5 rounded-full bg-red-600 text-white font-black text-[9px] shadow-md border border-red-400"
        >
          {t.table.disconnected}
        </span>
      )}

      <div className="flex items-center space-x-1.5 mb-1.5 w-full justify-center">
        <span className="font-extrabold text-xs sm:text-sm text-gray-100 max-w-[80px] sm:max-w-[110px] truncate">
          {player.name}
        </span>
        {player.isFinished && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-yellow-400 text-gray-950 font-black shadow-sm">
            {player.rankPosition
              ? language === 'en'
                ? `#${player.rankPosition}`
                : `${player.rankPosition}位`
              : 'Finish'}
          </span>
        )}
      </div>

      <div className="flex items-center space-x-2 text-xs">
        {/* Card back visual */}
        <div className="flex items-center space-x-1 font-extrabold text-emerald-200">
          <div className="w-5 h-7 sm:w-6 sm:h-8 rounded bg-gradient-to-br from-blue-700 to-indigo-900 border border-blue-400/80 shadow flex items-center justify-center text-[10px] text-white">
            🂠
          </div>
          <span>× {player.handCount}</span>
        </div>

        {/* Chips display if available */}
        {player.chips !== undefined && (
          <div
            data-testid={`chips-${player.id}`}
            className={`flex items-center space-x-0.5 font-black text-[11px] px-1.5 py-0.5 rounded-full border ${
              player.chips < 0
                ? 'bg-red-950/95 text-red-400 border-red-500/80 shadow-sm'
                : 'bg-emerald-950/80 text-yellow-400 border-yellow-500/40'
            }`}
          >
            <span>{player.chips < 0 ? `🔴 ${t.table.debt}` : '🪙'}</span>
            <span>{player.chips.toLocaleString()}</span>
          </div>
        )}
      </div>
    </div>
  );
};
