import React from 'react';
import { I18nProvider } from '../i18n/context.js';
import { useGameSession } from './hooks/use-game-session.js';
import { LobbyScreen } from './screens/LobbyScreen.js';
import { TableScreen } from './screens/TableScreen.js';

const MainAppContent: React.FC = () => {
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

export const App: React.FC = () => {
  return (
    <I18nProvider>
      <MainAppContent />
    </I18nProvider>
  );
};
