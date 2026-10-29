import React, { useMemo } from 'react';
import { DEFAULT_DAIFUGO_CONFIG, type DaifugoConfig } from '../../core/rules/daifugo/config.js';
import { useTranslation } from '../../i18n/context.js';
import { GAME_CATALOG } from '../../catalog/games.js';

export interface RulesModalProps {
  isOpen: boolean;
  gameId?: string;
  config?: DaifugoConfig;
  onClose: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({
  isOpen,
  gameId = 'daifugo',
  config = DEFAULT_DAIFUGO_CONFIG,
  onClose,
}) => {
  const { t, language } = useTranslation();

  const activeGame = useMemo(() => {
    return GAME_CATALOG.find((g) => g.id === gameId);
  }, [gameId]);

  const modalTitle = useMemo(() => {
    if (gameId === 'shinkei-suijaku') {
      return '神経衰弱 ルール';
    }
    if (gameId === 'klondike') {
      return 'ソリティア（クロンダイク） ルール';
    }
    if (gameId && gameId !== 'daifugo') {
      if (activeGame) {
        return `${activeGame.name[language] || activeGame.name.ja} ルール`;
      }
    }
    return t.rules.title;
  }, [gameId, activeGame, language, t.rules.title]);

  const modalIcon = useMemo(() => {
    if (gameId === 'shinkei-suijaku') return '🧠';
    if (gameId === 'klondike') return '🎴';
    if (activeGame?.icon) return activeGame.icon;
    return '📋';
  }, [gameId, activeGame]);

  if (!isOpen) return null;

  const daifugoCategories = [
    {
      title: t.rules.categories.action,
      items: [
        { name: t.rules.eightCutTitle, enabled: config.eightCut, desc: t.rules.eightCutDesc },
        { name: t.rules.elevenBackTitle, enabled: config.elevenBack, desc: t.rules.elevenBackDesc },
        { name: t.rules.fiveSkipTitle, enabled: config.fiveSkip, desc: t.rules.fiveSkipDesc },
        { name: t.rules.sevenPassTitle, enabled: config.sevenPass, desc: t.rules.sevenPassDesc },
        { name: t.rules.tenDiscardTitle, enabled: config.tenDiscard, desc: t.rules.tenDiscardDesc },
      ],
    },
    {
      title: t.rules.categories.revolution,
      items: [
        { name: t.rules.revolutionTitle, enabled: config.revolution, desc: t.rules.revolutionDesc },
        { name: t.rules.sandstormTitle, enabled: config.sandstorm, desc: t.rules.sandstormDesc },
        {
          name: `${t.rules.nineEffectTitle}${
            config.nineEffect === 'reverse'
              ? language === 'en'
                ? ' (Reverse)'
                : '（9リバース）'
              : config.nineEffect === 'revolution'
              ? language === 'en'
                ? ' (Revolution)'
                : '（9一時革命）'
              : ''
          }`,
          enabled: config.nineEffect !== 'none',
          desc: `${t.rules.nineEffectDesc} [${
            config.nineEffect === 'reverse'
              ? language === 'en'
                ? '9-Reverse'
                : '9リバース'
              : config.nineEffect === 'revolution'
              ? language === 'en'
                ? '9-Revolution'
                : '9一時革命'
              : 'OFF'
          }]`,
        },
      ],
    },
    {
      title: t.rules.categories.lock,
      items: [
        {
          name: `${t.rules.suitLockTitle}${
            config.suitLock === 'single'
              ? language === 'en'
                ? ' (Single Lock)'
                : '（片縛り）'
              : config.suitLock === 'double'
              ? language === 'en'
                ? ' (Double Lock)'
                : '（両縛り）'
              : config.suitLock === 'geki'
              ? language === 'en'
                ? ' (Super Lock)'
                : '（激縛り）'
              : ''
          }`,
          enabled: config.suitLock !== 'none',
          desc: `${t.rules.suitLockDesc} [${
            config.suitLock === 'single'
              ? language === 'en'
                ? 'Single Lock'
                : '片縛り'
              : config.suitLock === 'double'
              ? language === 'en'
                ? 'Double Lock'
                : '両縛り'
              : config.suitLock === 'geki'
              ? language === 'en'
                ? 'Super Lock'
                : '激縛り'
              : 'OFF'
          }]`,
        },
        { name: t.rules.sequenceLockTitle, enabled: config.sequenceLock, desc: t.rules.sequenceLockDesc },
        { name: t.rules.spadeThreeTitle, enabled: config.spadeThreeReturn, desc: t.rules.spadeThreeDesc },
        { name: t.rules.stairsTitle, enabled: config.stairs, desc: t.rules.stairsDesc },
      ],
    },
    {
      title: t.rules.categories.ending,
      items: [
        {
          name: t.rules.prohibitedEndingsTitle,
          enabled:
            config.prohibitedEndings.joker ||
            config.prohibitedEndings.eight ||
            config.prohibitedEndings.two,
          desc: t.rules.prohibitedEndingsDesc,
        },
        { name: t.rules.miyakoOchiTitle, enabled: config.miyakoOchi, desc: t.rules.miyakoOchiDesc },
        { name: t.rules.gekokujoTitle, enabled: config.gekokujo, desc: t.rules.gekokujoDesc },
      ],
    },
    {
      title: t.rules.categories.exchange,
      items: [
        { name: t.rules.cardExchangeTitle, enabled: config.cardExchange, desc: t.rules.cardExchangeDesc },
        {
          name: t.rules.chipsTitle,
          enabled: !!config.chipsMode,
          desc:
            (config.baseAnte ?? config.ante ?? 0) > 0
              ? `🪙 ${language === 'en' ? 'Ante' : 'アンティ'}: ${config.baseAnte ?? config.ante}${
                  config.chipSettlementType === 'pot_split' ? ' / 🏺 Pot' : ''
                }`
              : t.rules.chipsDesc,
        },
      ],
    },
  ];

  return (
    <div
      data-testid="rules-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="rules-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative bg-emerald-950/95 border border-emerald-600/70 rounded-3xl p-5 sm:p-6 w-full max-w-lg shadow-2xl max-h-[85vh] flex flex-col overflow-hidden text-gray-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-emerald-800">
          <div className="flex items-center space-x-2">
            <span className="text-xl">{modalIcon}</span>
            <h2 id="rules-title" className="text-lg font-black text-yellow-400 tracking-wider">
              {modalTitle}
            </h2>
          </div>
          <button
            type="button"
            data-testid="close-rules-button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-emerald-900/80 hover:bg-emerald-800 text-gray-300 hover:text-white font-bold transition"
            aria-label={t.rules.close}
          >
            ✕
          </button>
        </div>

        <div className="overflow-y-auto py-3 space-y-4 flex-1 scrollbar-thin pr-1">
          {gameId === 'shinkei-suijaku' ? (
            <div className="space-y-3">
              <div className="p-3 rounded-2xl bg-emerald-900/60 border border-emerald-700/80">
                <div className="font-extrabold text-xs text-yellow-300 mb-1 flex items-center space-x-1.5">
                  <span>🎯</span>
                  <span>ゲームの目的</span>
                </div>
                <p className="text-[11px] text-emerald-200/90 leading-relaxed">
                  伏せられた52枚のカードから同じ数字（ランク）の2枚を揃えてペアを獲得するゲームです。
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-emerald-900/60 border border-emerald-700/80">
                <div className="font-extrabold text-xs text-yellow-300 mb-1 flex items-center space-x-1.5">
                  <span>🃏</span>
                  <span>カード構成</span>
                </div>
                <p className="text-[11px] text-emerald-200/90 leading-relaxed">
                  ジョーカーを除く標準52枚のトランプを使用します。すべてのカードが裏向きで格子状に配置されます。
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-emerald-900/60 border border-emerald-700/80 space-y-1.5">
                <div className="font-extrabold text-xs text-yellow-300 mb-1 flex items-center space-x-1.5">
                  <span>🔄</span>
                  <span>手番の流れ</span>
                </div>
                <div className="text-[11px] text-emerald-200/90 leading-relaxed space-y-1.5">
                  <div>1. 手番のプレイヤーは、裏向きのカードを2枚めくります。</div>
                  <div className="p-2 rounded-xl bg-emerald-950/80 border border-yellow-400/40">
                    <span className="font-bold text-yellow-300">ペア成立（同じ数字）:</span> めくった2枚を獲得！続けてもう一度自分の手番を行えます（連続手番）。
                  </div>
                  <div className="p-2 rounded-xl bg-emerald-950/80 border border-emerald-800/60">
                    <span className="font-bold text-emerald-300">不成立（違う数字）:</span> 2枚とも元の位置に裏向きに戻し、次のプレイヤーに手番が回ります。
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-emerald-900/60 border border-emerald-700/80">
                <div className="font-extrabold text-xs text-yellow-300 mb-1 flex items-center space-x-1.5">
                  <span>🏆</span>
                  <span>勝利・終了条件</span>
                </div>
                <p className="text-[11px] text-emerald-200/90 leading-relaxed">
                  すべてのペア（計26ペア）が取られた時点で終了。最も多くのペアを獲得したプレイヤーの勝利です（同数の場合は引き分け）。
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-emerald-900/60 border border-emerald-700/80">
                <div className="font-extrabold text-xs text-yellow-300 mb-1 flex items-center space-x-1.5">
                  <span>⏱️</span>
                  <span>一人で遊ぶ（タイムアタック）</span>
                </div>
                <p className="text-[11px] text-emerald-200/90 leading-relaxed">
                  全52枚（26ペア）をめくり切るまでのクリアタイム（秒数）と、めくった合計手数を記録します。
                </p>
              </div>
            </div>
          ) : gameId === 'klondike' ? (
            <div className="space-y-3">
              <div className="p-3 rounded-2xl bg-emerald-900/60 border border-emerald-700/80">
                <div className="font-extrabold text-xs text-yellow-300 mb-1 flex items-center space-x-1.5">
                  <span>🎯</span>
                  <span>ゲームの目的</span>
                </div>
                <p className="text-[11px] text-emerald-200/90 leading-relaxed">
                  右上の4つの「組札（ファンデーション）」に、4つのスート（♠♥♦♣）ごとにAからKまで昇順にカードを重ね、全52枚を回収すればクリアです。
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-emerald-900/60 border border-emerald-700/80 space-y-1">
                <div className="font-extrabold text-xs text-yellow-300 mb-1 flex items-center space-x-1.5">
                  <span>🃏</span>
                  <span>場札（タブロー）の移動</span>
                </div>
                <p className="text-[11px] text-emerald-200/90 leading-relaxed">
                  赤（♥♦）と黒（♠♣）が交互になり、数字が1つ小さくなるようにカードを重ねられます（例: 黒の8の上に赤の7）。
                </p>
                <p className="text-[11px] text-emerald-200/90 leading-relaxed">
                  表向きのカード列はまとめて移動できます。空になった列には「K（キング）」またはKから始まる列のみ置くことができます。
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-emerald-900/60 border border-emerald-700/80">
                <div className="font-extrabold text-xs text-yellow-300 mb-1 flex items-center space-x-1.5">
                  <span>📦</span>
                  <span>山札（ストック）と捨て札</span>
                </div>
                <p className="text-[11px] text-emerald-200/90 leading-relaxed">
                  動かせるカードがなくなったら左上の山札をクリックしてカードをめくります。山札が空になったら、クリックすることで捨て札をリセットして再利用できます。
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-emerald-900/60 border border-emerald-700/80">
                <div className="font-extrabold text-xs text-yellow-300 mb-1 flex items-center space-x-1.5">
                  <span>⚡</span>
                  <span>自動移動（オートムーブ）</span>
                </div>
                <p className="text-[11px] text-emerald-200/90 leading-relaxed">
                  表向きのカードをクリックすると、組札または適切な場札へ自動的に移動を試みます。
                </p>
              </div>
            </div>
          ) : activeGame && gameId !== 'daifugo' ? (
            <div className="space-y-3">
              <div className="p-3 rounded-2xl bg-emerald-900/60 border border-emerald-700/80">
                <div className="font-extrabold text-xs text-yellow-300 mb-1 flex items-center space-x-1.5">
                  <span>🎯</span>
                  <span>ゲーム概要</span>
                </div>
                <p className="text-[11px] text-emerald-200/90 leading-relaxed">
                  {activeGame.description[language] || activeGame.description.ja}
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-emerald-900/60 border border-emerald-700/80">
                <div className="font-extrabold text-xs text-yellow-300 mb-1 flex items-center space-x-1.5">
                  <span>📜</span>
                  <span>基本ルール</span>
                </div>
                <p className="text-[11px] text-emerald-200/90 leading-relaxed">
                  {activeGame.rulesSummary[language] || activeGame.rulesSummary.ja}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-2.5 rounded-xl bg-emerald-950/70 border border-emerald-800">
                  <span className="text-gray-400">プレイ人数:</span>{' '}
                  <span className="font-bold text-emerald-200">
                    {activeGame.players.min === activeGame.players.max
                      ? `${activeGame.players.min}人`
                      : `${activeGame.players.min}〜${activeGame.players.max}人`}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-emerald-950/70 border border-emerald-800">
                  <span className="text-gray-400">チップ対戦:</span>{' '}
                  <span className="font-bold text-emerald-200">
                    {activeGame.hasChips ? '対応' : '非対応'}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            daifugoCategories.map((cat) => (
              <div key={cat.title} className="space-y-2">
                <h3 className="text-xs font-black text-amber-300 uppercase tracking-wider px-1 border-l-2 border-amber-400 pl-2">
                  {cat.title}
                </h3>
                <div className="space-y-2">
                  {cat.items.map((item) => (
                    <div
                      key={item.name}
                      className={`p-2.5 rounded-2xl border transition-all ${
                        item.enabled
                          ? 'bg-emerald-900/60 border-emerald-700/80'
                          : 'bg-emerald-950/50 border-emerald-900/40 opacity-50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="font-extrabold text-xs text-gray-100">{item.name}</span>
                        <span
                          className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                            item.enabled
                              ? 'bg-yellow-400 text-gray-950 shadow-sm'
                              : 'bg-gray-700 text-gray-400'
                          }`}
                        >
                          {item.enabled ? 'ON' : 'OFF'}
                        </span>
                      </div>
                      <p className="text-[11px] text-emerald-200/80 leading-relaxed">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="pt-3 border-t border-emerald-800">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-gray-950 font-black text-sm shadow-md transition active:scale-95"
          >
            {t.rules.close}
          </button>
        </div>
      </div>
    </div>
  );
};
