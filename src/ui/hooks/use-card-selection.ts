import { useState, useMemo, useCallback } from 'react';
import type { Card } from '../../core/types/card.js';
import type { DaifugoConfig } from '../../core/rules/daifugo/config.js';
import type { DaifugoTableState } from '../../core/rules/daifugo/types.js';
import { isValidPlay } from '../../core/rules/daifugo/validator.js';

export interface UseCardSelectionProps {
  hand: readonly Card[];
  table: DaifugoTableState;
  isRevolution: boolean;
  config: DaifugoConfig;
  isMyTurn: boolean;
}

export type PlayHintKey =
  | 'waitingTurn'
  | 'selectCards'
  | 'readyToPlay'
  | 'invalidMeld'
  | 'countMismatch'
  | 'notStrongEnough'
  | 'suitLocked'
  | 'sequenceLocked';

export function useCardSelection({
  hand,
  table,
  isRevolution,
  config,
  isMyTurn,
}: UseCardSelectionProps) {
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);

  const toggleSelect = useCallback((cardId: string) => {
    setSelectedCardIds((prev) =>
      prev.includes(cardId) ? prev.filter((id) => id !== cardId) : [...prev, cardId]
    );
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedCardIds([]);
  }, []);

  const validationResult = useMemo(() => {
    if (!isMyTurn) {
      return { canPlay: false, hintKey: 'waitingTurn' as PlayHintKey };
    }
    if (selectedCardIds.length === 0) {
      return { canPlay: false, hintKey: 'selectCards' as PlayHintKey };
    }

    const handMap = new Map(hand.map((c) => [c.id, c]));
    const selectedCards: Card[] = [];
    for (const id of selectedCardIds) {
      const card = handMap.get(id);
      if (!card) return { canPlay: false, hintKey: 'invalidMeld' as PlayHintKey };
      selectedCards.push(card);
    }

    const { valid, reason } = isValidPlay(selectedCards, table, isRevolution, config);
    if (valid) {
      return { canPlay: true, hintKey: 'readyToPlay' as PlayHintKey };
    }

    let hintKey: PlayHintKey = 'invalidMeld';
    if (reason === 'Meld type mismatch' || reason === 'Card count mismatch') {
      hintKey = 'countMismatch';
    } else if (reason === 'Cards are not strong enough') {
      hintKey = 'notStrongEnough';
    } else if (reason?.startsWith('Suit locked')) {
      hintKey = 'suitLocked';
    } else if (reason?.startsWith('Sequence locked')) {
      hintKey = 'sequenceLocked';
    }

    return { canPlay: false, hintKey };
  }, [isMyTurn, selectedCardIds, hand, table, isRevolution, config]);

  const canPass = useMemo(() => {
    // Can only pass when it's your turn and table is not empty
    return isMyTurn && Boolean(table?.lastPlay);
  }, [isMyTurn, table?.lastPlay]);

  return {
    selectedCardIds,
    toggleSelect,
    clearSelection,
    canPlay: validationResult.canPlay,
    playHintKey: validationResult.hintKey,
    canPass,
  };
}
