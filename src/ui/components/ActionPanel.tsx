import React from 'react';

export interface ActionPanelProps {
  isMyTurn: boolean;
  canPlay: boolean;
  canPass: boolean;
  onPlay: () => void;
  onPass: () => void;
}

export const ActionPanel: React.FC<ActionPanelProps> = ({
  isMyTurn,
  canPlay,
  canPass,
  onPlay,
  onPass,
}) => {
  const isPlayDisabled = !isMyTurn || !canPlay;
  const isPassDisabled = !isMyTurn || !canPass;

  return (
    <div className="flex items-center justify-center space-x-4 my-2">
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
        出す (PLAY)
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
        パス (PASS)
      </button>
    </div>
  );
};
