import React, { useState, useEffect, useRef } from 'react';
import type { SanitizedState, GameEvent } from '../../core/types/engine.js';
import type { DaifugoRuleState } from '../../core/rules/daifugo/types.js';
import { DEFAULT_DAIFUGO_CONFIG, type DaifugoConfig } from '../../core/rules/daifugo/config.js';
import { useTranslation } from '../../i18n/context.js';
import { LanguageSelector } from '../components/LanguageSelector.js';
import { useCardSelection } from '../hooks/use-card-selection.js';
import { OpponentSeat } from '../components/OpponentSeat.js';
import { GameTable } from '../components/GameTable.js';
import { PlayerHand } from '../components/PlayerHand.js';
import { ActionPanel } from '../components/ActionPanel.js';
import { EventBanner } from '../components/EventBanner.js';
import { ResultModal } from '../components/ResultModal.js';
import { RulesModal } from '../components/RulesModal.js';
import { SettingsModal } from '../components/SettingsModal.js';
import {
  playCardPlaySound,
  playPassSound,
  playEightCutSound,
  playRevolutionSound,
  isAudioMuted,
  setAudioMuted,
} from '../utils/sound.js';

export interface TableScreenProps {
  state: SanitizedState<DaifugoRuleState>;
  myPlayerId: string;
  isHost?: boolean;
  peerId?: string;
  disconnectedPlayerIds?: readonly string[];
  roomConfig?: DaifugoConfig;
  recentEvents: readonly GameEvent[];
  onPlay: (cardIds: string[]) => void;
  onPass: () => void;
  onPassCards?: (cardIds: string[]) => void;
  onDiscardCards?: (cardIds: string[]) => void;
  onNextRound?: () => void;
  onRestart?: () => void;
  onLeaveRoom?: () => void;
}

export const TableScreen: React.FC<TableScreenProps> = ({
  state,
  myPlayerId,
  isHost = false,
  peerId,
  disconnectedPlayerIds = [],
  roomConfig,
  recentEvents,
  onPlay,
  onPass,
  onPassCards,
  onDiscardCards,
  onNextRound,
  onRestart,
  onLeaveRoom,
}) => {
  const { t } = useTranslation();
  const { context, ruleState } = state;
  const { players, currentTurnPlayerId, isGameOver, winnerPlayerIds } = context;

  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(isAudioMuted());
  const prevEventCountRef = useRef(recentEvents.length);

  // Active configuration (prefer ruleState.config as single source of truth during gameplay)
  const activeConfig = ruleState.config ?? roomConfig ?? DEFAULT_DAIFUGO_CONFIG;

  const myPlayer = players.find((p) => p.id === myPlayerId);
  const myHand = myPlayer?.hand ?? [];
  const opponents = players.filter((p) => p.id !== myPlayerId);

  const isMyTurn = currentTurnPlayerId === myPlayerId;
  const isEffectiveRevolution = ruleState.isRevolution !== ruleState.isElevenBack;

  const {
    selectedCardIds,
    toggleSelect,
    clearSelection,
    canPlay,
    canPass,
    playHintKey,
  } = useCardSelection({
    hand: myHand,
    table: ruleState.table,
    isRevolution: isEffectiveRevolution,
    config: activeConfig,
    isMyTurn,
  });

  // Sound effects on incoming game events
  useEffect(() => {
    if (recentEvents.length > prevEventCountRef.current) {
      const newEvents = recentEvents.slice(prevEventCountRef.current);
      for (const event of newEvents) {
        if (event.type === 'EIGHT_CUT') {
          playEightCutSound();
        } else if (event.type === 'REVOLUTION') {
          playRevolutionSound();
        }
      }
    }
    prevEventCountRef.current = recentEvents.length;
  }, [recentEvents]);

  const handleToggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    setAudioMuted(next);
  };

  const handlePlay = () => {
    if (canPlay) {
      playCardPlaySound();
      onPlay(selectedCardIds);
      clearSelection();
    }
  };

  const handlePass = () => {
    if (canPass) {
      playPassSound();
      onPass();
      clearSelection();
    }
  };

  const handlePassCards = () => {
    if (onPassCards) {
      onPassCards(selectedCardIds);
      clearSelection();
    }
  };

  const handleDiscardCards = () => {
    if (onDiscardCards) {
      onDiscardCards(selectedCardIds);
      clearSelection();
    }
  };

  const targetPlayer = ruleState.pendingHandAction?.type === 'SEVEN_PASS'
    ? players.find((p) => p.id === (ruleState.pendingHandAction as any)?.targetPlayerId)
    : undefined;

  return (
    <div className="relative flex flex-col justify-between items-center h-[100dvh] max-h-[100dvh] p-2 sm:p-4 bg-gradient-to-b from-emerald-950 via-emerald-900 to-emerald-950 text-white overflow-hidden select-none">
      {/* Event banner toast */}
      <EventBanner events={recentEvents} players={players} />

      {/* Rules Modal */}
      <RulesModal
        isOpen={isRulesModalOpen}
        config={activeConfig}
        onClose={() => setIsRulesModalOpen(false)}
      />

      {/* Settings Modal (Mobile & Desktop) */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
        onOpenRules={() => setIsRulesModalOpen(true)}
        onLeaveRoom={onLeaveRoom}
        peerId={peerId}
        config={activeConfig}
      />

      {/* Tax Card Exchange Notice */}
      {ruleState.exchanges && ruleState.exchanges.length > 0 && (
        <div
          data-testid="card-exchange-banner"
          className="w-full max-w-md mx-auto mb-1 p-2 rounded-2xl bg-amber-950/90 border border-yellow-500/60 shadow-xl text-xs text-yellow-200 animate-in fade-in slide-in-from-top-2 duration-300"
        >
          <div className="font-black text-yellow-400 flex items-center space-x-1.5 mb-1">
            <span>🔄</span>
            <span>階級カード交換</span>
          </div>
          <div className="space-y-0.5 text-[11px] text-amber-100/90">
            {ruleState.exchanges.map((ex, idx) => {
              const fromName = players.find((p) => p.id === ex.fromPlayerId)?.name ?? 'Player';
              const toName = players.find((p) => p.id === ex.toPlayerId)?.name ?? 'Player';
              return (
                <div key={idx} className="flex items-center justify-between">
                  <span>{fromName} ➔ {toName}</span>
                  <span className="font-bold text-yellow-300">{ex.cards.length}枚</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Top Bar: Title & Utility Buttons */}
      <div className="w-full max-w-4xl flex items-center justify-between px-2 pt-1 pb-1">
        <div className="flex items-center space-x-2">
          <span className="text-xl">🃏</span>
          <span className="font-black text-sm sm:text-base text-yellow-400 tracking-wider">
            {t.app.title}
          </span>
          {activeConfig.chipsMode && (
            <div className="flex items-center space-x-1.5" data-testid="chips-mode-badge">
              {activeConfig.ante && activeConfig.ante > 0 ? (
                <span
                  data-testid="ante-badge"
                  className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 font-black shadow-sm"
                >
                  🪙 {activeConfig.ante}
                </span>
              ) : null}
              {(ruleState.pot ?? 0) > 0 && (
                <span
                  data-testid="pot-badge"
                  className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/30 text-amber-200 border border-amber-400/50 font-black shadow-sm flex items-center space-x-1"
                >
                  <span>🏺</span>
                  <span>{(ruleState.pot ?? 0).toLocaleString()}</span>
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {/* Settings button (pure icon) */}
          <button
            type="button"
            data-testid="settings-button"
            onClick={() => setIsSettingsOpen(true)}
            aria-label="Settings"
            className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-full bg-emerald-800/80 hover:bg-emerald-700 text-yellow-300 border border-yellow-500/50 font-bold transition active:scale-95 shadow-sm text-sm"
          >
            ⚙️
          </button>

          {/* Desktop quick shortcuts (pure icons for language independence) */}
          <div className="hidden sm:flex items-center space-x-2">
            <LanguageSelector />

            <button
              type="button"
              data-testid="sound-toggle-button"
              onClick={handleToggleMute}
              aria-label={isMuted ? '音声ミュート解除' : '音声ミュート'}
              className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-full bg-emerald-800/80 hover:bg-emerald-700 text-yellow-300 border border-emerald-600/60 font-bold transition active:scale-95 text-xs shadow-sm"
            >
              {isMuted ? '🔇' : '🔊'}
            </button>

            <button
              type="button"
              data-testid="table-rules-button"
              onClick={() => setIsRulesModalOpen(true)}
              aria-label="Rules"
              className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-full bg-emerald-800/80 hover:bg-emerald-700 text-yellow-300 border border-yellow-500/50 font-black transition active:scale-95 text-xs shadow-sm"
            >
              📋
            </button>
          </div>
        </div>
      </div>

      {/* Opponents row */}
      <div className="w-full max-w-4xl flex items-center justify-center space-x-2 sm:space-x-4 px-2">
        {opponents.map((opponent) => (
          <OpponentSeat
            key={opponent.id}
            player={opponent}
            isCurrentTurn={currentTurnPlayerId === opponent.id}
            isDisconnected={disconnectedPlayerIds.includes(opponent.id)}
          />
        ))}
      </div>

      {/* Center Table Area */}
      <div className="w-full flex flex-col items-center justify-center my-auto px-2">
        <GameTable
          lastPlay={ruleState.table?.lastPlay ?? null}
          isRevolution={isEffectiveRevolution}
          lockedSuits={ruleState.table?.lockedSuits ?? []}
        />

        {/* Turn prompt indicator */}
        <div className="text-xs sm:text-sm font-black text-emerald-200 mt-2 flex items-center space-x-1">
          {isMyTurn ? (
            <span className="text-yellow-400 font-extrabold bg-emerald-950 px-3.5 py-1 rounded-full border border-yellow-400/80 shadow-md">
              {t.table.yourTurn}
            </span>
          ) : (
            <span className="text-emerald-300/80 bg-emerald-950/60 px-3.5 py-1 rounded-full">
              {players.find((p) => p.id === currentTurnPlayerId)?.name ?? '...'} {t.table.waitingTurn}
            </span>
          )}
        </div>
      </div>

      {/* Bottom Area: Actions & Hand */}
      <div className="w-full flex flex-col items-center justify-end pb-2">
        <ActionPanel
          isMyTurn={isMyTurn}
          canPlay={canPlay}
          canPass={canPass}
          hintText={isMyTurn ? t.table.hints[playHintKey] : undefined}
          onPlay={handlePlay}
          onPass={handlePass}
          pendingHandAction={
            ruleState.pendingHandAction
              ? {
                  type: ruleState.pendingHandAction.type,
                  count: ruleState.pendingHandAction.count,
                  targetPlayerName: targetPlayer?.name,
                }
              : null
          }
          selectedCardsCount={selectedCardIds.length}
          onPassCards={handlePassCards}
          onDiscardCards={handleDiscardCards}
        />

        <PlayerHand
          cards={myHand}
          selectedCardIds={selectedCardIds}
          onToggleSelect={toggleSelect}
          disabled={!isMyTurn}
          chips={myPlayer?.chips}
        />
      </div>

      {/* Result Modal */}
      {isGameOver && (
        <ResultModal
          rankings={winnerPlayerIds}
          players={players}
          isHost={isHost}
          onNextRound={onNextRound}
          onRestart={onRestart}
        />
      )}
    </div>
  );
};
