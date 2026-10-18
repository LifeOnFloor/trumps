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
  readonly passedPlayerIds: readonly string[];
}

export interface DaifugoRuleState {
  readonly config: DaifugoConfig;
  readonly isRevolution: boolean;
  readonly table: DaifugoTableState;
  readonly rankings: readonly string[];
  readonly foulPlayerIds: readonly string[];
}

export type DaifugoAction =
  | { readonly type: 'PLAY'; readonly cardIds: readonly string[] }
  | { readonly type: 'PASS' };
