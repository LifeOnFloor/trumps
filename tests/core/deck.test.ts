import { describe, it, expect } from 'vitest';
import { createDeck, shuffleDeck, dealHands } from '../../src/core/utils/deck.js';

describe('deck utils', () => {
  it('creates standard 52 cards without jokers', () => {
    const deck = createDeck();
    expect(deck).toHaveLength(52);
    expect(deck.filter((c) => c.isJoker)).toHaveLength(0);
    expect(deck[0]?.id).toBe('S_1');
  });

  it('creates 53 cards with 1 joker by default or option', () => {
    const deck = createDeck({ jokerCount: 1 });
    expect(deck).toHaveLength(53);
    const jokers = deck.filter((c) => c.isJoker);
    expect(jokers).toHaveLength(1);
    expect(jokers[0]?.id).toBe('JOKER_1');
  });

  it('shuffles deck immutably', () => {
    const deck = createDeck({ jokerCount: 1 });
    const shuffled = shuffleDeck(deck);
    expect(shuffled).toHaveLength(53);
    expect(shuffled).not.toBe(deck);
    expect(new Set(shuffled.map((c) => c.id)).size).toBe(53);
  });

  it('deals hands evenly among players', () => {
    const deck = createDeck({ jokerCount: 1 }); // 53 cards
    const hands = dealHands(deck, 4);
    expect(hands).toHaveLength(4);
    const totalDealt = hands.reduce((sum, h) => sum + h.length, 0);
    expect(totalDealt).toBe(53);
    // 53 / 4 = 13 ... 1 => three players have 13, one has 14
    const handCounts = hands.map((h) => h.length).sort();
    expect(handCounts).toEqual([13, 13, 13, 14]);
  });
});
