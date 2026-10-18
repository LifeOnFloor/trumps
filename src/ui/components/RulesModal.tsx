import React from 'react';
import type { DaifugoConfig } from '../../core/rules/daifugo/config.js';

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
  if (!isOpen) return null;

  const ruleItems = [
    {
      name: '8切り',
      enabled: config.eightCut,
      desc: '8を含むカードを出すと場が即座に流れ、出し手のターンが継続します。',
    },
    {
      name: '革命',
      enabled: config.revolution,
      desc: '同じ数字の4枚出しでカードの強さが逆転します（3が最強、2が最弱）。',
    },
    {
      name: 'スペ3返し',
      enabled: config.spadeThreeReturn,
      desc: 'ジョーカー単騎に対して♠3を出すと場を流せます。',
    },
    {
      name: '階段',
      enabled: config.stairs,
      desc: '同じスートで数字が3枚以上連続するカードを一度に出せます。',
    },
    {
      name: '縛り',
      enabled: config.suitLock !== 'none',
      desc: '直前と同じスートが出た場合、以降はそのスートしか出せなくなります。',
    },
    {
      name: '禁止上がり',
      enabled:
        config.prohibitedEndings.joker ||
        config.prohibitedEndings.eight ||
        config.prohibitedEndings.two,
      desc: 'ジョーカー・8・2（革命時3）を最後に出して上がると反則負け（最下位）になります。',
    },
    {
      name: 'カジノチップ対戦',
      enabled: !!config.chipsMode,
      desc: `チップ（初期: ${config.initialChips ?? 1000}枚）を使用し、順位に応じたチップのやり取りを行います。`,
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
        className="relative bg-emerald-950/95 border border-emerald-600/70 rounded-3xl p-6 w-full max-w-md shadow-2xl max-h-[85vh] flex flex-col overflow-hidden text-gray-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-emerald-800">
          <div className="flex items-center space-x-2">
            <span className="text-xl">📋</span>
            <h2 id="rules-title" className="text-lg font-black text-yellow-400 tracking-wider">
              現在のルール設定
            </h2>
          </div>
          <button
            type="button"
            data-testid="close-rules-button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-emerald-900/80 hover:bg-emerald-800 text-gray-300 hover:text-white font-bold transition"
            aria-label="閉じる"
          >
            ✕
          </button>
        </div>

        <div className="overflow-y-auto py-3 space-y-3 flex-1 scrollbar-thin">
          {ruleItems.map((item) => (
            <div
              key={item.name}
              className={`p-3 rounded-2xl border transition-all ${
                item.enabled
                  ? 'bg-emerald-900/60 border-emerald-700/80'
                  : 'bg-emerald-950/50 border-emerald-900/40 opacity-50'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-extrabold text-sm text-gray-100">{item.name}</span>
                <span
                  className={`text-[11px] font-black px-2 py-0.5 rounded-full ${
                    item.enabled
                      ? 'bg-yellow-400 text-gray-950 shadow-sm'
                      : 'bg-gray-700 text-gray-400'
                  }`}
                >
                  {item.enabled ? 'ON' : 'OFF'}
                </span>
              </div>
              <p className="text-xs text-emerald-200/80 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>

        <div className="pt-3 border-t border-emerald-800">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-gray-950 font-black text-sm shadow-md transition active:scale-95"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};
