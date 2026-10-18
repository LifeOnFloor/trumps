import React from 'react';

export interface GameOption {
  id: string;
  title: string;
  subtitle: string;
  players: string;
  icon: string;
  isAvailable: boolean;
  hasChips: boolean;
}

export const AVAILABLE_GAMES: readonly GameOption[] = [
  {
    id: 'daifugo',
    title: '大富豪',
    subtitle: 'Daifugo',
    players: '3〜8人',
    icon: '👑',
    isAvailable: true,
    hasChips: true,
  },
  {
    id: 'old-maid',
    title: 'ババ抜き',
    subtitle: 'Old Maid',
    players: '3〜6人',
    icon: '🃏',
    isAvailable: false,
    hasChips: true,
  },
  {
    id: 'sevens',
    title: '七並べ',
    subtitle: 'Sevens',
    players: '3〜5人',
    icon: '7️⃣',
    isAvailable: false,
    hasChips: true,
  },
  {
    id: 'blackjack',
    title: 'ブラックジャック',
    subtitle: 'Blackjack',
    players: '1〜7人',
    icon: '♠️',
    isAvailable: false,
    hasChips: true,
  },
] as const;

export interface GameSelectorProps {
  selectedGameId: string;
  onSelectGame: (gameId: string) => void;
}

export const GameSelector: React.FC<GameSelectorProps> = ({
  selectedGameId,
  onSelectGame,
}) => {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs font-bold text-emerald-300">
        <span>ゲームを選択</span>
        <span className="text-[11px] text-emerald-400/80">順次追加中</span>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        {AVAILABLE_GAMES.map((game) => {
          const isSelected = selectedGameId === game.id;
          return (
            <button
              key={game.id}
              type="button"
              disabled={!game.isAvailable}
              onClick={() => game.isAvailable && onSelectGame(game.id)}
              className={`relative flex flex-col items-start p-3 rounded-2xl border text-left transition-all duration-150 ${
                isSelected
                  ? 'bg-yellow-500/20 border-yellow-400 ring-2 ring-yellow-400/80 shadow-lg'
                  : game.isAvailable
                  ? 'bg-emerald-900/60 border-emerald-700/60 hover:border-emerald-500 hover:bg-emerald-900/80'
                  : 'bg-emerald-950/40 border-emerald-900/40 opacity-50 cursor-not-allowed'
              }`}
            >
              {!game.isAvailable && (
                <span className="absolute top-2 right-2 text-[10px] font-black px-1.5 py-0.5 rounded bg-gray-800 text-gray-300 border border-gray-700">
                  Coming Soon
                </span>
              )}
              {game.isAvailable && (
                <span className="absolute top-2 right-2 text-[10px] font-black px-1.5 py-0.5 rounded bg-yellow-400 text-gray-950">
                  PLAYABLE
                </span>
              )}

              <div className="text-2xl mb-1">{game.icon}</div>
              <div className="font-extrabold text-sm text-white tracking-wide">
                {game.title}
              </div>
              <div className="text-[11px] text-emerald-300 font-medium">
                {game.players} • {game.hasChips ? '💰 チップ対応' : ''}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
