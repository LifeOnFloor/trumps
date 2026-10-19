import React from 'react';
import type { DaifugoConfig } from '../../core/rules/daifugo/config.js';
import { useTranslation } from '../../i18n/context.js';

export type PresetType = 'standard' | 'official' | 'full' | 'simple';

export interface RulePresetsProps {
  onApplyPreset: (configPartial: Partial<DaifugoConfig>) => void;
}

export const PRESETS: Record<
  PresetType,
  {
    title: string;
    desc: string;
    titleEn: string;
    descEn: string;
    config: Partial<DaifugoConfig>;
  }
> = {
  standard: {
    title: 'スタンダード',
    desc: '8切り・革命・都落ち・11バック（定番）',
    titleEn: 'Standard',
    descEn: '8-Cut, Revolution, Miyako Ochi, 11-Back',
    config: {
      eightCut: true,
      revolution: true,
      spadeThreeReturn: false,
      stairs: false,
      suitLock: 'none',
      sequenceLock: false,
      nineEffect: 'none',
      elevenBack: true,
      fiveSkip: false,
      sevenPass: false,
      tenDiscard: false,
      sandstorm: false,
      miyakoOchi: true,
      gekokujo: false,
      cardExchange: true,
      prohibitedEndings: {
        joker: true,
        eight: true,
        two: true,
        three: true,
      },
    },
  },
  official: {
    title: '公式大会',
    desc: '日本大富豪連盟 公式ルール',
    titleEn: 'Tournament',
    descEn: 'Japan Daifugo Assoc. Rules',
    config: {
      eightCut: true,
      revolution: true,
      spadeThreeReturn: true,
      stairs: true,
      suitLock: 'single',
      sequenceLock: false,
      nineEffect: 'none',
      elevenBack: false,
      fiveSkip: false,
      sevenPass: false,
      tenDiscard: false,
      sandstorm: false,
      miyakoOchi: true,
      gekokujo: false,
      cardExchange: true,
      prohibitedEndings: {
        joker: true,
        eight: true,
        two: true,
        three: true,
      },
    },
  },
  full: {
    title: 'ローカル全盛り',
    desc: '11バック・7渡し・10捨て・砂嵐・下剋上等',
    titleEn: 'Full Local',
    descEn: '11-Back, 7-Pass, 10-Discard, Sandstorm, etc.',
    config: {
      eightCut: true,
      revolution: true,
      spadeThreeReturn: true,
      stairs: true,
      suitLock: 'double',
      sequenceLock: true,
      nineEffect: 'reverse',
      elevenBack: true,
      fiveSkip: true,
      sevenPass: true,
      tenDiscard: true,
      sandstorm: true,
      miyakoOchi: true,
      gekokujo: true,
      cardExchange: true,
      prohibitedEndings: {
        joker: true,
        eight: true,
        two: true,
        three: true,
      },
    },
  },
  simple: {
    title: 'シンプル',
    desc: '特殊効果なし・数字勝負',
    titleEn: 'Simple',
    descEn: 'No special abilities, pure rank battle',
    config: {
      eightCut: false,
      revolution: false,
      spadeThreeReturn: false,
      stairs: false,
      suitLock: 'none',
      sequenceLock: false,
      nineEffect: 'none',
      elevenBack: false,
      fiveSkip: false,
      sevenPass: false,
      tenDiscard: false,
      sandstorm: false,
      miyakoOchi: false,
      gekokujo: false,
      cardExchange: false,
      prohibitedEndings: {
        joker: false,
        eight: false,
        two: false,
        three: false,
      },
    },
  },
};

export const RulePresets: React.FC<RulePresetsProps> = ({ onApplyPreset }) => {
  const { t, language } = useTranslation();

  return (
    <div className="space-y-1.5">
      <div className="text-xs font-bold text-emerald-300">{t.lobby.rulePresets}</div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {(Object.keys(PRESETS) as PresetType[]).map((key) => {
          const item = PRESETS[key];
          const title = language === 'en' ? item.titleEn : item.title;
          const desc = language === 'en' ? item.descEn : item.desc;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onApplyPreset(item.config)}
              className="px-2.5 py-2 rounded-xl bg-emerald-900/80 hover:bg-yellow-500 hover:text-gray-950 border border-emerald-700/70 hover:border-yellow-400 text-left transition-all active:scale-95 group shadow-sm"
            >
              <div className="font-black text-xs text-yellow-300 group-hover:text-gray-950 truncate">
                {title}
              </div>
              <div className="text-[10px] text-emerald-300 group-hover:text-gray-800 line-clamp-1">
                {desc}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
