import React from 'react';
import type { SanitizedPlayerState } from '../../core/types/engine.js';

export interface ResultModalProps {
  rankings: readonly string[];
  players: readonly SanitizedPlayerState[];
  isHost?: boolean;
  onNextRound?: () => void;
  onRestart?: () => void;
}

const RANK_TITLES = ['大富豪', '富豪', '平民', '貧民', '大貧民'];

export const ResultModal: React.FC<ResultModalProps> = ({
  rankings,
  players,
  isHost = false,
  onNextRound,
  onRestart,
}) => {
  const playerMap = new Map(players.map((p) => [p.id, p]));

  return (
    <div
      data-testid="result-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 animate-in fade-in"
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
                  <div className={`flex items-center space-x-1 font-black text-xs ${
                    player.chips < 0 ? 'text-red-400 font-bold' : 'text-yellow-400'
                  }`}>
                    <span>{player.chips < 0 ? '🔴 借金' : '🪙'}</span>
                    <span>{player.chips.toLocaleString()}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="space-y-2.5">
          {onNextRound && (
            isHost ? (
              <button
                type="button"
                data-testid="next-round-button"
                onClick={onNextRound}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-gray-950 font-black shadow-lg shadow-yellow-500/30 transition active:scale-95 text-sm"
              >
                👑 次のゲーム（再戦）を開始
              </button>
            ) : (
              <div
                data-testid="waiting-next-round"
                className="text-xs text-yellow-300 font-bold bg-emerald-900/80 p-3 rounded-2xl border border-emerald-700/60"
              >
                ホストが次のゲームを開始するのを待っています...
              </div>
            )
          )}

          {onRestart && (
            <button
              type="button"
              data-testid="restart-lobby-button"
              onClick={onRestart}
              className="w-full py-2.5 rounded-2xl bg-emerald-900/70 hover:bg-emerald-800 text-emerald-200 text-xs font-bold transition active:scale-95"
            >
              ロビーへ戻る
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
