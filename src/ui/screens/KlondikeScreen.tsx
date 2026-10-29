import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { GameRunner } from '../../core/engine/game-runner.js';
import { KlondikePlugin } from '../../core/rules/klondike/index.js';
import type { KlondikeAction, KlondikeRuleState } from '../../core/rules/klondike/types.js';
import type { RegularCard, Suit } from '../../core/types/card.js';
import { CardView } from '../components/CardView.js';
import { AdBannerContainer } from '../components/AdBannerContainer.js';
import { RulesModal } from '../components/RulesModal.js';
import {
  playCardPlaySound,
  playTapSound,
  playRevolutionSound,
  isAudioMuted,
  setAudioMuted,
} from '../utils/sound.js';

export interface KlondikeScreenProps {
  onBackToLobby: () => void;
  playerName?: string;
}

const SUITS: Suit[] = ['spade', 'heart', 'diamond', 'club'];
const SUIT_ICONS: Record<Suit, string> = {
  spade: '♠',
  heart: '♥',
  diamond: '♦',
  club: '♣',
};

export const KlondikeScreen: React.FC<KlondikeScreenProps> = ({
  onBackToLobby,
  playerName = 'Player',
}) => {
  const plugin = useMemo(() => new KlondikePlugin(), []);
  const [runner, setRunner] = useState<GameRunner<any, KlondikeRuleState, KlondikeAction>>(() => {
    return new GameRunner(plugin, [{ id: 'p1', name: playerName }]);
  });

  const [stateVersion, setStateVersion] = useState(0);
  const [isMuted, setIsMuted] = useState(isAudioMuted());
  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);

  // Selection state: { source: 'waste' | 'tableau', tableauIndex?: number, cardIndex?: number, cardId: string }
  const [selectedSource, setSelectedSource] = useState<{
    source: 'waste' | 'tableau' | 'foundation';
    tableauIndex?: number;
    cardIndex?: number;
    suit?: Suit;
    card: RegularCard;
  } | null>(null);

  const context = runner.getContext();
  const ruleState = runner.getRuleState();

  const restartGame = useCallback(() => {
    playTapSound();
    setSelectedSource(null);
    setRunner(new GameRunner(plugin, [{ id: 'p1', name: playerName }]));
    setStateVersion((v) => v + 1);
  }, [plugin, playerName]);

  const dispatchAction = useCallback(
    (action: KlondikeAction) => {
      if (!runner.canExecute('p1', action)) return false;
      const events = runner.execute('p1', action);
      playCardPlaySound();

      if (events.some((e) => e.type === 'GAME_CLEARED')) {
        playRevolutionSound();
      }

      setSelectedSource(null);
      setStateVersion((v) => v + 1);
      return true;
    },
    [runner]
  );

  // Stock click
  const handleStockClick = () => {
    playTapSound();
    if (ruleState.stock.length > 0) {
      dispatchAction({ type: 'DRAW' });
    } else if (ruleState.waste.length > 0) {
      dispatchAction({ type: 'RECYCLE_WASTE' });
    }
  };

  // Waste card click
  const handleWasteCardClick = (card: RegularCard) => {
    playTapSound();
    if (selectedSource?.source === 'waste') {
      // Double tap on waste: try AUTO_MOVE to foundation
      dispatchAction({ type: 'AUTO_MOVE', cardId: card.id });
    } else {
      setSelectedSource({ source: 'waste', card });
    }
  };

  // Foundation pile click
  const handleFoundationClick = (suit: Suit) => {
    playTapSound();
    const pile = ruleState.foundations[suit];

    // If something is selected, attempt to move it here
    if (selectedSource) {
      if (selectedSource.source === 'waste') {
        dispatchAction({ type: 'MOVE_WASTE_TO_FOUNDATION' });
      } else if (selectedSource.source === 'tableau' && selectedSource.tableauIndex !== undefined) {
        dispatchAction({
          type: 'MOVE_TABLEAU_TO_FOUNDATION',
          tableauIndex: selectedSource.tableauIndex,
        });
      }
      return;
    }

    // Nothing selected: if foundation has cards, select top card
    if (pile.length > 0) {
      setSelectedSource({
        source: 'foundation',
        suit,
        card: pile[pile.length - 1]!,
      });
    }
  };

  // Tableau column or card click
  const handleTableauClick = (
    tableauIndex: number,
    cardIndex?: number,
    card?: RegularCard,
    isFaceUp?: boolean
  ) => {
    playTapSound();

    // 1. If we have a selection, attempt to move to this tableau
    if (selectedSource) {
      if (selectedSource.source === 'waste') {
        const moved = dispatchAction({
          type: 'MOVE_WASTE_TO_TABLEAU',
          tableauIndex,
        });
        if (moved) return;
      } else if (
        selectedSource.source === 'tableau' &&
        selectedSource.tableauIndex !== undefined &&
        selectedSource.cardIndex !== undefined
      ) {
        if (selectedSource.tableauIndex === tableauIndex) {
          // Deselect or try auto move
          if (card) {
            dispatchAction({ type: 'AUTO_MOVE', cardId: card.id });
          } else {
            setSelectedSource(null);
          }
          return;
        }
        const moved = dispatchAction({
          type: 'MOVE_TABLEAU_TO_TABLEAU',
          fromTableauIndex: selectedSource.tableauIndex,
          cardIndex: selectedSource.cardIndex,
          toTableauIndex: tableauIndex,
        });
        if (moved) return;
      } else if (selectedSource.source === 'foundation' && selectedSource.suit) {
        const moved = dispatchAction({
          type: 'MOVE_FOUNDATION_TO_TABLEAU',
          suit: selectedSource.suit,
          toTableauIndex: tableauIndex,
        });
        if (moved) return;
      }
    }

    // 2. If no valid move happened and a face-up card was clicked, select it
    if (card && isFaceUp && cardIndex !== undefined) {
      setSelectedSource({
        source: 'tableau',
        tableauIndex,
        cardIndex,
        card,
      });
    } else {
      setSelectedSource(null);
    }
  };

  const handleToggleMute = () => {
    const next = !isMuted;
    setAudioMuted(next);
    setIsMuted(next);
  };

  return (
    <div
      data-testid="klondike-screen"
      className="min-h-screen w-full flex flex-col items-center bg-[#073627] text-white p-2 select-none overflow-x-hidden font-sans"
    >
      {/* Rules Modal */}
      <RulesModal
        isOpen={isRulesModalOpen}
        gameId="klondike"
        onClose={() => setIsRulesModalOpen(false)}
      />

      {/* Top Header Bar */}
      <div className="w-full max-w-4xl flex items-center justify-between px-2 py-1.5 border-b border-emerald-800/60 mb-1">
        <div className="flex items-center space-x-2">
          <button
            type="button"
            data-testid="klondike-back-button"
            onClick={onBackToLobby}
            className="px-2.5 py-1 text-xs rounded-xl bg-emerald-900/80 hover:bg-emerald-800 border border-emerald-700/60 text-emerald-200 font-bold transition active:scale-95 flex items-center space-x-1"
          >
            <span>⬅</span>
            <span>ロビー</span>
          </button>
          <span className="text-base sm:text-lg font-black text-yellow-400 tracking-wider flex items-center space-x-1">
            <span>🎴</span>
            <span>ソリティア</span>
          </span>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-950/80 border border-yellow-500/40 text-yellow-300 font-mono font-bold">
            {ruleState.moveCount} 手
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            data-testid="klondike-rules-button"
            onClick={() => setIsRulesModalOpen(true)}
            className="px-2.5 py-1 text-xs rounded-xl bg-emerald-900/80 hover:bg-emerald-800 border border-emerald-700/60 text-yellow-300 font-bold transition active:scale-95 flex items-center space-x-1"
          >
            <span>📋</span>
            <span>ルール</span>
          </button>
          <button
            type="button"
            data-testid="klondike-sound-toggle"
            onClick={handleToggleMute}
            className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-full bg-emerald-900/80 hover:bg-emerald-800 text-yellow-300 border border-emerald-700 font-bold text-xs shadow-sm transition active:scale-95"
          >
            {isMuted ? '🔇' : '🔊'}
          </button>
          <button
            type="button"
            data-testid="klondike-restart-button"
            onClick={restartGame}
            className="px-3 py-1 text-xs rounded-xl bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 text-gray-950 font-black shadow transition active:scale-95 flex items-center space-x-1"
          >
            <span>🔄</span>
            <span>新規ゲーム</span>
          </button>
        </div>
      </div>

      {/* Policy-compliant Ad container with CLS prevention */}
      <AdBannerContainer slotId="solitaire-top" />

      {/* Top Play Area: Stock & Waste on Left, Foundations on Right */}
      <div className="w-full max-w-4xl grid grid-cols-7 gap-1.5 sm:gap-3 px-1 sm:px-4 py-2">
        {/* Col 0: Stock Pile */}
        <div className="flex justify-center items-center">
          {ruleState.stock.length > 0 ? (
            <button
              type="button"
              data-testid="stock-pile"
              onClick={handleStockClick}
              className="relative w-11 h-16 sm:w-16 sm:h-24 rounded-lg bg-indigo-900 border-2 border-indigo-300/80 shadow-md flex items-center justify-center p-1 cursor-pointer hover:brightness-110 active:scale-95 transition"
            >
              <div className="w-full h-full rounded border border-indigo-400/40 bg-gradient-to-br from-indigo-800 to-blue-950 flex flex-col items-center justify-center text-indigo-200">
                <span className="text-xs sm:text-base">❖</span>
                <span className="text-[10px] font-mono font-bold mt-0.5">{ruleState.stock.length}</span>
              </div>
            </button>
          ) : (
            <button
              type="button"
              data-testid="stock-pile-recycle"
              onClick={handleStockClick}
              className="w-11 h-16 sm:w-16 sm:h-24 rounded-lg border-2 border-dashed border-emerald-700/60 flex flex-col items-center justify-center text-emerald-400/60 hover:text-yellow-300 hover:border-yellow-400/60 transition cursor-pointer"
            >
              <span className="text-base sm:text-xl">🔄</span>
              <span className="text-[9px] mt-0.5 font-bold">リサイクル</span>
            </button>
          )}
        </div>

        {/* Col 1: Waste Pile */}
        <div className="flex justify-center items-center">
          {ruleState.waste.length > 0 ? (
            <div className="relative">
              <CardView
                card={ruleState.waste[ruleState.waste.length - 1]!}
                isSelected={selectedSource?.source === 'waste'}
                onClick={() => handleWasteCardClick(ruleState.waste[ruleState.waste.length - 1]!)}
                className="w-11 h-16 sm:w-16 sm:h-24 text-[10px] sm:text-xs"
              />
              <span className="absolute -bottom-1.5 -right-1 text-[9px] bg-emerald-950 text-emerald-300 px-1 rounded-full font-mono font-bold border border-emerald-700">
                {ruleState.waste.length}
              </span>
            </div>
          ) : (
            <div className="w-11 h-16 sm:w-16 sm:h-24 rounded-lg border-2 border-dashed border-emerald-800/40 flex items-center justify-center text-emerald-600/30 text-xs">
              捨札
            </div>
          )}
        </div>

        {/* Col 2: Spacer / Empty column */}
        <div />

        {/* Cols 3-6: 4 Foundation Piles (Spade, Heart, Diamond, Club) */}
        {SUITS.map((suit) => {
          const pile = ruleState.foundations[suit];
          const topCard = pile.length > 0 ? pile[pile.length - 1]! : null;
          const isSelected = selectedSource?.source === 'foundation' && selectedSource.suit === suit;

          return (
            <div key={suit} className="flex justify-center items-center">
              {topCard ? (
                <CardView
                  card={topCard}
                  isSelected={isSelected}
                  onClick={() => handleFoundationClick(suit)}
                  className="w-11 h-16 sm:w-16 sm:h-24 text-[10px] sm:text-xs"
                />
              ) : (
                <button
                  type="button"
                  data-testid={`foundation-${suit}`}
                  onClick={() => handleFoundationClick(suit)}
                  className={`w-11 h-16 sm:w-16 sm:h-24 rounded-lg border-2 border-dashed flex flex-col items-center justify-center transition ${
                    suit === 'heart' || suit === 'diamond'
                      ? 'border-red-500/40 text-red-400/50 hover:border-red-400'
                      : 'border-emerald-600/50 text-emerald-300/40 hover:border-emerald-400'
                  }`}
                >
                  <span className="text-base sm:text-2xl">{SUIT_ICONS[suit]}</span>
                  <span className="text-[9px] font-bold uppercase tracking-wider">A</span>
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Main Tableau Area: 7 Columns */}
      <div className="w-full max-w-4xl flex-1 grid grid-cols-7 gap-1.5 sm:gap-3 px-1 sm:px-4 pt-3 pb-8 items-start">
        {ruleState.tableaus.map((col, colIdx) => (
          <div
            key={colIdx}
            data-testid={`tableau-col-${colIdx}`}
            onClick={(e) => {
              if (col.length === 0) {
                handleTableauClick(colIdx);
              }
            }}
            className="flex flex-col items-center min-h-[140px] sm:min-h-[200px] rounded-xl p-0.5 cursor-pointer"
          >
            {col.length === 0 ? (
              <div
                className="w-11 h-16 sm:w-16 sm:h-24 rounded-lg border-2 border-dashed border-emerald-800/50 flex flex-col items-center justify-center text-emerald-600/40 text-[10px] font-bold"
              >
                <span>K</span>
                <span className="text-[8px] opacity-75">空列</span>
              </div>
            ) : (
              col.map((cardInfo, rowIdx) => {
                const isSelected =
                  selectedSource?.source === 'tableau' &&
                  selectedSource.tableauIndex === colIdx &&
                  selectedSource.cardIndex !== undefined &&
                  rowIdx >= selectedSource.cardIndex;

                return (
                  <div
                    key={cardInfo.card.id}
                    style={{
                      marginTop: rowIdx === 0 ? '0px' : cardInfo.isFaceUp ? '-46px' : '-52px',
                      zIndex: rowIdx + (isSelected ? 30 : 1),
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTableauClick(colIdx, rowIdx, cardInfo.card, cardInfo.isFaceUp);
                    }}
                    className="relative transition-transform duration-100"
                  >
                    <CardView
                      card={cardInfo.card}
                      isFaceDown={!cardInfo.isFaceUp}
                      isSelected={isSelected}
                      className="w-11 h-16 sm:w-16 sm:h-24 text-[10px] sm:text-xs"
                    />
                  </div>
                );
              })
            )}
          </div>
        ))}
      </div>

      {/* Victory Celebration Modal */}
      {context.isGameOver && (
        <div
          data-testid="solitaire-victory-modal"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 animate-in fade-in"
        >
          <div className="bg-emerald-950 border-2 border-yellow-400 rounded-3xl p-6 w-full max-w-sm text-center shadow-2xl animate-bounce-short">
            <span className="text-4xl">👑</span>
            <h2 className="text-2xl font-black text-yellow-400 mt-2 mb-1 tracking-wider">
              CLEAR!!
            </h2>
            <p className="text-xs text-emerald-200 mb-4">
              おめでとうございます！すべての組札を完成させました！
            </p>

            <div className="bg-emerald-900/80 p-3 rounded-2xl border border-yellow-500/30 mb-5 text-sm">
              <span className="text-emerald-300">手数: </span>
              <span className="font-mono font-black text-yellow-300 text-lg">
                {ruleState.moveCount}
              </span>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                data-testid="solitaire-replay-button"
                onClick={restartGame}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-300 text-gray-950 font-black text-sm shadow-lg transition active:scale-95"
              >
                もう一度遊ぶ
              </button>
              <button
                type="button"
                onClick={onBackToLobby}
                className="w-full py-2.5 rounded-2xl bg-emerald-900 hover:bg-emerald-800 text-emerald-200 text-xs font-bold transition active:scale-95"
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
