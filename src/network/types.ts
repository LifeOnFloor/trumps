import type { SanitizedState, GameEvent } from '../core/types/engine.js';
import type { DaifugoRuleState, DaifugoAction } from '../core/rules/daifugo/types.js';
import type { DaifugoConfig } from '../core/rules/daifugo/config.js';
import type {
  ShinkeiSuijakuRuleState,
  ShinkeiSuijakuAction,
  ShinkeiSuijakuConfig,
} from '../core/rules/shinkei-suijaku/types.js';

export type AnyGameRuleState = DaifugoRuleState | ShinkeiSuijakuRuleState;
export type AnyGameAction = DaifugoAction | ShinkeiSuijakuAction;
export type AnyGameConfig = DaifugoConfig | ShinkeiSuijakuConfig;

// クライアント -> ホスト
export type ClientMessage =
  | { type: 'JOIN_ROOM'; playerId: string; playerName: string }
  | { type: 'DISPATCH_ACTION'; action: AnyGameAction }
  | { type: 'LEAVE_ROOM' };

// ホスト -> クライアント
export type HostMessage =
  | {
      type: 'ROOM_JOINED';
      assignedPlayerId: string;
      players: { id: string; name: string }[];
      config: AnyGameConfig;
      gameId?: string;
    }
  | { type: 'PLAYER_JOINED'; player: { id: string; name: string } }
  | { type: 'CONFIG_UPDATED'; config: AnyGameConfig }
  | { type: 'GAME_STARTED'; state: SanitizedState<AnyGameRuleState> }
  | { type: 'SYNC_STATE'; state: SanitizedState<AnyGameRuleState>; events: GameEvent[] }
  | { type: 'ACTION_REJECTED'; reason: string }
  | { type: 'PLAYER_DISCONNECTED'; playerId: string }
  | { type: 'ERROR'; message: string };

export interface NetworkPlayer {
  readonly id: string;
  readonly name: string;
  readonly peerId: string;
  readonly isDisconnected?: boolean;
}
