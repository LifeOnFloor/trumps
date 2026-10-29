import type { RegularCard } from '../../types/card.js';

export interface ShinkeiSuijakuConfig {
  readonly pairRule: 'rank';
  readonly jokerCount: number;
}

export interface GridCard {
  readonly index: number;
  readonly card: RegularCard | null; // null when face-down and sanitized
  readonly isFlipped: boolean;
  readonly isTaken: boolean;
  readonly takenByPlayerId: string | null;
}

export interface ShinkeiSuijakuRuleState {
  readonly config: ShinkeiSuijakuConfig;
  readonly cards: readonly GridCard[];
  readonly firstFlippedIndex: number | null;
  readonly secondFlippedIndex: number | null;
  readonly lastMatchResult: 'match' | 'miss' | null;
  readonly playerScores: Readonly<Record<string, number>>; // playerId -> pairs count
  readonly turnCount: number; // total turn attempts
}

export type SanitizedShinkeiSuijakuRuleState = ShinkeiSuijakuRuleState;

export type ShinkeiSuijakuAction =
  | { readonly type: 'FLIP'; readonly cardIndex: number }
  | { readonly type: 'NEXT_TURN' };
