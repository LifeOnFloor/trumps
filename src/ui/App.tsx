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
    state,
    recentEvents,
    error,
    startHost,
    joinAsClient,
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
        error={error}
        onStartHost={startHost}
        onJoinClient={joinAsClient}
        onStartGame={startGame}
      />
    );
  }

  return (
    <TableScreen
      state={state}
      myPlayerId={myPlayerId}
      recentEvents={recentEvents}
      onPlay={dispatchPlay}
      onPass={dispatchPass}
      onRestart={() => window.location.reload()}
    />
  );
};
