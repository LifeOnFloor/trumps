import React from 'react';
import type { SanitizedState, GameEvent } from '../../core/types/engine.js';
import type { DaifugoRuleState } from '../../core/rules/daifugo/types.js';
import { useCardSelection } from '../hooks/use-card-selection.js';
import { OpponentSeat } from '../components/OpponentSeat.js';
import { GameTable } from '../components/GameTable.js';
import { PlayerHand } from '../components/PlayerHand.js';
import { ActionPanel } from '../components/ActionPanel.js';
import { EventBanner } from '../components/EventBanner.js';
import { ResultModal } from '../components/ResultModal.js';

export interface TableScreenProps {
  state: SanitizedState<DaifugoRuleState>;
  myPlayerId: string;
  recentEvents: readonly GameEvent[];
  onPlay: (cardIds: string[]) => void;
  onPass: () => void;
  onRestart?: () => void;
}

export const TableScreen: React.FC<TableScreenProps> = ({
  state,
  myPlayerId,
  recentEvents,
  onPlay,
  onPass,
  onRestart,
}) => {
  const { context, ruleState } = state;
  const { players, currentTurnPlayerId, isGameOver, winnerPlayerIds } = context;

  const myPlayer = players.find((p) => p.id === myPlayerId);
  const myHand = myPlayer?.hand ?? [];
  const opponents = players.filter((p) => p.id !== myPlayerId);

  const isMyTurn = currentTurnPlayerId === myPlayerId;

  const {
    selectedCardIds,
    toggleSelect,
    clearSelection,
    canPlay,
    canPass,
  } = useCardSelection({
    hand: myHand,
    table: ruleState.table,
    isRevolution: ruleState.isRevolution,
    config: ruleState.config,
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

  return (
    <div className="relative flex flex-col justify-between items-center min-h-screen p-2 sm:p-4 bg-emerald-950 text-white overflow-hidden">
      {/* Event banner */}
      <EventBanner events={recentEvents} />

      {/* Opponents row */}
      <div className="w-full max-w-4xl flex items-center justify-center space-x-2 sm:space-x-4 pt-2">
        {opponents.map((opponent) => (
          <OpponentSeat
            key={opponent.id}
            player={opponent}
            isCurrentTurn={currentTurnPlayerId === opponent.id}
          />
        ))}
      </div>

      {/* Center Table */}
      <div className="w-full flex flex-col items-center justify-center my-auto">
        <GameTable
          lastPlay={ruleState.table.lastPlay}
          isRevolution={ruleState.isRevolution}
          lockedSuits={ruleState.table.lockedSuits}
        />

        {/* Turn prompt indicator */}
        <div className="text-xs sm:text-sm font-extrabold text-emerald-200 mt-2">
          {isMyTurn ? (
            <span className="text-yellow-400 animate-pulse">★ あなたのターンです！</span>
          ) : (
            <span>
              {players.find((p) => p.id === currentTurnPlayerId)?.name ?? '待機中'} のターン...
            </span>
          )}
        </div>
      </div>

      {/* Bottom Area: Hand & Actions */}
      <div className="w-full flex flex-col items-center justify-end pb-2">
        <ActionPanel
          isMyTurn={isMyTurn}
          canPlay={canPlay}
          canPass={canPass}
          onPlay={handlePlay}
          onPass={handlePass}
        />

        <PlayerHand
          cards={myHand}
          selectedCardIds={selectedCardIds}
          onToggleSelect={toggleSelect}
          disabled={!isMyTurn}
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
