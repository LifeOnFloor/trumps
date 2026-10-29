import React from 'react';
import type { SanitizedPlayerState } from '../../core/types/engine.js';
import { useTranslation } from '../../i18n/context.js';

export interface ResultModalProps {
  rankings: readonly string[];
  players: readonly SanitizedPlayerState[];
  isHost?: boolean;
  onNextRound?: () => void;
  onRestart?: () => void;
  onRewardAdWatched?: () => void;
}

export const ResultModal: React.FC<ResultModalProps> = ({
  rankings,
  players,
  isHost = false,
  onNextRound,
  onRestart,
  onRewardAdWatched,
}) => {
  const { t, language } = useTranslation();
  const [hasWatchedReward, setHasWatchedReward] = React.useState(false);
  const playerMap = new Map(players.map((p) => [p.id, p]));

  const rankTitles = [
    t.results.ranks.daifugo,
    t.results.ranks.fugo,
    t.results.ranks.heimin,
    t.results.ranks.hinmin,
    t.results.ranks.daihinmin,
  ];

  const handleWatchRewardAd = () => {
    setHasWatchedReward(true);
    if (onRewardAdWatched) {
      onRewardAdWatched();
    }
  };

  const hasChipsSystem = players.some((p) => p.chips !== undefined);

  return (
    <div
      data-testid="result-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 animate-in fade-in"
    >
      <div className="bg-emerald-950/95 border border-yellow-500/50 rounded-3xl p-6 w-full max-w-sm text-center shadow-2xl">
        <div className="text-3xl mb-1">🏆</div>
        <h2 className="text-2xl font-black text-yellow-400 mb-3 tracking-wider">
          {t.results.gameOver}
        </h2>

        <div className="space-y-1.5 mb-4">
          {rankings.map((playerId, idx) => {
            const player = playerMap.get(playerId);
            const title = rankTitles[idx] ?? (language === 'en' ? `#${idx + 1}` : `${idx + 1}位`);
            return (
              <div
                key={playerId}
                className="flex items-center justify-between p-2.5 rounded-2xl bg-emerald-900/80 border border-emerald-700/80 text-sm shadow-sm"
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
                    <span>{player.chips < 0 ? `🔴 ${t.table.debt}` : '🪙'}</span>
                    <span>{player.chips.toLocaleString()}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Rewarded Ad Recovery Section */}
        {hasChipsSystem && (
          <div className="mb-4 p-2.5 rounded-2xl bg-amber-950/70 border border-yellow-500/40 text-center">
            {hasWatchedReward ? (
              <div className="text-xs font-bold text-yellow-300 py-1 flex items-center justify-center space-x-1">
                <span>✨</span>
                <span>チップ回復ボーナスを獲得しました！</span>
              </div>
            ) : (
              <div>
                <p className="text-[11px] text-amber-200/90 mb-1.5">
                  📺 動画広告を視聴して 500 チップ補給
                </p>
                <button
                  type="button"
                  data-testid="reward-ad-button"
                  onClick={handleWatchRewardAd}
                  className="w-full py-2 rounded-xl bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-300 text-gray-950 font-black text-xs shadow transition active:scale-95"
                >
                  リワード広告を見てチップ回復
                </button>
              </div>
            )}
          </div>
        )}

        <div className="space-y-2.5">
          {onNextRound && (
            isHost ? (
              <button
                type="button"
                data-testid="next-round-button"
                onClick={onNextRound}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-gray-950 font-black shadow-lg shadow-yellow-500/30 transition active:scale-95 text-sm"
              >
                👑 {t.results.startNextGame}
              </button>
            ) : (
              <div
                data-testid="waiting-next-round"
                className="text-xs text-yellow-300 font-bold bg-emerald-900/80 p-3 rounded-2xl border border-emerald-700/60"
              >
                {t.results.waitingForHost}
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
              {t.results.backToLobby}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
