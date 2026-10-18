import type { Card, RegularCard, JokerCard, Suit, Rank } from '../types/card.js';
import { SUITS, RANKS } from '../types/card.js';

const SUIT_PREFIX: Record<Suit, string> = {
  spade: 'S',
  heart: 'H',
  diamond: 'D',
  club: 'C',
};

export interface CreateDeckOptions {
  jokerCount?: number;
}

export function createDeck(options: CreateDeckOptions = {}): Card[] {
  const { jokerCount = 0 } = options;
  const cards: Card[] = [];

  for (const suit of SUITS) {
    const prefix = SUIT_PREFIX[suit];
    for (const rank of RANKS) {
      const card: RegularCard = {
        id: `${prefix}_${rank}`,
        isJoker: false,
        suit,
        rank,
      };
      cards.push(card);
    }
  }

  for (let i = 1; i <= jokerCount; i++) {
    const joker: JokerCard = {
      id: `JOKER_${i}`,
      isJoker: true,
    };
    cards.push(joker);
  }

  return cards;
}

export function shuffleDeck(deck: readonly Card[], rng: () => number = Math.random): Card[] {
  const result = [...deck];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const temp = result[i]!;
    result[i] = result[j]!;
    result[j] = temp;
  }
  return result;
}

export function dealHands(deck: readonly Card[], playerCount: number): Card[][] {
  if (playerCount <= 0) {
    throw new Error('playerCount must be greater than 0');
  }

  const hands: Card[][] = Array.from({ length: playerCount }, () => []);
  deck.forEach((card, index) => {
    hands[index % playerCount]!.push(card);
  });

  return hands;
}
