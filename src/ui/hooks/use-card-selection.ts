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

  const canPlay = useMemo(() => {
    if (!isMyTurn || selectedCardIds.length === 0) return false;

    const handMap = new Map(hand.map((c) => [c.id, c]));
    const selectedCards: Card[] = [];
    for (const id of selectedCardIds) {
      const card = handMap.get(id);
      if (!card) return false;
      selectedCards.push(card);
    }

    const { valid } = isValidPlay(selectedCards, table, isRevolution, config);
    return valid;
  }, [isMyTurn, selectedCardIds, hand, table, isRevolution, config]);

  const canPass = useMemo(() => {
    // Can only pass when it's your turn and table is not empty
    return isMyTurn && table.lastPlay !== null;
  }, [isMyTurn, table.lastPlay]);

  return {
    selectedCardIds,
    toggleSelect,
    clearSelection,
    canPlay,
    canPass,
  };
}
