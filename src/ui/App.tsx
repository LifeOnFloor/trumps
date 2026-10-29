import React from 'react';
import { I18nProvider } from '../i18n/context.js';
import { useGameSession } from './hooks/use-game-session.js';
import { LobbyScreen } from './screens/LobbyScreen.js';
import { TableScreen } from './screens/TableScreen.js';
import { KlondikeScreen } from './screens/KlondikeScreen.js';
import { ShinkeiSuijakuScreen } from './screens/ShinkeiSuijakuScreen.js';
import { ShinkeiSuijakuOnlineTable } from './screens/ShinkeiSuijakuOnlineTable.js';

const MainAppContent: React.FC = () => {
  const [singlePlayerGame, setSinglePlayerGame] = React.useState<string | null>(null);

  const {
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
  } = useGameSession();

  if (singlePlayerGame === 'klondike') {
    return <KlondikeScreen onBackToLobby={() => setSinglePlayerGame(null)} />;
  }

  if (singlePlayerGame === 'shinkei-suijaku') {
    return <ShinkeiSuijakuScreen onBackToLobby={() => setSinglePlayerGame(null)} />;
  }

  if (!state) {
    return (
      <LobbyScreen
        isHost={isHost}
        peerId={peerId}
        players={players}
        roomConfig={roomConfig}
        error={error}
        isConnecting={isConnecting}
        onStartHost={startHost}
        onJoinClient={joinAsClient}
        onUpdateConfig={updateConfig}
        onStartGame={startGame}
        onLeaveRoom={leaveRoom}
        onStartSinglePlayerGame={(gameId) => setSinglePlayerGame(gameId)}
      />
    );
  }

  return (
    <>
      {isHostDisconnected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md p-6 bg-emerald-950 border-2 border-red-500 rounded-3xl text-center space-y-4 shadow-2xl animate-fade-in">
            <span className="text-4xl">⚠️</span>
            <h2 className="text-xl font-black text-red-400">ホストが切断しました</h2>
            <p className="text-xs text-emerald-200">
              ホストプレイヤーがページを離れたため、通信が切断されました。安全に引き継ぎまたはロビーへ戻ることができます。
            </p>
            <div className="pt-2 flex flex-col space-y-2">
              <button
                type="button"
                onClick={() => {
                  window.location.href = window.location.origin + window.location.pathname;
                }}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 text-gray-950 font-black text-sm shadow-lg transition active:scale-95"
              >
                👑 自分が新ホストになって部屋を作る
              </button>
              <button
                type="button"
                onClick={() => leaveRoom()}
                className="w-full py-2.5 rounded-2xl bg-emerald-900 hover:bg-emerald-800 text-emerald-200 text-xs font-bold transition"
              >
                ロビーへ戻る
              </button>
            </div>
          </div>
        </div>
      )}

      {state.context.gameId === 'shinkei-suijaku' ? (
        <ShinkeiSuijakuOnlineTable
          state={state as any}
          myPlayerId={myPlayerId}
          isHost={isHost}
          peerId={peerId}
          disconnectedPlayerIds={disconnectedPlayerIds}
          recentEvents={recentEvents}
          onFlip={dispatchFlip}
          onNextTurn={dispatchNextTurn}
          onNextRound={startNextRound}
          onLeaveRoom={leaveRoom}
        />
      ) : (
        <TableScreen
          state={state as any}
          isHost={isHost}
          myPlayerId={myPlayerId}
          peerId={peerId}
          disconnectedPlayerIds={disconnectedPlayerIds}
          roomConfig={roomConfig}
          recentEvents={recentEvents}
          onPlay={dispatchPlay}
          onPass={dispatchPass}
          onPassCards={dispatchPassCards}
          onDiscardCards={dispatchDiscardCards}
          onNextRound={startNextRound}
          onRestart={() => window.location.reload()}
          onLeaveRoom={leaveRoom}
        />
      )}
    </>
  );
};

export const App: React.FC = () => {
  return (
    <I18nProvider>
      <MainAppContent />
    </I18nProvider>
  );
};
