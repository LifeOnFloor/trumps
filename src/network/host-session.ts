import type { CardGamePlugin, GameEvent, SanitizedState } from '../core/types/engine.js';
import { GameRunner } from '../core/engine/game-runner.js';
import { DaifugoPlugin } from '../core/rules/daifugo/index.js';
import type { DaifugoConfig } from '../core/rules/daifugo/config.js';
import { DEFAULT_DAIFUGO_CONFIG } from '../core/rules/daifugo/config.js';
import type { DaifugoAction, DaifugoRuleState } from '../core/rules/daifugo/types.js';
import type { ITransport } from './transport.js';
import type { ClientMessage, HostMessage, NetworkPlayer } from './types.js';

export interface HostSessionOptions {
  config?: Partial<DaifugoConfig>;
  plugin?: CardGamePlugin<DaifugoConfig, DaifugoRuleState, DaifugoAction>;
}

export function sanitizeEventsForPlayer(
  events: readonly GameEvent[],
  viewerPlayerId: string
): GameEvent[] {
  return events.map((event) => {
    if (event.type === 'CARDS_PASSED') {
      const payload = event.payload as { from: string; to: string; cards?: readonly unknown[] };
      if (payload && payload.from !== viewerPlayerId && payload.to !== viewerPlayerId) {
        return {
          type: 'CARDS_PASSED',
          payload: {
            from: payload.from,
            to: payload.to,
            count: payload.cards?.length ?? 0,
          },
        };
      }
    }
    return event;
  });
}

export class HostSession {
  private readonly transport: ITransport;
  private readonly hostPlayer: { id: string; name: string };
  private readonly plugin: CardGamePlugin<DaifugoConfig, DaifugoRuleState, DaifugoAction>;

  private currentConfig: DaifugoConfig;
  private players: NetworkPlayer[] = [];
  private gameRunner: GameRunner<DaifugoConfig, DaifugoRuleState, DaifugoAction> | null = null;
  private stateChangeListeners: ((state: SanitizedState<DaifugoRuleState>, events: readonly GameEvent[]) => void)[] = [];
  private playersChangeListeners: ((players: readonly NetworkPlayer[]) => void)[] = [];

  constructor(
    transport: ITransport,
    hostPlayer: { id: string; name: string },
    options: HostSessionOptions = {}
  ) {
    this.transport = transport;
    this.hostPlayer = hostPlayer;
    this.plugin = options.plugin ?? new DaifugoPlugin();
    this.currentConfig = {
      ...DEFAULT_DAIFUGO_CONFIG,
      ...(options.config ?? {}),
      prohibitedEndings: {
        ...DEFAULT_DAIFUGO_CONFIG.prohibitedEndings,
        ...(options.config?.prohibitedEndings ?? {}),
      },
    };

    // Register host as first player
    this.players.push({
      id: hostPlayer.id,
      name: hostPlayer.name,
      peerId: transport.peerId,
    });

    this.setupTransportHandlers();
  }

  getConfig(): DaifugoConfig {
    return this.currentConfig;
  }

  updateConfig(configPartial: Partial<DaifugoConfig>): void {
    this.currentConfig = {
      ...this.currentConfig,
      ...configPartial,
      prohibitedEndings: {
        ...this.currentConfig.prohibitedEndings,
        ...(configPartial.prohibitedEndings ?? {}),
      },
    };

    // Broadcast updated config to all connected clients
    for (const p of this.players) {
      if (p.peerId !== this.transport.peerId) {
        this.transport.send(p.peerId, {
          type: 'CONFIG_UPDATED',
          config: this.currentConfig,
        } as HostMessage);
      }
    }
  }

  getPlayers(): readonly NetworkPlayer[] {
    return this.players;
  }

  getGameRunner(): GameRunner<DaifugoConfig, DaifugoRuleState, DaifugoAction> | null {
    return this.gameRunner;
  }

  getHostState(): SanitizedState<DaifugoRuleState> | null {
    if (!this.gameRunner) return null;
    return this.gameRunner.getSanitizedStateForPlayer(this.hostPlayer.id);
  }

  onStateChange(
    listener: (state: SanitizedState<DaifugoRuleState>, events: readonly GameEvent[]) => void
  ): () => void {
    this.stateChangeListeners.push(listener);
    return () => {
      this.stateChangeListeners = this.stateChangeListeners.filter((l) => l !== listener);
    };
  }

  onPlayersChange(listener: (players: readonly NetworkPlayer[]) => void): () => void {
    this.playersChangeListeners.push(listener);
    return () => {
      this.playersChangeListeners = this.playersChangeListeners.filter((l) => l !== listener);
    };
  }

  startGame(latestConfig?: Partial<DaifugoConfig>): void {
    if (this.gameRunner) {
      throw new Error('Game already started');
    }
    if (this.players.length < this.plugin.minPlayers || this.players.length > this.plugin.maxPlayers) {
      throw new Error(`Player count must be between ${this.plugin.minPlayers} and ${this.plugin.maxPlayers}`);
    }

    if (latestConfig) {
      this.updateConfig(latestConfig);
    }

    const runnerPlayers = this.players.map((p) => ({ id: p.id, name: p.name }));
    this.gameRunner = new GameRunner(this.plugin, runnerPlayers, this.currentConfig);

    // Send GAME_STARTED with sanitized state to each client
    for (const player of this.players) {
      const sanitized = this.gameRunner.getSanitizedStateForPlayer(player.id);
      if (player.peerId === this.transport.peerId) {
        // Host local
        this.notifyStateChange(sanitized, [{ type: 'GAME_STARTED' }]);
      } else {
        const msg: HostMessage = {
          type: 'GAME_STARTED',
          state: sanitized,
        };
        this.transport.send(player.peerId, msg);
      }
    }
  }

  dispatchHostAction(action: DaifugoAction): void {
    this.handleDispatchAction(this.transport.peerId, this.hostPlayer.id, action);
  }

  private setupTransportHandlers(): void {
    this.transport.onReceive((fromPeerId, rawData) => {
      const msg = rawData as ClientMessage;
      if (!msg || typeof msg.type !== 'string') return;

      switch (msg.type) {
        case 'JOIN_ROOM':
          this.handleJoinRoom(fromPeerId, msg.playerId, msg.playerName);
          break;
        case 'DISPATCH_ACTION': {
          const player = this.players.find((p) => p.peerId === fromPeerId);
          if (player) {
            this.handleDispatchAction(fromPeerId, player.id, msg.action);
          }
          break;
        }
        case 'LEAVE_ROOM':
          this.handlePlayerDisconnect(fromPeerId);
          break;
      }
    });

    this.transport.onDisconnect((fromPeerId) => {
      this.handlePlayerDisconnect(fromPeerId);
    });
  }

  private handleJoinRoom(peerId: string, playerId: string, playerName: string): void {
    if (this.gameRunner) {
      const errMsg: HostMessage = { type: 'ERROR', message: 'Game already in progress' };
      this.transport.send(peerId, errMsg);
      return;
    }

    if (this.players.length >= this.plugin.maxPlayers) {
      const errMsg: HostMessage = { type: 'ERROR', message: 'Room is full' };
      this.transport.send(peerId, errMsg);
      return;
    }

    // Check duplicate
    const existing = this.players.find((p) => p.id === playerId || p.peerId === peerId);
    if (!existing) {
      this.players.push({ id: playerId, name: playerName, peerId });
    }

    this.notifyPlayersChange();

    const publicPlayers = this.players.map((p) => ({ id: p.id, name: p.name }));

    // Notify all participants
    for (const p of this.players) {
      if (p.peerId !== this.transport.peerId) {
        // Send full player list and current config
        const joinMsg: HostMessage = {
          type: 'ROOM_JOINED',
          assignedPlayerId: p.id,
          players: publicPlayers,
        };
        this.transport.send(p.peerId, joinMsg);

        // Also notify about the new player specifically
        if (p.id !== playerId) {
          const newPlayerMsg: HostMessage = {
            type: 'PLAYER_JOINED',
            player: { id: playerId, name: playerName },
          };
          this.transport.send(p.peerId, newPlayerMsg);
        }

        // Send current room config
        this.transport.send(p.peerId, {
          type: 'CONFIG_UPDATED',
          config: this.currentConfig,
        } as HostMessage);
      }
    }
  }

  private handleDispatchAction(fromPeerId: string, playerId: string, action: DaifugoAction): void {
    if (!this.gameRunner) {
      this.sendToPeer(fromPeerId, { type: 'ACTION_REJECTED', reason: 'Game has not started' });
      return;
    }

    if (!this.gameRunner.canExecute(playerId, action)) {
      this.sendToPeer(fromPeerId, { type: 'ACTION_REJECTED', reason: 'Invalid action or not your turn' });
      return;
    }

    const events = this.gameRunner.execute(playerId, action);

    // Broadcast sanitized state and sanitized events to all players
    for (const player of this.players) {
      const sanitized = this.gameRunner.getSanitizedStateForPlayer(player.id);
      const sanitizedEvents = sanitizeEventsForPlayer(events, player.id);
      if (player.peerId === this.transport.peerId) {
        this.notifyStateChange(sanitized, sanitizedEvents);
      } else {
        const syncMsg: HostMessage = {
          type: 'SYNC_STATE',
          state: sanitized,
          events: sanitizedEvents,
        };
        this.transport.send(player.peerId, syncMsg);
      }
    }
  }

  private handlePlayerDisconnect(peerId: string): void {
    const playerIndex = this.players.findIndex((p) => p.peerId === peerId);
    if (playerIndex === -1) return;

    const [disconnected] = this.players.splice(playerIndex, 1);
    if (!disconnected) return;

    this.notifyPlayersChange();

    const msg: HostMessage = {
      type: 'PLAYER_DISCONNECTED',
      playerId: disconnected.id,
    };

    // Broadcast to remaining clients
    for (const p of this.players) {
      if (p.peerId !== this.transport.peerId) {
        this.transport.send(p.peerId, msg);
      }
    }

    // If game in progress, drop the disconnected player via SURRENDER
    if (this.gameRunner) {
      const currentContext = this.gameRunner.getContext();
      if (!currentContext.isGameOver) {
        try {
          if (this.gameRunner.canExecute(disconnected.id, { type: 'SURRENDER' })) {
            const events = this.gameRunner.execute(disconnected.id, { type: 'SURRENDER' });
            for (const player of this.players) {
              const sanitized = this.gameRunner.getSanitizedStateForPlayer(player.id);
              const sanitizedEvents = sanitizeEventsForPlayer(events, player.id);
              if (player.peerId === this.transport.peerId) {
                this.notifyStateChange(sanitized, [
                  ...sanitizedEvents,
                  { type: 'PLAYER_DISCONNECTED', payload: { playerId: disconnected.id } },
                ]);
              } else {
                this.transport.send(player.peerId, {
                  type: 'SYNC_STATE',
                  state: sanitized,
                  events: [
                    ...sanitizedEvents,
                    { type: 'PLAYER_DISCONNECTED', payload: { playerId: disconnected.id } },
                  ],
                });
              }
            }
          }
        } catch {
          // ignore
        }
      }
    }
  }

  private sendToPeer(peerId: string, message: HostMessage): void {
    if (peerId === this.transport.peerId) return;
    this.transport.send(peerId, message);
  }

  private notifyStateChange(state: SanitizedState<DaifugoRuleState>, events: readonly GameEvent[]): void {
    for (const listener of this.stateChangeListeners) {
      listener(state, events);
    }
  }

  private notifyPlayersChange(): void {
    for (const listener of this.playersChangeListeners) {
      listener([...this.players]);
    }
  }
}
