import React, { useState } from 'react';
import type { DaifugoConfig } from '../../core/rules/daifugo/config.js';
import { DEFAULT_DAIFUGO_CONFIG } from '../../core/rules/daifugo/config.js';

export interface LobbyScreenProps {
  isHost: boolean;
  peerId: string;
  players: readonly { id: string; name: string }[];
  error: string | null;
  onStartHost: (playerName: string, config: DaifugoConfig) => void;
  onJoinClient: (hostPeerId: string, playerName: string) => void;
  onStartGame: () => void;
}

export const LobbyScreen: React.FC<LobbyScreenProps> = ({
  isHost,
  peerId,
  players,
  error,
  onStartHost,
  onJoinClient,
  onStartGame,
}) => {
  const [mode, setMode] = useState<'select' | 'host' | 'client'>('select');
  const [playerName, setPlayerName] = useState('Player 1');
  const [targetPeerId, setTargetPeerId] = useState('');
  const [copied, setCopied] = useState(false);

  // Config toggles
  const [config, setConfig] = useState<DaifugoConfig>(DEFAULT_DAIFUGO_CONFIG);

  const handleCopyPeerId = () => {
    if (peerId) {
      navigator.clipboard.writeText(peerId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const toggleConfig = (key: keyof Omit<DaifugoConfig, 'suitLock' | 'prohibitedEndings'>) => {
    setConfig((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-emerald-950 text-gray-100">
      <div className="w-full max-w-md p-6 bg-emerald-900/80 backdrop-blur-md rounded-3xl border border-emerald-700/60 shadow-2xl">
        <h1 className="text-3xl font-black text-center text-yellow-400 mb-6 tracking-wider">
          TRUMPS: 大富豪
        </h1>

        {error && (
          <div className="p-3 mb-4 rounded-xl bg-red-600/80 text-white text-xs font-bold">
            {error}
          </div>
        )}

        {mode === 'select' && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-emerald-300 mb-1">プレイヤー名</label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-emerald-950 border border-emerald-700 text-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setMode('host');
                  onStartHost(playerName, config);
                }}
                className="py-3 px-4 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-gray-900 font-extrabold text-sm shadow-md transition active:scale-95"
              >
                部屋を作る (Host)
              </button>
              <button
                type="button"
                onClick={() => setMode('client')}
                className="py-3 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-extrabold text-sm shadow-md transition active:scale-95"
              >
                部屋に入る (Join)
              </button>
            </div>
          </div>
        )}

        {mode === 'host' && (
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-800 text-center">
              <div className="text-xs text-emerald-400 font-bold mb-1">あなたのPeerID（招待用）</div>
              <div className="flex items-center justify-center space-x-2">
                <span className="font-mono text-xs sm:text-sm font-black text-yellow-300 break-all select-all">
                  {peerId || '接続準備中...'}
                </span>
                {peerId && (
                  <button
                    type="button"
                    onClick={handleCopyPeerId}
                    className="px-2.5 py-1 text-xs rounded bg-yellow-500 text-gray-900 font-black hover:bg-yellow-400"
                  >
                    {copied ? 'コピー済' : 'コピー'}
                  </button>
                )}
              </div>
            </div>

            {/* Config Toggles */}
            <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-800 text-xs space-y-2">
              <div className="font-bold text-emerald-300 mb-1">ローカルルール設定</div>
              <div className="grid grid-cols-2 gap-2">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.eightCut}
                    onChange={() => toggleConfig('eightCut')}
                    className="accent-yellow-400 rounded"
                  />
                  <span>8切り</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.revolution}
                    onChange={() => toggleConfig('revolution')}
                    className="accent-yellow-400 rounded"
                  />
                  <span>革命</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.spadeThreeReturn}
                    onChange={() => toggleConfig('spadeThreeReturn')}
                    className="accent-yellow-400 rounded"
                  />
                  <span>スペ3返し</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.stairs}
                    onChange={() => toggleConfig('stairs')}
                    className="accent-yellow-400 rounded"
                  />
                  <span>階段</span>
                </label>
              </div>
            </div>

            {/* Participant List */}
            <div className="space-y-1">
              <div className="text-xs font-bold text-emerald-300">
                参加プレイヤー ({players.length}/8人, 3人以上で開始可能)
              </div>
              <div className="max-h-28 overflow-y-auto space-y-1">
                {players.map((p, idx) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-emerald-950 text-xs font-bold"
                  >
                    <span>
                      {idx + 1}. {p.name}
                    </span>
                    {idx === 0 && <span className="text-[10px] text-yellow-400 font-extrabold">HOST</span>}
                  </div>
                ))}
              </div>
            </div>

            <button
              type="button"
              disabled={players.length < 3}
              onClick={onStartGame}
              className={`w-full py-3 rounded-xl font-extrabold text-sm shadow-lg transition active:scale-95 ${
                players.length >= 3
                  ? 'bg-yellow-500 hover:bg-yellow-400 text-gray-900 ring-2 ring-yellow-300'
                  : 'bg-gray-600 text-gray-300 cursor-not-allowed opacity-60'
              }`}
            >
              ゲーム開始 ({players.length}人)
            </button>
          </div>
        )}

        {mode === 'client' && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-emerald-300 mb-1">
                ホストのPeerIDを入力
              </label>
              <input
                type="text"
                placeholder="ホストから共有されたPeerID"
                value={targetPeerId}
                onChange={(e) => setTargetPeerId(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-emerald-950 border border-emerald-700 text-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-yellow-400"
              />
            </div>

            <button
              type="button"
              disabled={!targetPeerId.trim()}
              onClick={() => onJoinClient(targetPeerId.trim(), playerName)}
              className="w-full py-3 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-gray-900 font-extrabold text-sm shadow-md transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              部屋に参加する
            </button>

            <button
              type="button"
              onClick={() => setMode('select')}
              className="w-full py-2 text-xs text-emerald-400 hover:underline font-bold"
            >
              戻る
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
