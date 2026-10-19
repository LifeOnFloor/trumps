import type { Card, Suit } from '../../types/card.js';
import type { DaifugoConfig } from './config.js';

export type MeldType = 'single' | 'pair' | 'stairs';

export interface PlayMeld {
  readonly type: MeldType;
  readonly cards: readonly Card[];
  readonly effectiveStrength: number; // 比較用数値 (通常: 3=3...13=13, 1=14, 2=15, JOKER=16)
  readonly suits: readonly Suit[];
  readonly playerId: string;
}

export interface DaifugoTableState {
  readonly lastPlay: PlayMeld | null;
  readonly lockedSuits: readonly Suit[] | null;
  readonly isSequenceLocked: boolean;
  readonly requiredNextRank: number | null;
  readonly passedPlayerIds: readonly string[];
}

export type PendingHandAction =
  | { readonly type: 'SEVEN_PASS'; readonly playerId: string; readonly targetPlayerId: string; readonly count: number }
  | { readonly type: 'TEN_DISCARD'; readonly playerId: string; readonly count: number };

export interface DaifugoRuleState {
  readonly config: DaifugoConfig;
  readonly isRevolution: boolean;
  readonly isElevenBack: boolean;
  readonly turnDirection: 1 | -1;
  readonly isSequenceLocked: boolean;
  readonly isGekokujo: boolean;
  readonly previousRankings?: readonly string[];
  readonly pendingHandAction: PendingHandAction | null;
  readonly table: DaifugoTableState;
  readonly rankings: readonly string[];
  readonly foulPlayerIds: readonly string[];
  readonly pot?: number;
}

export type DaifugoAction =
  | { readonly type: 'PLAY'; readonly cardIds: readonly string[] }
  | { readonly type: 'PASS' }
  | { readonly type: 'PASS_CARDS'; readonly cardIds: readonly string[] }
  | { readonly type: 'DISCARD_CARDS'; readonly cardIds: readonly string[] }
  | { readonly type: 'SURRENDER' };
