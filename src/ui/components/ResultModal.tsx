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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
    >
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-sm text-center shadow-2xl">
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
                className="flex items-center justify-between p-2.5 rounded-lg bg-gray-800/80 border border-gray-700 text-sm"
              >
                <span className="font-extrabold text-yellow-500">{title}</span>
                <span className="font-bold text-gray-200">{player?.name ?? playerId}</span>
              </div>
            );
          })}
        </div>

        {onRestart && (
          <button
            type="button"
            onClick={onRestart}
            className="w-full py-3 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-gray-900 font-extrabold shadow-lg transition active:scale-95"
          >
            もう一度遊ぶ
          </button>
        )}
      </div>
    </div>
  );
};
