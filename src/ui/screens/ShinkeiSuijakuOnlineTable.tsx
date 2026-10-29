import React, { useEffect, useRef } from 'react';
import type { SanitizedState, GameEvent } from '../../core/types/engine.js';
import type { ShinkeiSuijakuRuleState } from '../../core/rules/shinkei-suijaku/types.js';
import type { Suit, Rank } from '../../core/types/card.js';
import { AdBannerContainer } from '../components/AdBannerContainer.js';
import {
  playCardPlaySound,
  playTapSound,
  playRevolutionSound,
  isAudioMuted,
  setAudioMuted,
} from '../utils/sound.js';

export interface ShinkeiSuijakuOnlineTableProps {
  state: SanitizedState<ShinkeiSuijakuRuleState>;
  myPlayerId: string;
  isHost?: boolean;
  peerId?: string;
  disconnectedPlayerIds?: readonly string[];
  recentEvents: readonly GameEvent[];
  onFlip: (cardIndex: number) => void;
  onNextTurn: () => void;
  onNextRound?: () => void;
  onLeaveRoom?: () => void;
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

export const ShinkeiSuijakuOnlineTable: React.FC<ShinkeiSuijakuOnlineTableProps> = ({
  state,
  myPlayerId,
  isHost = false,
  peerId,
  disconnectedPlayerIds = [],
  recentEvents,
  onFlip,
  onNextTurn,
  onNextRound,
  onLeaveRoom,
}) => {
  const [isMuted, setIsMuted] = React.useState(isAudioMuted());
  const autoNextTurnTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { context, ruleState } = state;
  const isMyTurn = context.currentTurnPlayerId === myPlayerId && !context.isGameOver;

  // Sound effects based on incoming events
  useEffect(() => {
    if (recentEvents.length === 0) return;
    for (const ev of recentEvents) {
      if (ev.type === 'MATCH_SUCCESS') {
        playRevolutionSound();
      } else if (ev.type === 'CARD_FLIPPED') {
        playCardPlaySound();
      }
    }
  }, [recentEvents]);

  // If host and last match was a miss, auto-call onNextTurn after 1.2s to advance turn
  useEffect(() => {
    if (isHost && ruleState.lastMatchResult === 'miss') {
      if (autoNextTurnTimeoutRef.current) {
        clearTimeout(autoNextTurnTimeoutRef.current);
      }
      autoNextTurnTimeoutRef.current = setTimeout(() => {
        onNextTurn();
      }, 1200);
    }
    return () => {
      if (autoNextTurnTimeoutRef.current) {
        clearTimeout(autoNextTurnTimeoutRef.current);
      }
    };
  }, [isHost, ruleState.lastMatchResult, onNextTurn]);

  const handleCardClick = (cardIndex: number) => {
    if (!isMyTurn) return;
    if (ruleState.lastMatchResult === 'miss') {
      onNextTurn();
      return;
    }
    playTapSound();
    onFlip(cardIndex);
  };

  const totalPairs = 26;
  const currentPairs = Object.values(ruleState.playerScores).reduce((a, b) => a + b, 0);

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-950 via-emerald-900 to-teal-950 text-white flex flex-col items-center select-none pb-8">
      {/* Top Ad Banner (Disabled by default) */}
      <AdBannerContainer slotId="memory-online-top" />

      {/* Header Bar */}
      <header className="w-full max-w-5xl px-3 py-2.5 flex items-center justify-between border-b border-emerald-800/60 bg-emerald-950/70 backdrop-blur-md sticky top-0 z-20">
        <div className="flex items-center space-x-2">
          {onLeaveRoom && (
            <button
              type="button"
              onClick={onLeaveRoom}
              className="p-1.5 rounded-xl bg-emerald-900/80 hover:bg-emerald-800 border border-emerald-700/60 text-emerald-200 hover:text-white transition active:scale-95 text-xs font-bold flex items-center space-x-1"
            >
              <span>◀</span>
              <span>退室する</span>
            </button>
          )}
          <div className="flex items-center space-x-1 text-sm font-black text-yellow-400">
            <span>🧠</span>
            <span>神経衰弱（オンライン対戦）</span>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-xs">
          {peerId && (
            <span className="hidden sm:inline-block px-2.5 py-1 rounded-lg bg-emerald-950/80 border border-emerald-700/60 text-[10px] text-emerald-300 font-mono">
              ROOM: {peerId.slice(-6)}
            </span>
          )}
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

      {/* Players List (1 to 6 players) */}
      <div className="w-full max-w-5xl px-2 py-2 mt-1">
        <div className="flex items-center justify-center flex-wrap gap-2">
          {context.players.map((p) => {
            const isTurn = context.currentTurnPlayerId === p.id && !context.isGameOver;
            const isMe = p.id === myPlayerId;
            const isDisconnected = disconnectedPlayerIds.includes(p.id);

            return (
              <div
                key={p.id}
                className={`px-3 py-1.5 rounded-2xl transition flex items-center space-x-2 border text-xs shadow-sm ${
                  isTurn
                    ? 'bg-yellow-400 text-gray-950 border-yellow-300 font-black shadow-md scale-105'
                    : isMe
                    ? 'bg-emerald-900/90 text-white border-yellow-400/60 font-bold'
                    : 'bg-emerald-950/80 text-emerald-200 border-emerald-800/60 font-medium'
                } ${isDisconnected ? 'opacity-40 grayscale' : ''}`}
              >
                <span>{isTurn ? '👉' : isMe ? '⭐' : '👤'}</span>
                <span>
                  {p.name}
                  {isMe ? ' (あなた)' : ''}
                </span>
                <span className="px-1.5 py-0.5 rounded-md bg-black/20 text-[11px] font-black">
                  {ruleState.playerScores[p.id] ?? 0} 組
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Turn Banner / Status Indicator */}
      <div className="w-full max-w-5xl px-3 py-1.5 flex items-center justify-between text-xs font-bold text-emerald-200">
        <div className="flex items-center space-x-3 bg-emerald-950/60 px-3 py-1 rounded-xl border border-emerald-800/50">
          <div>
            獲得ペア: <span className="text-yellow-300 font-black">{currentPairs}</span> / {totalPairs}
          </div>
          <div>
            ターン数: <span className="text-white font-black">{ruleState.turnCount}</span>
          </div>
        </div>

        <div className="text-xs">
          {context.isGameOver ? (
            <span className="text-yellow-400 font-black">🏆 終局！</span>
          ) : isMyTurn ? (
            <span className="px-3 py-1 rounded-xl bg-yellow-400 text-gray-950 font-black animate-pulse shadow">
              あなたの手番です！カードをタップ
            </span>
          ) : (
            <span className="text-emerald-300 font-medium">
              相手の手番を待機中...
            </span>
          )}
        </div>
      </div>

      {/* 52 Cards Grid */}
      <main className="w-full max-w-5xl px-2 py-3 flex-1 flex flex-col items-center justify-center">
        <div
          data-testid="online-memory-cards-container"
          className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-13 gap-1.5 sm:gap-2 w-full place-items-center"
        >
          {ruleState.cards.map((c) => {
            const isFlipped = c.isFlipped;
            const isTaken = c.isTaken;

            return (
              <div
                key={c.index}
                data-testid={`online-memory-card-${c.index}`}
                data-flipped={isFlipped ? 'true' : 'false'}
                onClick={() => !isTaken && handleCardClick(c.index)}
                className={`w-full aspect-[2/3] max-w-[68px] rounded-lg transition-all duration-200 select-none flex items-center justify-center relative shadow-sm ${
                  isTaken
                    ? 'opacity-0 pointer-events-none scale-90'
                    : isFlipped
                    ? 'bg-white border-2 border-yellow-400 shadow-md scale-105 z-10'
                    : isMyTurn
                    ? 'bg-gradient-to-br from-indigo-900 to-blue-950 border-2 border-indigo-400/70 hover:border-yellow-400 hover:scale-105 active:scale-95 cursor-pointer'
                    : 'bg-gradient-to-br from-indigo-900 to-blue-950 border-2 border-indigo-400/40 opacity-80 cursor-default'
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

      {/* Game Over Result Modal */}
      {context.isGameOver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md p-6 bg-emerald-950 border-2 border-yellow-400 rounded-3xl text-center space-y-4 shadow-2xl">
            <span className="text-5xl animate-bounce">🏆</span>
            <h2 className="text-2xl font-black text-yellow-400">対戦終了！</h2>

            <div className="bg-emerald-900/60 rounded-2xl p-4 border border-emerald-700/60 space-y-2 text-xs text-emerald-100">
              <div className="font-bold text-white text-sm mb-2">最終結果</div>
              {[...context.players]
                .sort((a, b) => (ruleState.playerScores[b.id] ?? 0) - (ruleState.playerScores[a.id] ?? 0))
                .map((p, idx) => {
                  const isWinner = context.winnerPlayerIds.includes(p.id);
                  return (
                    <div
                      key={p.id}
                      className={`flex items-center justify-between py-1 px-2 rounded-xl ${
                        isWinner ? 'bg-yellow-400/20 text-yellow-300 font-black' : ''
                      }`}
                    >
                      <span>
                        {idx + 1}位: {p.name} {p.id === myPlayerId ? '(あなた)' : ''}
                      </span>
                      <span className="font-mono font-bold">
                        {ruleState.playerScores[p.id] ?? 0} 組
                      </span>
                    </div>
                  );
                })}
            </div>

            <div className="pt-2 flex flex-col space-y-2">
              {isHost && onNextRound && (
                <button
                  type="button"
                  onClick={onNextRound}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 text-gray-950 font-black text-sm shadow-lg transition active:scale-95"
                >
                  👑 もう一回対戦する
                </button>
              )}
              {onLeaveRoom && (
                <button
                  type="button"
                  onClick={onLeaveRoom}
                  className="w-full py-2.5 rounded-2xl bg-emerald-900 hover:bg-emerald-800 text-emerald-200 text-xs font-bold transition"
                >
                  ロビーへ戻る
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
