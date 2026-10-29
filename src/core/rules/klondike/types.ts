import type { RegularCard, Suit } from '../../types/card.js';

export interface KlondikeCard {
  readonly card: RegularCard;
  readonly isFaceUp: boolean;
}

export type FoundationPiles = Record<Suit, readonly RegularCard[]>;

export interface KlondikeRuleState {
  readonly stock: readonly RegularCard[]; // Draw pile (face-down)
  readonly waste: readonly RegularCard[]; // Discard pile (face-up)
  readonly foundations: FoundationPiles; // spade, heart, diamond, club piles
  readonly tableaus: readonly (readonly KlondikeCard[])[]; // 7 columns
  readonly drawCount: 1 | 3;
  readonly moveCount: number;
}

export interface KlondikeConfig {
  readonly drawCount: 1 | 3;
}

export type KlondikeAction =
  | { readonly type: 'DRAW' }
  | { readonly type: 'RECYCLE_WASTE' }
  | { readonly type: 'MOVE_WASTE_TO_TABLEAU'; readonly tableauIndex: number }
  | { readonly type: 'MOVE_WASTE_TO_FOUNDATION' }
  | {
      readonly type: 'MOVE_TABLEAU_TO_TABLEAU';
      readonly fromTableauIndex: number;
      readonly cardIndex: number;
      readonly toTableauIndex: number;
    }
  | { readonly type: 'MOVE_TABLEAU_TO_FOUNDATION'; readonly tableauIndex: number }
  | { readonly type: 'MOVE_FOUNDATION_TO_TABLEAU'; readonly suit: Suit; readonly toTableauIndex: number }
  | { readonly type: 'AUTO_MOVE'; readonly cardId: string };
