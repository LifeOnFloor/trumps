import React, { useState } from 'react';
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

export interface TableScreenProps {
  state: SanitizedState<DaifugoRuleState>;
  myPlayerId: string;
  peerId?: string;
  disconnectedPlayerIds?: readonly string[];
  roomConfig?: DaifugoConfig;
  recentEvents: readonly GameEvent[];
  onPlay: (cardIds: string[]) => void;
  onPass: () => void;
  onPassCards?: (cardIds: string[]) => void;
  onDiscardCards?: (cardIds: string[]) => void;
  onRestart?: () => void;
  onLeaveRoom?: () => void;
}

export const TableScreen: React.FC<TableScreenProps> = ({
  state,
  myPlayerId,
  peerId,
  disconnectedPlayerIds = [],
  roomConfig,
  recentEvents,
  onPlay,
  onPass,
  onPassCards,
  onDiscardCards,
  onRestart,
  onLeaveRoom,
}) => {
  const { t } = useTranslation();
  const { context, ruleState } = state;
  const { players, currentTurnPlayerId, isGameOver, winnerPlayerIds } = context;

  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

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
  } = useCardSelection({
    hand: myHand,
    table: ruleState.table,
    isRevolution: isEffectiveRevolution,
    config: activeConfig,
    isMyTurn,
  });

  const handlePlay = () => {
    if (canPlay) {
      onPlay(selectedCardIds);
      clearSelection();
    }
  };

  const handlePass = () => {
    if (canPass) {
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

  const handleCopyInviteLink = () => {
    if (peerId && typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('room', peerId);
      navigator.clipboard.writeText(url.toString());
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  return (
    <div className="relative flex flex-col justify-between items-center min-h-screen p-2 sm:p-4 bg-gradient-to-b from-emerald-950 via-emerald-900 to-emerald-950 text-white overflow-hidden select-none">
      {/* Event banner toast */}
      <EventBanner events={recentEvents} players={players} />

      {/* Rules Modal */}
      <RulesModal
        isOpen={isRulesModalOpen}
        config={activeConfig}
        onClose={() => setIsRulesModalOpen(false)}
      />

      {/* Top Bar: Title & Utility Buttons */}
      <div className="w-full max-w-4xl flex items-center justify-between px-2 pt-1 pb-2">
        <div className="flex items-center space-x-2">
          <span className="text-xl">🃏</span>
          <span className="font-black text-sm sm:text-base text-yellow-400 tracking-wider">
            {t.app.title}
          </span>
          {activeConfig.chipsMode && (
            <span
              data-testid="chips-mode-badge"
              className="text-[10px] px-2.5 py-0.5 rounded-full bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 font-black shadow-sm"
            >
              {t.table.chipsBadge}
            </span>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <LanguageSelector />

          {peerId && (
            <button
              type="button"
              onClick={handleCopyInviteLink}
              className="px-2.5 py-1 text-xs rounded-full bg-emerald-800/80 hover:bg-emerald-700 text-emerald-200 border border-emerald-600/60 font-bold transition active:scale-95 flex items-center space-x-1 shadow-sm"
            >
              <span>🔗</span>
              <span>{copiedLink ? t.app.copied : t.app.inviteLink}</span>
            </button>
          )}

          <button
            type="button"
            data-testid="table-rules-button"
            onClick={() => setIsRulesModalOpen(true)}
            className="px-2.5 py-1 text-xs rounded-full bg-emerald-800/80 hover:bg-emerald-700 text-yellow-300 border border-yellow-500/50 font-black transition active:scale-95 flex items-center space-x-1 shadow-sm"
          >
            <span>📋</span>
            <span>{t.app.rules}</span>
          </button>

          {onLeaveRoom && (
            <button
              type="button"
              data-testid="leave-room-button"
              onClick={onLeaveRoom}
              className="px-2.5 py-1 text-xs rounded-full bg-red-900/80 hover:bg-red-800 text-red-200 border border-red-600/60 font-bold transition active:scale-95 flex items-center space-x-1 shadow-sm"
            >
              <span>🚪</span>
              <span>退出</span>
            </button>
          )}
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
            <span className="text-yellow-400 animate-pulse bg-emerald-950/80 px-3.5 py-1 rounded-full border border-yellow-400/50 shadow-sm">
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
          onRestart={onRestart}
        />
      )}
    </div>
  );
};
