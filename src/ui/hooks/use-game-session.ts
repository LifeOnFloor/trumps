import { useState, useCallback, useRef } from 'react';
import type { SanitizedState, GameEvent } from '../../core/types/engine.js';
import type { DaifugoConfig } from '../../core/rules/daifugo/config.js';
import { DEFAULT_DAIFUGO_CONFIG } from '../../core/rules/daifugo/config.js';
import type { DaifugoRuleState } from '../../core/rules/daifugo/types.js';
import { PeerJsTransport } from '../../network/peerjs-transport.js';
import { HostSession } from '../../network/host-session.js';
import { ClientSession } from '../../network/client-session.js';

export function useGameSession() {
  const [isHost, setIsHost] = useState(false);
  const [peerId, setPeerId] = useState<string>('');
  const [myPlayerId, setMyPlayerId] = useState<string>('');
  const [players, setPlayers] = useState<{ id: string; name: string }[]>([]);
  const [disconnectedPlayerIds, setDisconnectedPlayerIds] = useState<string[]>([]);
  const [roomConfig, setRoomConfig] = useState<DaifugoConfig>(DEFAULT_DAIFUGO_CONFIG);
  const [state, setState] = useState<SanitizedState<DaifugoRuleState> | null>(null);
  const [recentEvents, setRecentEvents] = useState<readonly GameEvent[]>([]);
  const [error, setError] = useState<string | null>(null);

  const hostSessionRef = useRef<HostSession | null>(null);
  const clientSessionRef = useRef<ClientSession | null>(null);

  const startHost = useCallback(
    async (playerName: string, initialConfig: Partial<DaifugoConfig> = DEFAULT_DAIFUGO_CONFIG) => {
      try {
        setError(null);
        setIsHost(true);
        const transport = await PeerJsTransport.create();
        setPeerId(transport.peerId);

        const hostPlayer = { id: `p_${Date.now()}`, name: playerName };
        setMyPlayerId(hostPlayer.id);

        const session = new HostSession(transport, hostPlayer, { config: initialConfig });
        hostSessionRef.current = session;
        setPlayers([...session.getPlayers()]);
        setRoomConfig(session.getConfig());

        session.onStateChange((newState, events) => {
          setState(newState);
          setRecentEvents(events);
        });

        session.onPlayersChange((updatedPlayers) => {
          setPlayers([...updatedPlayers]);
        });
      } catch (err: any) {
        setError(err.message ?? 'Failed to initialize host');
      }
    },
    []
  );

  const joinAsClient = useCallback(async (hostPeerId: string, playerName: string) => {
    try {
      setError(null);
      setIsHost(false);
      const transport = await PeerJsTransport.create();
      setPeerId(transport.peerId);

      const clientPlayer = { id: `p_${Date.now()}`, name: playerName };
      setMyPlayerId(clientPlayer.id);

      const session = new ClientSession(transport, clientPlayer);
      clientSessionRef.current = session;

      session.onRoomJoined((roomPlayers) => {
        setPlayers([...roomPlayers]);
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
      });

      session.onActionRejected((reason) => {
        setError(`Action rejected: ${reason}`);
      });

      session.onPlayerDisconnected((playerId) => {
        setDisconnectedPlayerIds((prev) => [...new Set([...prev, playerId])]);
        setRecentEvents([{ type: 'PLAYER_DISCONNECTED', payload: { playerId } }]);
      });

      await session.joinRoom(hostPeerId);
    } catch (err: any) {
      setError(err.message ?? 'Failed to connect to host');
    }
  }, []);

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
        hostSessionRef.current.startGame(configToUse);
      } catch (err: any) {
        setError(err.message);
      }
    }
  }, [roomConfig]);

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

  return {
    isHost,
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
    dispatchPlay,
    dispatchPass,
  };
}
