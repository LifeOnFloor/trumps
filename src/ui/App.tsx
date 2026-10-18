import React from 'react';
import { useGameSession } from './hooks/use-game-session.js';
import { LobbyScreen } from './screens/LobbyScreen.js';
import { TableScreen } from './screens/TableScreen.js';

export const App: React.FC = () => {
  const {
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
  } = useGameSession();

  if (!state) {
    return (
      <LobbyScreen
        isHost={isHost}
        peerId={peerId}
        players={players}
        roomConfig={roomConfig}
        error={error}
        onStartHost={startHost}
        onJoinClient={joinAsClient}
        onUpdateConfig={updateConfig}
        onStartGame={startGame}
      />
    );
  }

  return (
    <TableScreen
      state={state}
      myPlayerId={myPlayerId}
      peerId={peerId}
      disconnectedPlayerIds={disconnectedPlayerIds}
      roomConfig={roomConfig}
      recentEvents={recentEvents}
      onPlay={dispatchPlay}
      onPass={dispatchPass}
      onRestart={() => window.location.reload()}
    />
  );
};
