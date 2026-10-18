import React, { useState, useEffect } from 'react';
import type { DaifugoConfig } from '../../core/rules/daifugo/config.js';
import { DEFAULT_DAIFUGO_CONFIG } from '../../core/rules/daifugo/config.js';
import { GameSelector } from '../components/GameSelector.js';
import { RulePresets } from '../components/RulePresets.js';
import { RulesModal } from '../components/RulesModal.js';

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
  const [selectedGameId, setSelectedGameId] = useState('daifugo');
  const [playerName, setPlayerName] = useState('プレイヤー');
  const [targetPeerId, setTargetPeerId] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);

  // Config settings
  const [config, setConfig] = useState<DaifugoConfig>(DEFAULT_DAIFUGO_CONFIG);

  // Read URL query param for automatic join link: ?room=xxx
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const roomParam = params.get('room') || params.get('r');
      if (roomParam) {
        setTargetPeerId(roomParam);
        setMode('client');
      }
    }
  }, []);

  const handleCopyInviteLink = () => {
    if (peerId && typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('room', peerId);
      navigator.clipboard.writeText(url.toString());
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const toggleConfig = (key: keyof Omit<DaifugoConfig, 'suitLock' | 'prohibitedEndings'>) => {
    setConfig((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleApplyPreset = (configPartial: Partial<DaifugoConfig>) => {
    setConfig((prev) => ({
      ...prev,
      ...configPartial,
      prohibitedEndings: {
        ...prev.prohibitedEndings,
        ...(configPartial.prohibitedEndings ?? {}),
      },
    }));
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-3 sm:p-6 bg-gradient-to-b from-emerald-950 via-emerald-900 to-emerald-950 text-gray-100">
      {/* Rules Modal */}
      <RulesModal
        isOpen={isRulesModalOpen}
        config={config}
        onClose={() => setIsRulesModalOpen(false)}
      />

      <div className="w-full max-w-lg p-5 sm:p-7 bg-emerald-900/80 backdrop-blur-xl rounded-3xl border border-emerald-600/50 shadow-2xl relative overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <span className="text-2xl">🃏</span>
            <h1 className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-500 tracking-wider">
              TRUMPS ONLINE
            </h1>
          </div>

          <button
            type="button"
            data-testid="open-rules-button"
            onClick={() => setIsRulesModalOpen(true)}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-full bg-emerald-800/80 hover:bg-emerald-700 text-yellow-300 border border-yellow-500/40 text-xs font-black transition active:scale-95 shadow-sm"
          >
            <span>📋</span>
            <span>ルール</span>
          </button>
        </div>

        {error && (
          <div className="p-3 mb-4 rounded-2xl bg-red-600/90 text-white text-xs font-extrabold shadow-md flex items-center space-x-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* MODE 1: SELECT */}
        {mode === 'select' && (
          <div className="space-y-5">
            {/* Player Name Input */}
            <div>
              <label className="block text-xs font-bold text-emerald-300 mb-1.5">
                あなたのプレイヤー名
              </label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                maxLength={12}
                placeholder="ニックネーム"
                className="w-full px-4 py-3 rounded-2xl bg-emerald-950/90 border border-emerald-700 text-white font-extrabold text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 shadow-inner"
              />
            </div>

            {/* Game Selector */}
            <GameSelector
              selectedGameId={selectedGameId}
              onSelectGame={setSelectedGameId}
            />

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setMode('host');
                  onStartHost(playerName, config);
                }}
                className="py-3.5 px-4 rounded-2xl bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-gray-950 font-black text-sm shadow-lg shadow-yellow-500/25 transition active:scale-95 flex items-center justify-center space-x-1.5"
              >
                <span>👑</span>
                <span>部屋を作る (Host)</span>
              </button>

              <button
                type="button"
                onClick={() => setMode('client')}
                className="py-3.5 px-4 rounded-2xl bg-emerald-800 hover:bg-emerald-700 text-white font-black text-sm shadow-md border border-emerald-600/60 transition active:scale-95 flex items-center justify-center space-x-1.5"
              >
                <span>🚪</span>
                <span>部屋に入る (Join)</span>
              </button>
            </div>
          </div>
        )}

        {/* MODE 2: HOST */}
        {mode === 'host' && (
          <div className="space-y-4">
            {/* Invite Link & Peer ID Box */}
            <div className="p-3.5 rounded-2xl bg-emerald-950/90 border border-yellow-500/40 shadow-inner space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-yellow-400 font-extrabold flex items-center space-x-1">
                  <span>🔗</span>
                  <span>招待用リンク</span>
                </span>
                <span className="text-[11px] text-emerald-400">ワンタップで合流可能</span>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  readOnly
                  value={peerId ? `${window.location.origin}${window.location.pathname}?room=${peerId}` : '接続を準備しています...'}
                  className="flex-1 px-3 py-2 rounded-xl bg-emerald-900/60 border border-emerald-700 text-xs font-mono text-emerald-200 select-all focus:outline-none"
                />
                <button
                  type="button"
                  disabled={!peerId}
                  onClick={handleCopyInviteLink}
                  className="px-3.5 py-2 text-xs rounded-xl bg-yellow-400 hover:bg-yellow-300 text-gray-950 font-black transition active:scale-95 shadow-md flex items-center space-x-1 whitespace-nowrap disabled:opacity-50"
                >
                  <span>{copiedLink ? '✓ コピー完了' : 'リンクコピー'}</span>
                </button>
              </div>
            </div>

            {/* Chips Mode Toggle */}
            <div className="p-3 rounded-2xl bg-emerald-950/60 border border-emerald-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-xl">💰</span>
                <div>
                  <div className="font-black text-xs text-yellow-300">カジノチップ対戦モード</div>
                  <div className="text-[11px] text-emerald-400">順位に応じてチップをやり取り</div>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!config.chipsMode}
                  onChange={() => toggleConfig('chipsMode')}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-emerald-900 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-500"></div>
              </label>
            </div>

            {/* Rule Presets */}
            <RulePresets onApplyPreset={handleApplyPreset} />

            {/* Fine-grained Toggles */}
            <div className="p-3 rounded-2xl bg-emerald-950/50 border border-emerald-800/80 text-xs space-y-2">
              <div className="font-extrabold text-emerald-300">詳細ルール設定</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <label className="flex items-center space-x-2 cursor-pointer p-1.5 rounded-lg hover:bg-emerald-900/50">
                  <input
                    type="checkbox"
                    checked={config.eightCut}
                    onChange={() => toggleConfig('eightCut')}
                    className="accent-yellow-400 w-4 h-4 rounded"
                  />
                  <span className="font-bold">8切り</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer p-1.5 rounded-lg hover:bg-emerald-900/50">
                  <input
                    type="checkbox"
                    checked={config.revolution}
                    onChange={() => toggleConfig('revolution')}
                    className="accent-yellow-400 w-4 h-4 rounded"
                  />
                  <span className="font-bold">革命 (4枚出し)</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer p-1.5 rounded-lg hover:bg-emerald-900/50">
                  <input
                    type="checkbox"
                    checked={config.spadeThreeReturn}
                    onChange={() => toggleConfig('spadeThreeReturn')}
                    className="accent-yellow-400 w-4 h-4 rounded"
                  />
                  <span className="font-bold">スペ3返し</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer p-1.5 rounded-lg hover:bg-emerald-900/50">
                  <input
                    type="checkbox"
                    checked={config.stairs}
                    onChange={() => toggleConfig('stairs')}
                    className="accent-yellow-400 w-4 h-4 rounded"
                  />
                  <span className="font-bold">階段 (3枚以上)</span>
                </label>
              </div>
            </div>

            {/* Participant List */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-extrabold text-emerald-300">
                <span>参加プレイヤー ({players.length}/8人)</span>
                <span className="text-[11px] text-yellow-400">3人以上で開始可能</span>
              </div>
              <div className="max-h-24 overflow-y-auto space-y-1.5 scrollbar-thin">
                {players.map((p, idx) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-emerald-950/90 border border-emerald-800 text-xs font-black"
                  >
                    <span className="flex items-center space-x-2">
                      <span className="text-yellow-400">#{idx + 1}</span>
                      <span>{p.name}</span>
                    </span>
                    {idx === 0 && (
                      <span className="text-[10px] text-gray-950 bg-yellow-400 px-2 py-0.5 rounded-full font-black">
                        HOST
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Start Button */}
            <button
              type="button"
              disabled={players.length < 3}
              onClick={onStartGame}
              className={`w-full py-3.5 rounded-2xl font-black text-sm shadow-xl transition active:scale-95 ${
                players.length >= 3
                  ? 'bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 text-gray-950 ring-2 ring-yellow-300 shadow-yellow-500/30'
                  : 'bg-emerald-950/80 text-gray-400 border border-emerald-800 cursor-not-allowed opacity-60'
              }`}
            >
              {players.length >= 3 ? `ゲームを開始する (${players.length}人)` : `プレイヤーを待っています (${players.length}/3人〜)`}
            </button>
          </div>
        )}

        {/* MODE 3: CLIENT */}
        {mode === 'client' && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-emerald-300 mb-1">あなたの名前</label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                maxLength={12}
                className="w-full px-4 py-2.5 rounded-xl bg-emerald-950 border border-emerald-700 text-white font-extrabold text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-emerald-300 mb-1">
                ルームID（または招待リンク）
              </label>
              <input
                type="text"
                placeholder="招待されたPeerID、またはURL"
                value={targetPeerId}
                onChange={(e) => {
                  const val = e.target.value.trim();
                  // Extract room param if pasted full URL
                  if (val.includes('room=')) {
                    const match = val.match(/[?&]room=([^&#]+)/);
                    if (match && match[1]) {
                      setTargetPeerId(match[1]);
                      return;
                    }
                  }
                  setTargetPeerId(val);
                }}
                className="w-full px-4 py-3 rounded-2xl bg-emerald-950/90 border border-emerald-700 text-yellow-300 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-yellow-400"
              />
            </div>

            <button
              type="button"
              disabled={!targetPeerId.trim()}
              onClick={() => onJoinClient(targetPeerId.trim(), playerName)}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-gray-950 font-black text-sm shadow-lg shadow-yellow-500/25 transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              部屋に参加する
            </button>

            <button
              type="button"
              onClick={() => setMode('select')}
              className="w-full py-2 text-xs text-emerald-400 hover:text-emerald-300 hover:underline font-bold"
            >
              ← モード選択に戻る
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
