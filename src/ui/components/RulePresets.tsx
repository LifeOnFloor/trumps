import React from 'react';
import type { DaifugoConfig } from '../../core/rules/daifugo/config.js';

export type PresetType = 'standard' | 'official' | 'full' | 'simple';

export interface RulePresetsProps {
  onApplyPreset: (configPartial: Partial<DaifugoConfig>) => void;
}

export const PRESETS: Record<PresetType, { title: string; desc: string; config: Partial<DaifugoConfig> }> = {
  standard: {
    title: 'スタンダード',
    desc: '8切り・革命・都落ち・11バック（定番）',
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
  return (
    <div className="space-y-1.5">
      <div className="text-xs font-bold text-emerald-300">ルール一括プリセット</div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {(Object.keys(PRESETS) as PresetType[]).map((key) => {
          const item = PRESETS[key];
          return (
            <button
              key={key}
              type="button"
              onClick={() => onApplyPreset(item.config)}
              className="px-2.5 py-2 rounded-xl bg-emerald-900/80 hover:bg-yellow-500 hover:text-gray-950 border border-emerald-700/70 hover:border-yellow-400 text-left transition-all active:scale-95 group shadow-sm"
            >
              <div className="font-black text-xs text-yellow-300 group-hover:text-gray-950 truncate">
                {item.title}
              </div>
              <div className="text-[10px] text-emerald-300 group-hover:text-gray-800 line-clamp-1">
                {item.desc}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
