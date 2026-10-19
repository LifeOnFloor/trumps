import type { GameEvent, SanitizedState } from '../core/types/engine.js';
import type { DaifugoAction, DaifugoRuleState } from '../core/rules/daifugo/types.js';
import type { DaifugoConfig } from '../core/rules/daifugo/config.js';
import type { ITransport } from './transport.js';
import type { ClientMessage, HostMessage } from './types.js';

export class ClientSession {
  private readonly transport: ITransport;
  private readonly player: { id: string; name: string };
  private hostPeerId: string | null = null;
  private players: { id: string; name: string }[] = [];
  private currentState: SanitizedState<DaifugoRuleState> | null = null;
  private currentConfig: DaifugoConfig | null = null;

  private stateChangeListeners: ((state: SanitizedState<DaifugoRuleState>, events: readonly GameEvent[]) => void)[] = [];
  private actionRejectedListeners: ((reason: string) => void)[] = [];
  private playerDisconnectedListeners: ((playerId: string) => void)[] = [];
  private playerJoinedListeners: ((player: { id: string; name: string }) => void)[] = [];
  private roomJoinedListeners: ((players: readonly { id: string; name: string }[]) => void)[] = [];
  private configUpdatedListeners: ((config: DaifugoConfig) => void)[] = [];
  private hostDisconnectedListeners: (() => void)[] = [];

  constructor(transport: ITransport, player: { id: string; name: string }) {
    this.transport = transport;
    this.player = player;
    this.setupTransportHandlers();
  }

  getPlayer(): { id: string; name: string } {
    return this.player;
  }

  getState(): SanitizedState<DaifugoRuleState> | null {
    return this.currentState;
  }

  getConfig(): DaifugoConfig | null {
    return this.currentConfig;
  }

  getPlayers(): readonly { id: string; name: string }[] {
    return this.players;
  }

  async joinRoom(hostPeerId: string): Promise<void> {
    this.hostPeerId = hostPeerId;
    await this.transport.connect(hostPeerId);
    const joinMsg: ClientMessage = {
      type: 'JOIN_ROOM',
      playerId: this.player.id,
      playerName: this.player.name,
    };
    this.transport.send(hostPeerId, joinMsg);
  }

  dispatch(action: DaifugoAction): void {
    if (!this.hostPeerId) {
      throw new Error('Not connected to host');
    }
    const msg: ClientMessage = {
      type: 'DISPATCH_ACTION',
      action,
    };
    this.transport.send(this.hostPeerId, msg);
  }

  leaveRoom(): void {
    if (this.hostPeerId) {
      const msg: ClientMessage = { type: 'LEAVE_ROOM' };
      this.transport.send(this.hostPeerId, msg);
      this.transport.close();
      this.hostPeerId = null;
    }
  }

  onStateChange(
    listener: (state: SanitizedState<DaifugoRuleState>, events: readonly GameEvent[]) => void
  ): () => void {
    this.stateChangeListeners.push(listener);
    return () => {
      this.stateChangeListeners = this.stateChangeListeners.filter((l) => l !== listener);
    };
  }

  onActionRejected(listener: (reason: string) => void): () => void {
    this.actionRejectedListeners.push(listener);
    return () => {
      this.actionRejectedListeners = this.actionRejectedListeners.filter((l) => l !== listener);
    };
  }

  onPlayerDisconnected(listener: (playerId: string) => void): () => void {
    this.playerDisconnectedListeners.push(listener);
    return () => {
      this.playerDisconnectedListeners = this.playerDisconnectedListeners.filter((l) => l !== listener);
    };
  }

  onPlayerJoined(listener: (player: { id: string; name: string }) => void): () => void {
    this.playerJoinedListeners.push(listener);
    return () => {
      this.playerJoinedListeners = this.playerJoinedListeners.filter((l) => l !== listener);
    };
  }

  onRoomJoined(listener: (players: readonly { id: string; name: string }[]) => void): () => void {
    this.roomJoinedListeners.push(listener);
    return () => {
      this.roomJoinedListeners = this.roomJoinedListeners.filter((l) => l !== listener);
    };
  }

  onConfigUpdated(listener: (config: DaifugoConfig) => void): () => void {
    this.configUpdatedListeners.push(listener);
    return () => {
      this.configUpdatedListeners = this.configUpdatedListeners.filter((l) => l !== listener);
    };
  }

  onHostDisconnected(listener: () => void): () => void {
    this.hostDisconnectedListeners.push(listener);
    return () => {
      this.hostDisconnectedListeners = this.hostDisconnectedListeners.filter((l) => l !== listener);
    };
  }

  private setupTransportHandlers(): void {
    this.transport.onReceive((_, rawData) => {
      const msg = rawData as HostMessage;
      if (!msg || typeof msg.type !== 'string') return;

      switch (msg.type) {
        case 'ROOM_JOINED':
          this.players = msg.players;
          this.roomJoinedListeners.forEach((l) => l(this.players));
          break;

        case 'PLAYER_JOINED':
          if (!this.players.some((p) => p.id === msg.player.id)) {
            this.players = [...this.players, msg.player];
          }
          this.playerJoinedListeners.forEach((l) => l(msg.player));
          break;

        case 'CONFIG_UPDATED':
          this.currentConfig = msg.config;
          this.configUpdatedListeners.forEach((l) => l(msg.config));
          break;

        case 'GAME_STARTED':
          this.currentState = msg.state;
          this.stateChangeListeners.forEach((l) => l(msg.state, [{ type: 'GAME_STARTED' }]));
          break;

        case 'SYNC_STATE':
          this.currentState = msg.state;
          this.stateChangeListeners.forEach((l) => l(msg.state, msg.events));
          break;

        case 'ACTION_REJECTED':
          this.actionRejectedListeners.forEach((l) => l(msg.reason));
          break;

        case 'PLAYER_DISCONNECTED':
          this.players = this.players.filter((p) => p.id !== msg.playerId);
          this.playerDisconnectedListeners.forEach((l) => l(msg.playerId));
          break;
      }
    });

    this.transport.onDisconnect((fromPeerId) => {
      if (this.hostPeerId && fromPeerId === this.hostPeerId) {
        this.hostPeerId = null;
        this.hostDisconnectedListeners.forEach((l) => l());
      }
    });
  }
}
