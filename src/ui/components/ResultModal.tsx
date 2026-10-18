import React from 'react';
import type { SanitizedPlayerState } from '../../core/types/engine.js';

export interface ResultModalProps {
  rankings: readonly string[];
  players: readonly SanitizedPlayerState[];
  onRestart?: () => void;
}

const RANK_TITLES = ['大富豪', '富豪', '平民', '貧民', '大貧民'];

export const ResultModal: React.FC<ResultModalProps> = ({
  rankings,
  players,
  onRestart,
}) => {
  const playerMap = new Map(players.map((p) => [p.id, p]));

  return (
    <div
      data-testid="result-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in"
    >
      <div className="bg-emerald-950/95 border border-yellow-500/50 rounded-3xl p-6 w-full max-w-sm text-center shadow-2xl">
        <div className="text-3xl mb-1">🏆</div>
        <h2 className="text-2xl font-black text-yellow-400 mb-4 tracking-wider">
          GAME OVER
        </h2>

        <div className="space-y-2 mb-6">
          {rankings.map((playerId, idx) => {
            const player = playerMap.get(playerId);
            const title = RANK_TITLES[idx] ?? `${idx + 1}位`;
            return (
              <div
                key={playerId}
                className="flex items-center justify-between p-3 rounded-2xl bg-emerald-900/80 border border-emerald-700/80 text-sm shadow-sm"
              >
                <div className="flex items-center space-x-2">
                  <span className="font-black text-yellow-400 bg-emerald-950 px-2 py-0.5 rounded-lg border border-yellow-500/30 text-xs">
                    {title}
                  </span>
                  <span className="font-extrabold text-gray-100">{player?.name ?? playerId}</span>
                </div>

                {player?.chips !== undefined && (
                  <div className="flex items-center space-x-1 font-black text-yellow-400 text-xs">
                    <span>🪙</span>
                    <span>{player.chips.toLocaleString()}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {onRestart && (
          <button
            type="button"
            onClick={onRestart}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-gray-950 font-black shadow-lg shadow-yellow-500/30 transition active:scale-95"
          >
            もう一度遊ぶ
          </button>
        )}
      </div>
    </div>
  );
};
