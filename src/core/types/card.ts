export type Suit = 'spade' | 'heart' | 'diamond' | 'club';
export type Rank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13;

export interface RegularCard {
  readonly id: string;
  readonly isJoker: false;
  readonly suit: Suit;
  readonly rank: Rank;
}

export interface JokerCard {
  readonly id: string;
  readonly isJoker: true;
  readonly suit?: undefined;
  readonly rank?: undefined;
}

export type Card = RegularCard | JokerCard;

export const SUITS: readonly Suit[] = ['spade', 'heart', 'diamond', 'club'] as const;
export const RANKS: readonly Rank[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13] as const;
