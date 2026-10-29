import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { GameRunner } from '../../core/engine/game-runner.js';
import { ShinkeiSuijakuPlugin } from '../../core/rules/shinkei-suijaku/index.js';
import type {
  ShinkeiSuijakuAction,
  ShinkeiSuijakuRuleState,
} from '../../core/rules/shinkei-suijaku/types.js';
import type { Suit, Rank } from '../../core/types/card.js';
import { AdBannerContainer } from '../components/AdBannerContainer.js';
import {
  playCardPlaySound,
  playTapSound,
  playRevolutionSound,
  isAudioMuted,
  setAudioMuted,
} from '../utils/sound.js';

export interface ShinkeiSuijakuScreenProps {
  onBackToLobby: () => void;
  playerName?: string;
}

const SUIT_SYMBOLS: Record<Suit, string> = {
  spade: '♠',
  heart: '♥',
  diamond: '♦',
  club: '♣',
};

const SUIT_COLORS: Record<Suit, string> = {
  spade: 'text-gray-900',
  heart: 'text-red-600',
  diamond: 'text-red-600',
  club: 'text-gray-900',
};

function formatRank(rank: Rank): string {
  if (rank === 1) return 'A';
  if (rank === 11) return 'J';
  if (rank === 12) return 'Q';
  if (rank === 13) return 'K';
  return String(rank);
}

export const ShinkeiSuijakuScreen: React.FC<ShinkeiSuijakuScreenProps> = ({
  onBackToLobby,
  playerName = 'あなた',
}) => {
  const plugin = useMemo(() => new ShinkeiSuijakuPlugin(), []);
  const [isMuted, setIsMuted] = useState(isAudioMuted());
  const [seconds, setSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(true);

  // Auto-flip timer ref for mismatched cards
  const autoFlipTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const players = useMemo(() => {
    return [{ id: 'p1', name: playerName }];
  }, [playerName]);

  const [runner, setRunner] = useState(() => {
    return new GameRunner(plugin, players);
  });

  const [stateVersion, setStateVersion] = useState(0);

  const context = runner.getContext();
  const ruleState = runner.getRuleState();

  // Timer effect
  useEffect(() => {
    if (!isTimerRunning || context.isGameOver) return;
    const interval = setInterval(() => {
      setSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isTimerRunning, context.isGameOver]);

  // Restart game
  const restartGame = useCallback(() => {
    playTapSound();
    if (autoFlipTimeoutRef.current) {
      clearTimeout(autoFlipTimeoutRef.current);
      autoFlipTimeoutRef.current = null;
    }
    setRunner(new GameRunner(plugin, players));
    setSeconds(0);
    setIsTimerRunning(true);
    setStateVersion((v) => v + 1);
  }, [plugin, players]);

  // Handle card click
  const handleCardClick = (cardIndex: number) => {
    if (context.isGameOver) return;
    const currentTurnPlayer = context.currentTurnPlayerId || 'p1';

    // Clear auto flip timer if user clicked manually
    if (autoFlipTimeoutRef.current) {
      clearTimeout(autoFlipTimeoutRef.current);
      autoFlipTimeoutRef.current = null;
    }

    if (!runner.canExecute(currentTurnPlayer, { type: 'FLIP', cardIndex })) {
      return;
    }

    const events = runner.execute(currentTurnPlayer, { type: 'FLIP', cardIndex });
    playCardPlaySound();

    if (events.some((e) => e.type === 'MATCH_SUCCESS')) {
      playRevolutionSound();
    } else if (events.some((e) => e.type === 'MATCH_FAIL')) {
      // Auto flip back after 1.1 seconds
      autoFlipTimeoutRef.current = setTimeout(() => {
        try {
          if (runner.canExecute(currentTurnPlayer, { type: 'NEXT_TURN' })) {
            runner.execute(currentTurnPlayer, { type: 'NEXT_TURN' });
            setStateVersion((v) => v + 1);
          }
        } catch {
          // ignore
        }
      }, 1100);
    }

    setStateVersion((v) => v + 1);
  };

  const totalPairs = 26;
  const currentPairs = Object.values(ruleState.playerScores).reduce((a, b) => a + b, 0);

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-950 via-emerald-900 to-teal-950 text-white flex flex-col items-center select-none pb-8">
      {/* Top Ad Banner (Disabled by default) */}
      <AdBannerContainer slotId="shinkei-suijaku-top" />

      {/* Header Bar */}
      <header className="w-full max-w-5xl px-3 py-2.5 flex items-center justify-between border-b border-emerald-800/60 bg-emerald-950/70 backdrop-blur-md sticky top-0 z-20">
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={onBackToLobby}
            className="p-1.5 rounded-xl bg-emerald-900/80 hover:bg-emerald-800 border border-emerald-700/60 text-emerald-200 hover:text-white transition active:scale-95 text-xs font-bold flex items-center space-x-1"
          >
            <span>◀</span>
            <span>ロビーへ戻る</span>
          </button>
          <div className="flex items-center space-x-1 text-sm font-black text-yellow-400">
            <span>🧠</span>
            <span className="hidden sm:inline">神経衰弱</span>
          </div>
        </div>

        {/* Controls & Sound */}
        <div className="flex items-center space-x-2 text-xs">
          <button
            type="button"
            onClick={() => {
              const next = !isMuted;
              setIsMuted(next);
              setAudioMuted(next);
            }}
            className="p-1.5 rounded-xl bg-emerald-900/80 hover:bg-emerald-800 border border-emerald-700/50 text-emerald-300 text-xs transition"
          >
            {isMuted ? '🔇' : '🔊'}
          </button>
        </div>
      </header>

      {/* Game Stats & Status */}
      <div className="w-full max-w-5xl px-3 py-2 mt-2 flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-emerald-200">
        <div className="flex items-center space-x-3 bg-emerald-950/60 px-3 py-1.5 rounded-2xl border border-emerald-800/50 shadow-inner">
          <div>
            獲得ペア: <span className="text-yellow-300 font-black text-sm">{currentPairs}</span> / {totalPairs}
          </div>
          <div>
            ターン: <span className="text-white font-black">{ruleState.turnCount}</span>
          </div>
          <div>
            時間: <span className="text-emerald-300 font-mono font-bold">{Math.floor(seconds / 60)}:{(seconds % 60).toString().padStart(2, '0')}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={restartGame}
          className="px-3 py-1 rounded-xl bg-emerald-900/80 hover:bg-emerald-800 border border-emerald-700 text-yellow-300 hover:text-white transition font-bold text-xs"
        >
          🔄 リセット
        </button>
      </div>

      {/* Card Grid (13 cols on larger screens, responsive) */}
      <main className="w-full max-w-5xl px-2 py-3 flex-1 flex flex-col items-center justify-center">
        <div
          data-testid="memory-cards-container"
          className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-13 gap-1.5 sm:gap-2 w-full place-items-center"
        >
          {ruleState.cards.map((c) => {
            const isFlipped = c.isFlipped;
            const isTaken = c.isTaken;

            return (
              <div
                key={c.index}
                data-testid={`memory-card-${c.index}`}
                data-flipped={isFlipped ? 'true' : 'false'}
                onClick={() => !isTaken && handleCardClick(c.index)}
                className={`w-full aspect-[2/3] max-w-[68px] rounded-lg transition-all duration-200 select-none cursor-pointer flex items-center justify-center relative shadow-sm ${
                  isTaken
                    ? 'opacity-0 pointer-events-none scale-90'
                    : isFlipped
                    ? 'bg-white border-2 border-yellow-400 shadow-md scale-105 z-10'
                    : 'bg-gradient-to-br from-indigo-900 to-blue-950 border-2 border-indigo-400/60 hover:border-yellow-400/80 hover:scale-105 active:scale-95'
                }`}
              >
                {!isTaken && isFlipped && c.card ? (
                  <div className="w-full h-full flex flex-col items-center justify-between p-1">
                    <div className={`text-xs sm:text-sm font-black self-start leading-none ${SUIT_COLORS[c.card.suit]}`}>
                      {formatRank(c.card.rank)}
                    </div>
                    <div className={`text-base sm:text-lg leading-none ${SUIT_COLORS[c.card.suit]}`}>
                      {SUIT_SYMBOLS[c.card.suit]}
                    </div>
                    <div className={`text-xs sm:text-sm font-black self-end leading-none rotate-180 ${SUIT_COLORS[c.card.suit]}`}>
                      {formatRank(c.card.rank)}
                    </div>
                  </div>
                ) : !isTaken ? (
                  <div className="w-full h-full flex items-center justify-center p-1">
                    <div className="w-full h-full rounded border border-indigo-400/30 bg-indigo-950/40 flex items-center justify-center text-indigo-300/40 text-xs sm:text-sm font-mono">
                      ❖
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </main>

      {/* Game Over Modal */}
      {context.isGameOver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-sm p-6 bg-emerald-950 border-2 border-yellow-400 rounded-3xl text-center space-y-4 shadow-2xl">
            <span className="text-5xl animate-bounce">🎉</span>
            <h2 className="text-2xl font-black text-yellow-400">ゲームクリア！</h2>
            <div className="bg-emerald-900/60 rounded-2xl p-4 border border-emerald-700/60 space-y-2 text-xs text-emerald-100">
              <div className="flex justify-between">
                <span>かかった時間</span>
                <span className="font-bold text-yellow-300">{Math.floor(seconds / 60)}分 {seconds % 60}秒</span>
              </div>
              <div className="flex justify-between">
                <span>合計手数</span>
                <span className="font-bold text-yellow-300">{ruleState.turnCount} ターン</span>
              </div>
            </div>

            <div className="pt-2 flex flex-col space-y-2">
              <button
                type="button"
                onClick={restartGame}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 text-gray-950 font-black text-sm shadow-lg transition active:scale-95"
              >
                🔄 もう一度遊ぶ
              </button>
              <button
                type="button"
                onClick={onBackToLobby}
                className="w-full py-2.5 rounded-2xl bg-emerald-900 hover:bg-emerald-800 text-emerald-200 text-xs font-bold transition"
              >
                ロビーへ戻る
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
