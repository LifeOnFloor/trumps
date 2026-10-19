import type { Card } from './card.js';

export interface PlayerState {
  readonly id: string;
  readonly name: string;
  readonly hand: readonly Card[];
  readonly isFinished: boolean;
  readonly rankPosition?: number;
  readonly chips?: number;
}

export interface SanitizedPlayerState {
  readonly id: string;
  readonly name: string;
  readonly handCount: number;
  readonly hand?: readonly Card[];
  readonly isFinished: boolean;
  readonly rankPosition?: number;
  readonly chips?: number;
}

export interface BaseGameContext {
  readonly gameId: string;
  readonly players: readonly PlayerState[];
  readonly currentTurnPlayerId: string | null;
  readonly isGameOver: boolean;
  readonly winnerPlayerIds: readonly string[];
}

export interface SanitizedBaseGameContext {
  readonly gameId: string;
  readonly players: readonly SanitizedPlayerState[];
  readonly currentTurnPlayerId: string | null;
  readonly isGameOver: boolean;
  readonly winnerPlayerIds: readonly string[];
}

export interface GameEvent {
  readonly type: string;
  readonly payload?: unknown;
}

export interface SanitizedState<TRuleState> {
  readonly context: SanitizedBaseGameContext;
  readonly ruleState: TRuleState;
}

export interface CardGamePlugin<TRuleConfig, TRuleState, TAction> {
  readonly id: string;
  readonly name: string;
  readonly minPlayers: number;
  readonly maxPlayers: number;
  readonly hasChips: boolean;
  readonly defaultConfig: TRuleConfig;

  init(players: readonly { id: string; name: string; chips?: number }[], config?: Partial<TRuleConfig>): {
    context: BaseGameContext;
    ruleState: TRuleState;
  };

  canExecute(
    context: Readonly<BaseGameContext>,
    ruleState: Readonly<TRuleState>,
    playerId: string,
    action: TAction
  ): boolean;

  execute(
    context: Readonly<BaseGameContext>,
    ruleState: Readonly<TRuleState>,
    playerId: string,
    action: TAction
  ): {
    nextContext: BaseGameContext;
    nextRuleState: TRuleState;
    events: GameEvent[];
  };

  sanitizeForPlayer(
    context: Readonly<BaseGameContext>,
    ruleState: Readonly<TRuleState>,
    viewerPlayerId: string
  ): SanitizedState<TRuleState>;
}
