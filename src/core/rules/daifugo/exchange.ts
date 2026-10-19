import type { Card, RegularCard } from '../../types/card.js';
import type { PlayerState } from '../../types/engine.js';
import { getCardBaseStrength } from './validator.js';

export interface TaxExchangeRecord {
  fromPlayerId: string;
  toPlayerId: string;
  cards: readonly Card[];
}

export function sortCardsByStrength(cards: readonly Card[], ascending: boolean = false): Card[] {
  return [...cards].sort((a, b) => {
    const sA = getCardBaseStrength(a, false);
    const sB = getCardBaseStrength(b, false);
    return ascending ? sA - sB : sB - sA;
  });
}

/**
 * Executes automatic tax card exchange between Daifugo <-> Daihinmin and Fugo <-> Hinmin.
 * Pure function: does not mutate inputs.
 */
export function executeTaxCardExchange(
  players: readonly PlayerState[],
  previousRankings: readonly string[]
): {
  nextPlayers: PlayerState[];
  exchanges: TaxExchangeRecord[];
} {
  const count = previousRankings.length;
  if (count < 3) {
    return { nextPlayers: [...players], exchanges: [] };
  }

  const daifugoId = previousRankings[0]!;
  const daihinminId = previousRankings[count - 1]!;
  const fugoId = count >= 4 ? previousRankings[1]! : null;
  const hinminId = count >= 4 ? previousRankings[count - 2]! : null;

  let playerMap = new Map(players.map((p) => [p.id, { ...p, hand: [...p.hand] }]));
  const exchanges: TaxExchangeRecord[] = [];

  // Helper to exchange: poor player gives strongest N cards, rich player gives weakest N cards
  const exchangePair = (richId: string, poorId: string, cardCount: number) => {
    const rich = playerMap.get(richId);
    const poor = playerMap.get(poorId);
    if (!rich || !poor || rich.hand.length < cardCount || poor.hand.length < cardCount) return;

    // Poor player must give highest strength cards
    const poorSorted = sortCardsByStrength(poor.hand, false); // Strongest first
    const poorGiving = poorSorted.slice(0, cardCount);

    // Rich player gives weakest cards
    const richSorted = sortCardsByStrength(rich.hand, true); // Weakest first
    const richGiving = richSorted.slice(0, cardCount);

    const poorGivingIds = new Set(poorGiving.map((c) => c.id));
    const richGivingIds = new Set(richGiving.map((c) => c.id));

    const nextPoorHand = poor.hand.filter((c) => !poorGivingIds.has(c.id)).concat(richGiving);
    const nextRichHand = rich.hand.filter((c) => !richGivingIds.has(c.id)).concat(poorGiving);

    playerMap.set(richId, { ...rich, hand: nextRichHand });
    playerMap.set(poorId, { ...poor, hand: nextPoorHand });

    exchanges.push({
      fromPlayerId: poorId,
      toPlayerId: richId,
      cards: poorGiving,
    });
    exchanges.push({
      fromPlayerId: richId,
      toPlayerId: poorId,
      cards: richGiving,
    });
  };

  // 1. Daifugo <-> Daihinmin (2 cards)
  exchangePair(daifugoId, daihinminId, 2);

  // 2. Fugo <-> Hinmin (1 card) if 4 or more players
  if (fugoId && hinminId && fugoId !== hinminId && fugoId !== daifugoId && hinminId !== daihinminId) {
    exchangePair(fugoId, hinminId, 1);
  }

  const nextPlayers = players.map((p) => playerMap.get(p.id)!);
  return { nextPlayers, exchanges };
}
