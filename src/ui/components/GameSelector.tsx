import React, { useState, useMemo } from 'react';
import type { GameCategory, GameMetadata } from '../../catalog/types.js';
import { GAME_CATALOG } from '../../catalog/games.js';
import { filterGameCatalog } from '../../catalog/search.js';
import { useTranslation } from '../../i18n/context.js';

export interface GameSelectorProps {
  selectedGameId: string;
  onSelectGame: (gameId: string) => void;
}

export const GameSelector: React.FC<GameSelectorProps> = ({
  selectedGameId,
  onSelectGame,
}) => {
  const { t, language } = useTranslation();

  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<GameCategory | 'all'>('all');
  const [playerFilter, setPlayerFilter] = useState<number | 'all'>('all');
  const [chipsOnly, setChipsOnly] = useState(false);
  const [detailGame, setDetailGame] = useState<GameMetadata | null>(null);

  const categories: { id: GameCategory | 'all'; label: string; icon: string }[] = useMemo(
    () => [
      { id: 'all', label: t.catalog.allCategories, icon: '🃏' },
      { id: 'climbing', label: t.catalog.climbing, icon: '👑' },
      { id: 'trickTaking', label: t.catalog.trickTaking, icon: '♠️' },
      { id: 'casino', label: t.catalog.casino, icon: '🎰' },
      { id: 'matching', label: t.catalog.matching, icon: '🂠' },
      { id: 'solitaire', label: t.catalog.solitaire, icon: '🎴' },
      { id: 'party', label: t.catalog.party, icon: '⚡' },
    ],
    [t]
  );

  const filteredGames = useMemo(() => {
    return filterGameCatalog(GAME_CATALOG, {
      query,
      category: selectedCategory,
      playerCount: playerFilter,
      chipsOnly,
      language,
    });
  }, [query, selectedCategory, playerFilter, chipsOnly, language]);

  return (
    <div className="space-y-3">
      {/* Search Input Bar */}
      <div className="relative w-full">
        <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-emerald-400">
          🔍
        </span>
        <input
          type="search"
          data-testid="game-search-input"
          placeholder={t.catalog.searchPlaceholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full pl-9 pr-9 py-2.5 rounded-2xl bg-emerald-950/90 border border-emerald-700/80 text-white placeholder-emerald-400/60 font-medium text-xs focus:outline-none focus:ring-2 focus:ring-yellow-400 shadow-inner"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-emerald-400 hover:text-white"
            aria-label={language === 'en' ? 'Clear search' : '検索クリア'}
          >
            ✕
          </button>
        )}
      </div>

      {/* Category Filter Pills (Horizontal Scrollable) */}
      <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-none select-none text-xs">
        {categories.map((cat) => {
          const isActive = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex items-center space-x-1 px-3 py-1.5 rounded-full font-bold whitespace-nowrap transition-all flex-shrink-0 ${
                isActive
                  ? 'bg-yellow-400 text-gray-950 shadow-md scale-105'
                  : 'bg-emerald-950/70 border border-emerald-800 text-emerald-200 hover:border-emerald-600'
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Quick Filters Row: Player count and Chips only */}
      <div className="flex items-center justify-between text-[11px] text-emerald-200 px-1">
        <div className="flex items-center space-x-1">
          <span>👥</span>
          {(['all', 1, 2, 3, 4] as const).map((count) => {
            const isCountActive = playerFilter === count;
            const label =
              count === 'all'
                ? t.catalog.allPlayers
                : count === 4
                ? t.catalog.fourPlusPlayers
                : language === 'en'
                ? `${count}P`
                : `${count}人`;
            return (
              <button
                key={String(count)}
                type="button"
                onClick={() => setPlayerFilter(count)}
                className={`px-2 py-0.5 rounded-md font-bold transition ${
                  isCountActive
                    ? 'bg-emerald-700 text-white border border-yellow-400/60'
                    : 'hover:text-white'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        <label className="flex items-center space-x-1.5 cursor-pointer font-bold select-none hover:text-white">
          <input
            type="checkbox"
            checked={chipsOnly}
            onChange={(e) => setChipsOnly(e.target.checked)}
            className="accent-yellow-400 rounded w-3.5 h-3.5"
          />
          <span>{t.catalog.chipsOnly}</span>
        </label>
      </div>

      {/* Results Count Summary */}
      <div className="text-[11px] font-bold text-emerald-400/80 px-1">
        {filteredGames.length} {t.catalog.gamesFound}
      </div>

      {/* Games List Grid (Scrollable, designed for 100+ items) */}
      <div
        data-testid="games-grid"
        className="grid grid-cols-2 gap-2 sm:gap-2.5 max-h-56 overflow-y-auto pr-1 scrollbar-thin"
      >
        {filteredGames.map((game) => {
          const isSelected = selectedGameId === game.id;
          const gameTitle = game.name[language] || game.name.ja;
          return (
            <div
              key={game.id}
              data-testid={`game-card-${game.id}`}
              onClick={() => game.isPlayable && onSelectGame(game.id)}
              className={`relative flex flex-col justify-between p-3 rounded-2xl border text-left transition-all duration-150 cursor-pointer ${
                isSelected
                  ? 'bg-yellow-500/20 border-yellow-400 ring-2 ring-yellow-400 shadow-md'
                  : game.isPlayable
                  ? 'bg-emerald-950/70 border-emerald-700/60 hover:border-emerald-500 hover:bg-emerald-900/60'
                  : 'bg-emerald-950/40 border-emerald-900/40 opacity-55'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-2xl">{game.icon}</span>
                  {game.isPlayable ? (
                    <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-yellow-400 text-gray-950 shadow-sm">
                      {t.lobby.playable}
                    </span>
                  ) : (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-gray-800 text-gray-400 border border-gray-700">
                      {t.lobby.comingSoon}
                    </span>
                  )}
                </div>

                <div className="font-black text-xs sm:text-sm text-white tracking-wide truncate">
                  {gameTitle}
                </div>
                <div className="text-[10px] text-emerald-300/80 line-clamp-1 mb-1">
                  {game.description[language] || game.description.ja}
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-emerald-800/40 text-[10px] text-emerald-300 font-medium">
                <span>
                  👥{' '}
                  {game.players.min === game.players.max
                    ? language === 'en'
                      ? `${game.players.min}P`
                      : `${game.players.min}人`
                    : language === 'en'
                    ? `${game.players.min}-${game.players.max}P`
                    : `${game.players.min}〜${game.players.max}人`}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDetailGame(game);
                  }}
                  className="text-yellow-400 hover:text-yellow-200 font-bold px-1 hover:underline"
                  title={language === 'en' ? 'View details' : '詳細を見る'}
                >
                  ℹ️ {language === 'en' ? 'Details' : '詳細'}
                </button>
              </div>
            </div>
          );
        })}

        {filteredGames.length === 0 && (
          <div className="col-span-2 py-8 text-center text-xs text-emerald-300/60 font-bold">
            {t.catalog.noGamesFound}
          </div>
        )}
      </div>

      {/* Game Detail Modal */}
      {detailGame && (
        <div
          data-testid="game-detail-modal"
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in"
          onClick={() => setDetailGame(null)}
        >
          <div
            className="bg-emerald-950 border border-emerald-600 rounded-3xl p-6 w-full max-w-sm text-gray-100 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-emerald-800">
              <div className="flex items-center space-x-2">
                <span className="text-3xl">{detailGame.icon}</span>
                <div>
                  <h3 className="font-black text-lg text-yellow-400">
                    {detailGame.name[language] || detailGame.name.ja}
                  </h3>
                  <div className="text-xs text-emerald-300 font-bold">{detailGame.subtitle}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDetailGame(null)}
                className="w-8 h-8 rounded-full bg-emerald-900 text-gray-300 hover:text-white flex items-center justify-center font-bold"
              >
                ✕
              </button>
            </div>

            <div className="text-xs text-emerald-100/90 leading-relaxed space-y-2">
              <p>{detailGame.description[language] || detailGame.description.ja}</p>
              <div className="p-2.5 rounded-xl bg-emerald-900/60 border border-emerald-700/60">
                <div className="font-bold text-yellow-300 mb-0.5">
                  {language === 'en' ? 'Rules Summary:' : 'ルール概要:'}
                </div>
                <p className="text-[11px] text-emerald-200">
                  {detailGame.rulesSummary[language] || detailGame.rulesSummary.ja}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs font-bold pt-2 border-t border-emerald-800">
              <span>
                {language === 'en'
                  ? `Players: ${detailGame.players.min}-${detailGame.players.max}`
                  : `プレイ人数: ${detailGame.players.min}〜${detailGame.players.max}人`}
              </span>
              <span>
                {detailGame.hasChips
                  ? language === 'en'
                    ? '💰 Chips'
                    : '💰 チップ戦対応'
                  : language === 'en'
                  ? 'No Chips'
                  : 'チップ戦なし'}
              </span>
            </div>

            <button
              type="button"
              disabled={!detailGame.isPlayable}
              onClick={() => {
                if (detailGame.isPlayable) {
                  onSelectGame(detailGame.id);
                  setDetailGame(null);
                }
              }}
              className={`w-full py-3 rounded-2xl font-black text-sm shadow-md transition active:scale-95 ${
                detailGame.isPlayable
                  ? 'bg-yellow-400 hover:bg-yellow-300 text-gray-950 ring-2 ring-yellow-300'
                  : 'bg-emerald-950 text-gray-400 border border-emerald-800 cursor-not-allowed opacity-60'
              }`}
            >
              {detailGame.isPlayable
                ? language === 'en'
                  ? 'Select Game'
                  : 'このゲームを選択'
                : language === 'en'
                ? 'Coming Soon'
                : '開発中 (Coming Soon)'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
