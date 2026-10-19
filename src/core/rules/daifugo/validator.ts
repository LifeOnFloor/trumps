import type { Card, RegularCard, Suit, Rank } from '../../types/card.js';
import type { DaifugoConfig } from './config.js';
import type { PlayMeld, MeldType, DaifugoTableState } from './types.js';

export function getCardBaseStrength(card: Card, isRevolution: boolean): number {
  if (card.isJoker) {
    return 16; // Joker is highest in single play (both normal and revolution)
  }
  const rank = card.rank;
  const normalStrength = rank === 1 ? 14 : rank === 2 ? 15 : rank; // 3..13, A=14, 2=15
  if (!isRevolution) {
    return normalStrength;
  }
  // Revolution: 2 is weakest (3), 3 is strongest (15)
  // 18 - normalStrength:
  // 2 (15) -> 3
  // 1 (14) -> 4
  // 13 (13) -> 5
  // ...
  // 3 (3) -> 15
  return 18 - normalStrength;
}

export function parseMeld(
  cards: readonly Card[],
  isRevolution: boolean,
  config: DaifugoConfig
): PlayMeld | null {
  if (cards.length === 0) return null;

  // Single card
  if (cards.length === 1) {
    const card = cards[0]!;
    return {
      type: 'single',
      cards,
      effectiveStrength: getCardBaseStrength(card, isRevolution),
      suits: card.isJoker ? [] : [card.suit],
      playerId: '',
    };
  }

  const regularCards = cards.filter((c): c is RegularCard => !c.isJoker);
  const jokerCount = cards.length - regularCards.length;

  // Pair (2 or more cards of same rank)
  if (regularCards.length === 0) {
    // All jokers (rare, but valid if multiple jokers)
    return {
      type: 'pair',
      cards,
      effectiveStrength: 16,
      suits: [],
      playerId: '',
    };
  }

  const firstRank = regularCards[0]!.rank;
  const allSameRank = regularCards.every((c) => c.rank === firstRank);
  if (allSameRank) {
    const suits = regularCards.map((c) => c.suit);
    const sandstormActive = isSandstorm(cards, config);
    const strength = sandstormActive ? 16 : getCardBaseStrength(regularCards[0]!, isRevolution);
    return {
      type: 'pair',
      cards,
      effectiveStrength: strength,
      suits,
      playerId: '',
    };
  }

  // Stairs (Sequence of 3 or more of the same suit)
  if (config.stairs && cards.length >= 3) {
    const stairsMeld = parseStairsMeld(cards, isRevolution);
    if (stairsMeld) return stairsMeld;
  }

  return null;
}

function parseStairsMeld(cards: readonly Card[], isRevolution: boolean): PlayMeld | null {
  const regularCards = cards.filter((c): c is RegularCard => !c.isJoker);
  const jokerCount = cards.length - regularCards.length;
  if (regularCards.length === 0) return null;

  // Must all have same suit
  const suit = regularCards[0]!.suit;
  if (!regularCards.every((c) => c.suit === suit)) {
    return null;
  }

  // Check sequence in Daifugo order: 3, 4, 5, 6, 7, 8, 9, 10, 11(J), 12(Q), 13(K), 14(A), 15(2)
  // Get normal order values:
  const values = regularCards.map((c) => (c.rank === 1 ? 14 : c.rank === 2 ? 15 : c.rank));
  // Check for duplicates
  const uniqueValues = Array.from(new Set(values)).sort((a, b) => a - b);
  if (uniqueValues.length !== regularCards.length) {
    return null;
  }

  const min = uniqueValues[0]!;
  const max = uniqueValues[uniqueValues.length - 1]!;
  const span = max - min + 1;

  // The span must fit cards.length and jokers must cover gaps
  const missingInSpan = span - uniqueValues.length;
  if (missingInSpan > jokerCount) {
    return null;
  }

  // Also span might be smaller than cards.length if jokers are added to ends
  // Maximum possible length is span + (jokerCount - missingInSpan)
  // And it cannot exceed 15 (cannot go above 2 or below 3)
  const remainingJokers = jokerCount - missingInSpan;
  // If span <= cards.length, can we extend below 3 or above 15?
  // Lowest possible is 3, highest is 15. Total range available must be >= cards.length
  // For simplicity, verify min - remainingJokers >= 3 || max + remainingJokers <= 15
  let possibleMin = min;
  let possibleMax = max;
  let jokersLeft = remainingJokers;

  while (jokersLeft > 0) {
    if (possibleMax < 15) {
      possibleMax++;
      jokersLeft--;
    } else if (possibleMin > 3) {
      possibleMin--;
      jokersLeft--;
    } else {
      return null;
    }
  }

  if (possibleMax - possibleMin + 1 !== cards.length) {
    return null;
  }

  // Calculate effective strength: the highest card in the sequence
  // In normal mode: possibleMax (converted to base strength)
  // In revolution mode: possibleMin (since smaller number is stronger)
  const effectiveRank = isRevolution ? possibleMin : possibleMax;
  const dummyRank = effectiveRank === 14 ? 1 : effectiveRank === 15 ? 2 : (effectiveRank as Rank);
  const effectiveStrength = getCardBaseStrength(
    { id: 'temp', isJoker: false, suit, rank: dummyRank },
    isRevolution
  );

  return {
    type: 'stairs',
    cards,
    effectiveStrength,
    suits: [suit],
    playerId: '',
  };
}

export function isSpadeThree(card: Card): boolean {
  return !card.isJoker && card.suit === 'spade' && card.rank === 3;
}

export function isSingleJoker(meld: PlayMeld): boolean {
  return meld.type === 'single' && meld.cards.length === 1 && meld.cards[0]!.isJoker;
}

export function isValidPlay(
  cards: readonly Card[],
  table: DaifugoTableState,
  isRevolution: boolean,
  config: DaifugoConfig
): { valid: boolean; meld?: PlayMeld; reason?: string } {
  const meld = parseMeld(cards, isRevolution, config);
  if (!meld) {
    return { valid: false, reason: 'Invalid meld' };
  }

  // If table is empty, parent can play any valid meld
  if (!table.lastPlay) {
    return { valid: true, meld };
  }

  const last = table.lastPlay;

  // Spade 3 return check
  if (config.spadeThreeReturn && isSingleJoker(last)) {
    if (cards.length === 1 && isSpadeThree(cards[0]!)) {
      return { valid: true, meld };
    }
  }

  // Must match type and count
  if (meld.type !== last.type) {
    return { valid: false, reason: 'Meld type mismatch' };
  }
  if (meld.cards.length !== last.cards.length) {
    return { valid: false, reason: 'Card count mismatch' };
  }

  // Re-evaluate last play's effective strength under current revolution/11-back state
  const lastMeldCurrent = parseMeld(last.cards, isRevolution, config);
  const lastStrength = lastMeldCurrent ? lastMeldCurrent.effectiveStrength : last.effectiveStrength;

  // Must be strictly stronger
  if (meld.effectiveStrength <= lastStrength) {
    return { valid: false, reason: 'Cards are not strong enough' };
  }

  // Suit lock check
  if (table.lockedSuits && table.lockedSuits.length > 0) {
    // Current play must include all locked suits
    const meldSuits = new Set(meld.suits);
    for (const locked of table.lockedSuits) {
      if (!meldSuits.has(locked)) {
        return { valid: false, reason: `Suit locked to ${table.lockedSuits.join(',')}` };
      }
    }
  }

  // Sequence lock check
  if (table.isSequenceLocked && table.requiredNextRank !== null) {
    const isPureJoker = meld.cards.every((c) => c.isJoker);
    if (!isPureJoker) {
      const currentOrder = getMeldOrder(meld);
      if (currentOrder !== table.requiredNextRank) {
        return { valid: false, reason: `Sequence locked to rank order ${table.requiredNextRank}` };
      }
    }
  }

  return { valid: true, meld };
}

export function getMeldOrder(meld: PlayMeld): number | null {
  const reg = meld.cards.find((c) => !c.isJoker);
  if (!reg) return null;
  return reg.rank === 1 ? 14 : reg.rank === 2 ? 15 : reg.rank;
}

export function checkSequenceLock(
  currentMeld: PlayMeld,
  lastPlay: PlayMeld | null,
  existingLock: boolean,
  isRevolution: boolean,
  config: DaifugoConfig
): { isSequenceLocked: boolean; requiredNextRank: number | null } {
  if (!config.sequenceLock && config.suitLock !== 'geki') {
    return { isSequenceLocked: false, requiredNextRank: null };
  }
  const nextStep = isRevolution ? -1 : 1;
  const lastOrder = lastPlay ? getMeldOrder(lastPlay) : null;
  const rawOrder = getMeldOrder(currentMeld);
  // Pure joker substitutes for the expected next rank
  const currentOrder = rawOrder ?? (lastOrder !== null ? lastOrder + nextStep : null);
  if (currentOrder === null) return { isSequenceLocked: existingLock, requiredNextRank: null };

  const nextRequired = currentOrder + nextStep;
  const isWithinValidRanks = nextRequired >= 3 && nextRequired <= 15;

  if (existingLock) {
    return { isSequenceLocked: true, requiredNextRank: isWithinValidRanks ? nextRequired : null };
  }

  if (!lastPlay) {
    return { isSequenceLocked: false, requiredNextRank: null };
  }

  if (lastOrder !== null && currentOrder === lastOrder + nextStep) {
    return { isSequenceLocked: true, requiredNextRank: isWithinValidRanks ? nextRequired : null };
  }

  return { isSequenceLocked: false, requiredNextRank: null };
}

export function checkSuitLock(
  currentMeld: PlayMeld,
  lastPlay: PlayMeld | null,
  existingLock: readonly Suit[] | null,
  isRevolution: boolean,
  config: DaifugoConfig
): readonly Suit[] | null {
  if (config.suitLock === 'none') return null;
  if (existingLock) return existingLock;
  if (!lastPlay) return null;

  // Check if suits match
  if (currentMeld.suits.length > 0 && currentMeld.suits.length === lastPlay.suits.length) {
    const currentSorted = [...currentMeld.suits].sort();
    const lastSorted = [...lastPlay.suits].sort();
    const isMatch = currentSorted.every((s, i) => s === lastSorted[i]);
    if (!isMatch) return null;

    if (config.suitLock === 'double' && currentMeld.cards.length < 2) {
      return null;
    }

    if (config.suitLock === 'geki') {
      const curOrder = getMeldOrder(currentMeld);
      const lastOrder = getMeldOrder(lastPlay);
      const step = isRevolution ? -1 : 1;
      if (curOrder === null || lastOrder === null || curOrder !== lastOrder + step) {
        return null;
      }
    }

    return currentMeld.suits;
  }
  return null;
}

export function hasEight(cards: readonly Card[]): boolean {
  return cards.some((c) => !c.isJoker && c.rank === 8);
}

export function hasTwo(cards: readonly Card[]): boolean {
  return cards.some((c) => !c.isJoker && c.rank === 2);
}

export function hasThree(cards: readonly Card[]): boolean {
  return cards.some((c) => !c.isJoker && c.rank === 3);
}

export function hasJoker(cards: readonly Card[]): boolean {
  return cards.some((c) => c.isJoker);
}

export function isProhibitedEnding(
  cards: readonly Card[],
  isRevolution: boolean,
  config: DaifugoConfig
): boolean {
  const p = config.prohibitedEndings;
  if (p.joker && hasJoker(cards)) return true;
  if (p.eight && hasEight(cards)) return true;
  if (p.two && !isRevolution && hasTwo(cards)) return true;
  if (p.three && isRevolution && hasThree(cards)) return true;
  return false;
}

export function hasEleven(cards: readonly Card[]): boolean {
  return cards.some((c) => !c.isJoker && c.rank === 11);
}

export function hasNine(cards: readonly Card[]): boolean {
  return cards.some((c) => !c.isJoker && c.rank === 9);
}

export function countFive(cards: readonly Card[]): number {
  return cards.filter((c) => !c.isJoker && c.rank === 5).length;
}

export function countSeven(cards: readonly Card[]): number {
  return cards.filter((c) => !c.isJoker && c.rank === 7).length;
}

export function countTen(cards: readonly Card[]): number {
  return cards.filter((c) => !c.isJoker && c.rank === 10).length;
}

export function isSandstorm(cards: readonly Card[], config: DaifugoConfig): boolean {
  return config.sandstorm && cards.length === 3 && cards.every((c) => !c.isJoker && c.rank === 3);
}
