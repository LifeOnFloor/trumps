import React from 'react';
import { useTranslation } from '../../i18n/context.js';

export interface ActionPanelProps {
  isMyTurn: boolean;
  canPlay: boolean;
  canPass: boolean;
  onPlay: () => void;
  onPass: () => void;
  hintText?: string;
  pendingHandAction?: {
    type: 'SEVEN_PASS' | 'TEN_DISCARD';
    count: number;
    targetPlayerName?: string;
  } | null;
  selectedCardsCount?: number;
  onPassCards?: () => void;
  onDiscardCards?: () => void;
}

export const ActionPanel: React.FC<ActionPanelProps> = ({
  isMyTurn,
  canPlay,
  canPass,
  onPlay,
  onPass,
  hintText,
  pendingHandAction,
  selectedCardsCount = 0,
  onPassCards,
  onDiscardCards,
}) => {
  let playLabel = '出す';
  let passLabel = 'パス';
  try {
    const { t } = useTranslation();
    playLabel = t.table.play;
    passLabel = t.table.pass;
  } catch {
    // Fallback if rendered outside I18nProvider in isolated unit tests
  }

  if (pendingHandAction && isMyTurn) {
    if (pendingHandAction.type === 'SEVEN_PASS') {
      const isPassValid = selectedCardsCount === pendingHandAction.count;
      return (
        <div className="flex flex-col items-center justify-center space-y-1 my-2">
          <button
            type="button"
            data-testid="pass-cards-button"
            disabled={!isPassValid}
            onClick={onPassCards}
            className={`px-6 py-2.5 rounded-full font-bold text-sm sm:text-base tracking-wide transition-all shadow-md ${
              !isPassValid
                ? 'bg-gray-400 text-gray-200 cursor-not-allowed opacity-50'
                : 'bg-emerald-500 hover:bg-emerald-400 text-white active:scale-95 ring-2 ring-emerald-300'
            }`}
          >
            {pendingHandAction.targetPlayerName ?? '相手'} に渡す ({selectedCardsCount}/{pendingHandAction.count}枚)
          </button>
        </div>
      );
    }

    if (pendingHandAction.type === 'TEN_DISCARD') {
      const isDiscardValid = selectedCardsCount <= pendingHandAction.count;
      return (
        <div className="flex flex-col items-center justify-center space-y-1 my-2">
          <button
            type="button"
            data-testid="discard-cards-button"
            disabled={!isDiscardValid}
            onClick={onDiscardCards}
            className={`px-6 py-2.5 rounded-full font-bold text-sm sm:text-base tracking-wide transition-all shadow-md ${
              !isDiscardValid
                ? 'bg-gray-400 text-gray-200 cursor-not-allowed opacity-50'
                : 'bg-rose-500 hover:bg-rose-400 text-white active:scale-95 ring-2 ring-rose-300'
            }`}
          >
            手札を捨てる ({selectedCardsCount}/{pendingHandAction.count}枚)
          </button>
        </div>
      );
    }
  }

  const isPlayDisabled = !isMyTurn || !canPlay;
  const isPassDisabled = !isMyTurn || !canPass;

  return (
    <div className="flex flex-col items-center justify-center space-y-1.5 my-2">
      <div className="flex items-center justify-center space-x-4">
        <button
          type="button"
          data-testid="play-button"
          disabled={isPlayDisabled}
          onClick={onPlay}
          className={`px-6 py-2.5 rounded-full font-bold text-sm sm:text-base tracking-wide transition-all shadow-md ${
            isPlayDisabled
              ? 'bg-gray-400 text-gray-200 cursor-not-allowed opacity-50'
              : 'bg-yellow-500 hover:bg-yellow-400 text-gray-900 active:scale-95 ring-2 ring-yellow-300'
          }`}
        >
          {playLabel}
        </button>

        <button
          type="button"
          data-testid="pass-button"
          disabled={isPassDisabled}
          onClick={onPass}
          className={`px-6 py-2.5 rounded-full font-bold text-sm sm:text-base tracking-wide transition-all shadow-md ${
            isPassDisabled
              ? 'bg-gray-400 text-gray-200 cursor-not-allowed opacity-50'
              : 'bg-gray-600 hover:bg-gray-500 text-white active:scale-95'
          }`}
        >
          {passLabel}
        </button>
      </div>

      {hintText && (
        <div
          data-testid="play-hint"
          className="text-center text-xs text-emerald-200/90 font-medium px-3 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-800/40 min-h-[1.5rem] flex items-center justify-center"
        >
          {hintText}
        </div>
      )}
    </div>
  );
};
