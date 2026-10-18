import type { SanitizedState, GameEvent } from '../core/types/engine.js';
import type { DaifugoRuleState, DaifugoAction } from '../core/rules/daifugo/types.js';
import type { DaifugoConfig } from '../core/rules/daifugo/config.js';

// クライアント -> ホスト
export type ClientMessage =
  | { type: 'JOIN_ROOM'; playerId: string; playerName: string }
  | { type: 'DISPATCH_ACTION'; action: DaifugoAction }
  | { type: 'LEAVE_ROOM' };

// ホスト -> クライアント
export type HostMessage =
  | { type: 'ROOM_JOINED'; assignedPlayerId: string; players: { id: string; name: string }[] }
  | { type: 'PLAYER_JOINED'; player: { id: string; name: string } }
  | { type: 'CONFIG_UPDATED'; config: DaifugoConfig }
  | { type: 'GAME_STARTED'; state: SanitizedState<DaifugoRuleState> }
  | { type: 'SYNC_STATE'; state: SanitizedState<DaifugoRuleState>; events: GameEvent[] }
  | { type: 'ACTION_REJECTED'; reason: string }
  | { type: 'PLAYER_DISCONNECTED'; playerId: string }
  | { type: 'ERROR'; message: string };

export interface NetworkPlayer {
  readonly id: string;
  readonly name: string;
  readonly peerId: string;
  readonly isDisconnected?: boolean;
}
