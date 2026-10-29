import type { RegularCard, Suit } from '../../types/card.js';

export function isRedSuit(suit: Suit): boolean {
  return suit === 'heart' || suit === 'diamond';
}

export function canStackOnTableau(child: RegularCard, parent: RegularCard | null): boolean {
  if (!parent) {
    return child.rank === 13; // Empty column can only receive a King (rank 13)
  }
  const differentColor = isRedSuit(child.suit) !== isRedSuit(parent.suit);
  const oneRankLower = child.rank === parent.rank - 1;
  return differentColor && oneRankLower;
}

export function canStackOnFoundation(card: RegularCard, foundationTop: RegularCard | null): boolean {
  if (!foundationTop) {
    return card.rank === 1; // Empty foundation must start with Ace (rank 1)
  }
  return card.suit === foundationTop.suit && card.rank === foundationTop.rank + 1;
}
