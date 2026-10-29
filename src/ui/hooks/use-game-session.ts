import { useState, useCallback, useRef, useEffect } from 'react';
import type { SanitizedState, GameEvent } from '../../core/types/engine.js';
import type { DaifugoConfig } from '../../core/rules/daifugo/config.js';
import { DEFAULT_DAIFUGO_CONFIG } from '../../core/rules/daifugo/config.js';
import { decodeConfigFromUrlParam } from '../../core/rules/daifugo/url.js';
import { ShinkeiSuijakuPlugin, DEFAULT_SHINKEI_SUIJAKU_CONFIG } from '../../core/rules/shinkei-suijaku/index.js';
import { DaifugoPlugin } from '../../core/rules/daifugo/index.js';
import { PeerJsTransport } from '../../network/peerjs-transport.js';
import { HostSession } from '../../network/host-session.js';
import { ClientSession } from '../../network/client-session.js';
import type { AnyGameAction, AnyGameRuleState } from '../../network/types.js';
import { useTranslation } from '../../i18n/context.js';

function getOrCreatePlayerId(prefix: string): string {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      const key = 'trumps_player_id';
      const stored = window.sessionStorage.getItem(key);
      if (stored) return stored;
      const newId = `${prefix}_${Date.now()}`;
      window.sessionStorage.setItem(key, newId);
      return newId;
    }
  } catch {
    // fallback
  }
  return `${prefix}_${Date.now()}`;
}

export function useGameSession() {
  const { t } = useTranslation();
  const [isHost, setIsHost] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isHostDisconnected, setIsHostDisconnected] = useState(false);
  const [peerId, setPeerId] = useState<string>('');
  const [myPlayerId, setMyPlayerId] = useState<string>('');
  const [players, setPlayers] = useState<{ id: string; name: string }[]>([]);
  const [disconnectedPlayerIds, setDisconnectedPlayerIds] = useState<string[]>([]);
  const [roomConfig, setRoomConfig] = useState<any>(() => {
    if (typeof window !== 'undefined') {
      try {
        const params = new URLSearchParams(window.location.search);
        const rulesParam = params.get('rules');
        if (rulesParam) {
          const decoded = decodeConfigFromUrlParam(rulesParam);
          if (decoded) return decoded;
        }
      } catch {
        // fallback
      }
    }
    return DEFAULT_DAIFUGO_CONFIG;
  });
  const [state, setState] = useState<SanitizedState<AnyGameRuleState> | null>(null);
  const [recentEvents, setRecentEvents] = useState<readonly GameEvent[]>([]);
  const [error, setError] = useState<string | null>(null);

  const hostSessionRef = useRef<HostSession | null>(null);
  const clientSessionRef = useRef<ClientSession | null>(null);

  const startHost = useCallback(
    async (
      playerName: string,
      initialConfig: any = DEFAULT_DAIFUGO_CONFIG,
      gameId: string = 'daifugo'
    ) => {
      if (isConnecting || hostSessionRef.current) return;
      setIsConnecting(true);
      setError(null);
      try {
        setIsHost(true);
        const transport = await PeerJsTransport.create();
        setPeerId(transport.peerId);

        const hostPlayer = { id: getOrCreatePlayerId('p_host'), name: playerName };
        setMyPlayerId(hostPlayer.id);

        const plugin =
          gameId === 'shinkei-suijaku'
            ? new ShinkeiSuijakuPlugin()
            : new DaifugoPlugin();

        const config =
          gameId === 'shinkei-suijaku'
            ? { ...DEFAULT_SHINKEI_SUIJAKU_CONFIG, ...(initialConfig ?? {}) }
            : { ...DEFAULT_DAIFUGO_CONFIG, ...(initialConfig ?? {}) };

        const session = new HostSession(transport, hostPlayer, { config, plugin });
        hostSessionRef.current = session;
        setPlayers([...session.getPlayers()]);
        setRoomConfig(session.getConfig());

        session.onStateChange((newState, events) => {
          setState(newState);
          setRecentEvents(events);
          if (newState.ruleState?.config) {
            setRoomConfig(newState.ruleState.config);
          }
        });

        session.onPlayersChange((updatedPlayers) => {
          setPlayers([...updatedPlayers]);
        });

        session.onPlayerDisconnected((playerId, playerName) => {
          setDisconnectedPlayerIds((prev) => [...new Set([...prev, playerId])]);
          setRecentEvents([{ type: 'PLAYER_DISCONNECTED', payload: { playerId, playerName } }]);
        });
      } catch (err: any) {
        setError(err.message ?? 'Failed to initialize host');
        setIsHost(false);
      } finally {
        setIsConnecting(false);
      }
    },
    [isConnecting]
  );

  const joinAsClient = useCallback(async (hostPeerId: string, playerName: string) => {
    if (isConnecting || clientSessionRef.current) return;
    setIsConnecting(true);
    setError(null);
    try {
      setIsHost(false);
      const transport = await PeerJsTransport.create();
      setPeerId(transport.peerId);

      const clientPlayer = { id: getOrCreatePlayerId('p_client'), name: playerName };
      setMyPlayerId(clientPlayer.id);

      const session = new ClientSession(transport, clientPlayer);
      clientSessionRef.current = session;

      session.onRoomJoined((roomPlayers) => {
        setPlayers([...roomPlayers]);
        const conf = session.getConfig();
        if (conf) {
          setRoomConfig(conf);
        }
      });

      session.onPlayerJoined((player) => {
        setPlayers((prev) => (prev.some((p) => p.id === player.id) ? prev : [...prev, player]));
        setRecentEvents([{ type: 'PLAYER_JOINED', payload: { player } }]);
      });

      session.onConfigUpdated((conf) => {
        setRoomConfig(conf);
      });

      session.onStateChange((newState, events) => {
        setState(newState);
        setRecentEvents(events);
        if (newState.ruleState?.config) {
          setRoomConfig(newState.ruleState.config);
        }
      });

      session.onActionRejected((reason) => {
        setError(`Action rejected: ${reason}`);
      });

      session.onPlayerDisconnected((playerId) => {
        setDisconnectedPlayerIds((prev) => [...new Set([...prev, playerId])]);
        const targetPlayer = session.getPlayers().find((p) => p.id === playerId);
        setRecentEvents([
          {
            type: 'PLAYER_DISCONNECTED',
            payload: { playerId, playerName: targetPlayer?.name },
          },
        ]);
      });

      session.onHostDisconnected(() => {
        setIsHostDisconnected(true);
        setError(t.events.playerDisconnected);
      });

      await session.joinRoom(hostPeerId);
    } catch (err: any) {
      setError(err.message ?? 'Failed to connect to host');
      clientSessionRef.current = null;
    } finally {
      setIsConnecting(false);
    }
  }, [isConnecting]);

  const updateConfig = useCallback((newConfig: DaifugoConfig) => {
    setRoomConfig(newConfig);
    if (hostSessionRef.current) {
      hostSessionRef.current.updateConfig(newConfig);
    }
  }, []);

  const startGame = useCallback((latestConfig?: DaifugoConfig) => {
    if (hostSessionRef.current) {
      try {
        const configToUse = latestConfig ?? roomConfig;
        setRoomConfig(configToUse);
        hostSessionRef.current.startGame(configToUse);
      } catch (err: any) {
        setError(err.message);
      }
    }
  }, [roomConfig]);

  const startNextRound = useCallback(() => {
    if (hostSessionRef.current) {
      try {
        hostSessionRef.current.startNextRound();
      } catch (err: any) {
        setError(err.message);
      }
    }
  }, []);

  const dispatchPlay = useCallback((cardIds: string[]) => {
    if (hostSessionRef.current) {
      hostSessionRef.current.dispatchHostAction({ type: 'PLAY', cardIds });
    } else if (clientSessionRef.current) {
      clientSessionRef.current.dispatch({ type: 'PLAY', cardIds });
    }
  }, []);

  const dispatchPass = useCallback(() => {
    if (hostSessionRef.current) {
      hostSessionRef.current.dispatchHostAction({ type: 'PASS' });
    } else if (clientSessionRef.current) {
      clientSessionRef.current.dispatch({ type: 'PASS' });
    }
  }, []);

  const dispatchPassCards = useCallback((cardIds: string[]) => {
    if (hostSessionRef.current) {
      hostSessionRef.current.dispatchHostAction({ type: 'PASS_CARDS', cardIds });
    } else if (clientSessionRef.current) {
      clientSessionRef.current.dispatch({ type: 'PASS_CARDS', cardIds });
    }
  }, []);

  const dispatchDiscardCards = useCallback((cardIds: string[]) => {
    if (hostSessionRef.current) {
      hostSessionRef.current.dispatchHostAction({ type: 'DISCARD_CARDS', cardIds });
    } else if (clientSessionRef.current) {
      clientSessionRef.current.dispatch({ type: 'DISCARD_CARDS', cardIds });
    }
  }, []);

  const dispatchFlip = useCallback((cardIndex: number) => {
    if (hostSessionRef.current) {
      hostSessionRef.current.dispatchHostAction({ type: 'FLIP', cardIndex });
    } else if (clientSessionRef.current) {
      clientSessionRef.current.dispatch({ type: 'FLIP', cardIndex });
    }
  }, []);

  const dispatchNextTurn = useCallback(() => {
    if (hostSessionRef.current) {
      hostSessionRef.current.dispatchHostAction({ type: 'NEXT_TURN' });
    } else if (clientSessionRef.current) {
      clientSessionRef.current.dispatch({ type: 'NEXT_TURN' });
    }
  }, []);

  const leaveRoom = useCallback(() => {
    if (hostSessionRef.current) {
      hostSessionRef.current.leaveRoom();
      hostSessionRef.current = null;
    }
    if (clientSessionRef.current) {
      clientSessionRef.current.leaveRoom();
      clientSessionRef.current = null;
    }
    setIsHost(false);
    setIsConnecting(false);
    setIsHostDisconnected(false);
    setPeerId('');
    setMyPlayerId('');
    setPlayers([]);
    setDisconnectedPlayerIds([]);
    setState(null);
    setRecentEvents([]);
    setError(null);
  }, []);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (hostSessionRef.current) {
        hostSessionRef.current.leaveRoom();
      }
      if (clientSessionRef.current) {
        clientSessionRef.current.leaveRoom();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handleBeforeUnload);
    };
  }, []);

  return {
    isHost,
    isConnecting,
    isHostDisconnected,
    peerId,
    myPlayerId,
    players,
    disconnectedPlayerIds,
    roomConfig,
    state,
    recentEvents,
    error,
    startHost,
    joinAsClient,
    updateConfig,
    startGame,
    startNextRound,
    leaveRoom,
    dispatchPlay,
    dispatchPass,
    dispatchPassCards,
    dispatchDiscardCards,
    dispatchFlip,
    dispatchNextTurn,
  };
}
