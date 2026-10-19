import React from 'react';
import type { DaifugoConfig } from '../../core/rules/daifugo/config.js';
import { useTranslation } from '../../i18n/context.js';

export interface RulesModalProps {
  isOpen: boolean;
  config: DaifugoConfig;
  onClose: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({
  isOpen,
  config,
  onClose,
}) => {
  const { t } = useTranslation();
  if (!isOpen) return null;

  const categories = [
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
              ? '（9リバース）'
              : config.nineEffect === 'revolution'
              ? '（9一時革命）'
              : ''
          }`,
          enabled: config.nineEffect !== 'none',
          desc: `${t.rules.nineEffectDesc} [${
            config.nineEffect === 'reverse'
              ? '9リバース'
              : config.nineEffect === 'revolution'
              ? '9一時革命'
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
              ? '（片縛り）'
              : config.suitLock === 'double'
              ? '（両縛り）'
              : config.suitLock === 'geki'
              ? '（激縛り）'
              : ''
          }`,
          enabled: config.suitLock !== 'none',
          desc: `${t.rules.suitLockDesc} [${
            config.suitLock === 'single'
              ? '片縛り'
              : config.suitLock === 'double'
              ? '両縛り'
              : config.suitLock === 'geki'
              ? '激縛り'
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
          desc: `${t.rules.chipsDesc} (${(config.initialChips ?? 1000).toLocaleString()}枚 / アンティ: ${config.ante ?? 0}枚 / ${config.chipSettlementType === 'pot_split' ? 'ポット配分' : '順位間移動'})`,
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
            <span className="text-xl">📋</span>
            <h2 id="rules-title" className="text-lg font-black text-yellow-400 tracking-wider">
              {t.rules.title}
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
          {categories.map((cat) => (
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
          ))}
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
