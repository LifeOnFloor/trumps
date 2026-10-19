import React, { useState, useEffect } from 'react';
import type { DaifugoConfig, SuitLockType, NineEffectType } from '../../core/rules/daifugo/config.js';
import { DEFAULT_DAIFUGO_CONFIG, resolveRuleConflicts } from '../../core/rules/daifugo/config.js';
import { useTranslation } from '../../i18n/context.js';
import { LanguageSelector } from '../components/LanguageSelector.js';
import { GameSelector } from '../components/GameSelector.js';
import { RulePresets } from '../components/RulePresets.js';
import { RulesModal } from '../components/RulesModal.js';

export interface LobbyScreenProps {
  isHost: boolean;
  peerId: string;
  players: readonly { id: string; name: string }[];
  roomConfig?: DaifugoConfig;
  error: string | null;
  isConnecting?: boolean;
  onStartHost: (playerName: string, config: DaifugoConfig) => void;
  onJoinClient: (hostPeerId: string, playerName: string) => void;
  onUpdateConfig?: (config: DaifugoConfig) => void;
  onStartGame: (config?: DaifugoConfig) => void;
}

export const LobbyScreen: React.FC<LobbyScreenProps> = ({
  isHost,
  peerId,
  players,
  roomConfig,
  error,
  isConnecting = false,
  onStartHost,
  onJoinClient,
  onUpdateConfig,
  onStartGame,
}) => {
  const { t } = useTranslation();
  const [mode, setMode] = useState<'select' | 'host' | 'client'>('select');
  const [selectedGameId, setSelectedGameId] = useState('daifugo');
  const [playerName, setPlayerName] = useState('プレイヤー');
  const [targetPeerId, setTargetPeerId] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);

  // Config settings initialized with roomConfig or default
  const [config, setConfig] = useState<DaifugoConfig>(roomConfig ?? DEFAULT_DAIFUGO_CONFIG);

  // Sync with incoming roomConfig for clients
  useEffect(() => {
    if (roomConfig) {
      setConfig(roomConfig);
    }
  }, [roomConfig]);

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

  const updateAndNotifyConfig = (newConfig: DaifugoConfig) => {
    const safeConfig = resolveRuleConflicts(newConfig);
    setConfig(safeConfig);
    if (onUpdateConfig) {
      onUpdateConfig(safeConfig);
    }
  };

  const toggleConfig = (
    key: keyof Omit<DaifugoConfig, 'suitLock' | 'nineEffect' | 'prohibitedEndings'>
  ) => {
    const updated: DaifugoConfig = {
      ...config,
      [key]: !config[key],
    };
    updateAndNotifyConfig(updated);
  };

  const setSuitLock = (suitLock: SuitLockType) => {
    updateAndNotifyConfig({ ...config, suitLock });
  };

  const setNineEffect = (nineEffect: NineEffectType) => {
    updateAndNotifyConfig({ ...config, nineEffect });
  };

  const handleApplyPreset = (configPartial: Partial<DaifugoConfig>) => {
    const updated: DaifugoConfig = {
      ...config,
      ...configPartial,
      prohibitedEndings: {
        ...config.prohibitedEndings,
        ...(configPartial.prohibitedEndings ?? {}),
      },
    };
    updateAndNotifyConfig(updated);
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
              {t.app.title}
            </h1>
          </div>

          <div className="flex items-center space-x-2">
            <LanguageSelector />
            <button
              type="button"
              data-testid="open-rules-button"
              onClick={() => setIsRulesModalOpen(true)}
              className="flex items-center space-x-1 px-3 py-1.5 rounded-full bg-emerald-800/80 hover:bg-emerald-700 text-yellow-300 border border-yellow-500/40 text-xs font-black transition active:scale-95 shadow-sm"
            >
              <span>📋</span>
              <span>{t.app.rules}</span>
            </button>
          </div>
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
            <div>
              <label className="block text-xs font-bold text-emerald-300 mb-1.5">
                {t.lobby.playerName}
              </label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                maxLength={12}
                placeholder={t.lobby.nicknamePlaceholder}
                className="w-full px-4 py-3 rounded-2xl bg-emerald-950/90 border border-emerald-700 text-white font-extrabold text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 shadow-inner"
              />
            </div>

            {/* Game Selector with Catalog & Filters */}
            <GameSelector
              selectedGameId={selectedGameId}
              onSelectGame={setSelectedGameId}
            />

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                disabled={isConnecting}
                onClick={() => {
                  setMode('host');
                  onStartHost(playerName, config);
                }}
                className="py-3.5 px-4 rounded-2xl bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-gray-950 font-black text-sm shadow-lg shadow-yellow-500/25 transition active:scale-95 flex items-center justify-center space-x-1.5 disabled:opacity-50"
              >
                <span>👑</span>
                <span>{t.lobby.createRoom}</span>
              </button>

              <button
                type="button"
                onClick={() => setMode('client')}
                className="py-3.5 px-4 rounded-2xl bg-emerald-800 hover:bg-emerald-700 text-white font-black text-sm shadow-md border border-emerald-600/60 transition active:scale-95 flex items-center justify-center space-x-1.5"
              >
                <span>🚪</span>
                <span>{t.lobby.joinRoom}</span>
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
                  <span>{t.lobby.hostTitle}</span>
                </span>
                <span className="text-[11px] text-emerald-400">{t.lobby.inviteUrlDesc}</span>
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
                  <span>{copiedLink ? t.app.copied : t.app.copyLink}</span>
                </button>
              </div>
            </div>

            {/* Chips Mode Toggle */}
            <div className="p-3 rounded-2xl bg-emerald-950/60 border border-emerald-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-xl">💰</span>
                <div>
                  <div className="font-black text-xs text-yellow-300">{t.lobby.chipsMode}</div>
                  <div className="text-[11px] text-emerald-400">{t.lobby.chipsModeDesc}</div>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  data-testid="chips-mode-toggle"
                  checked={!!config.chipsMode}
                  onChange={() => toggleConfig('chipsMode')}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-emerald-900 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-500"></div>
              </label>
            </div>

            {/* Rule Presets */}
            <RulePresets onApplyPreset={handleApplyPreset} />

            {/* Fine-grained Toggles & Exclusive Selectors */}
            <div className="p-3.5 rounded-2xl bg-emerald-950/70 border border-emerald-800/80 text-xs space-y-3.5 shadow-md">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-xs text-yellow-300">{t.lobby.ruleDetails}</span>
                <span className="text-[10px] text-emerald-400">クリックで個別切替・排他自動解決</span>
              </div>

              {/* Exclusive 1: Suit Lock */}
              <div className="space-y-1">
                <div className="text-[11px] font-bold text-emerald-300">{t.rules.suitLockTitle}（単一選択）</div>
                <div className="grid grid-cols-4 gap-1.5">
                  {(['none', 'single', 'double', 'geki'] as const).map((modeKey) => (
                    <button
                      key={modeKey}
                      type="button"
                      onClick={() => setSuitLock(modeKey)}
                      className={`py-1 px-1.5 rounded-lg border text-center font-bold text-[11px] transition-all ${
                        config.suitLock === modeKey
                          ? 'bg-yellow-400 text-gray-950 border-yellow-300 shadow-sm'
                          : 'bg-emerald-900/50 text-emerald-300 border-emerald-700/60 hover:bg-emerald-800/60'
                      }`}
                    >
                      {modeKey === 'none' && 'なし'}
                      {modeKey === 'single' && '片縛り'}
                      {modeKey === 'double' && '両縛り'}
                      {modeKey === 'geki' && '激縛り'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Exclusive 2: 9 Effect */}
              <div className="space-y-1">
                <div className="text-[11px] font-bold text-emerald-300">{t.rules.nineEffectTitle}（単一選択）</div>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['none', 'reverse', 'revolution'] as const).map((modeKey) => (
                    <button
                      key={modeKey}
                      type="button"
                      onClick={() => setNineEffect(modeKey)}
                      className={`py-1 px-1.5 rounded-lg border text-center font-bold text-[11px] transition-all ${
                        config.nineEffect === modeKey
                          ? 'bg-yellow-400 text-gray-950 border-yellow-300 shadow-sm'
                          : 'bg-emerald-900/50 text-emerald-300 border-emerald-700/60 hover:bg-emerald-800/60'
                      }`}
                    >
                      {modeKey === 'none' && 'なし'}
                      {modeKey === 'reverse' && '9リバース'}
                      {modeKey === 'revolution' && '9一時革命'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Full Rules Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-xs pt-1 border-t border-emerald-900">
                {[
                  { key: 'eightCut', title: t.rules.eightCutTitle },
                  { key: 'revolution', title: t.rules.revolutionTitle },
                  { key: 'elevenBack', title: t.rules.elevenBackTitle },
                  { key: 'miyakoOchi', title: t.rules.miyakoOchiTitle },
                  { key: 'spadeThreeReturn', title: t.rules.spadeThreeTitle },
                  { key: 'stairs', title: t.rules.stairsTitle },
                  { key: 'sequenceLock', title: t.rules.sequenceLockTitle },
                  { key: 'fiveSkip', title: t.rules.fiveSkipTitle },
                  { key: 'sevenPass', title: t.rules.sevenPassTitle },
                  { key: 'tenDiscard', title: t.rules.tenDiscardTitle },
                  { key: 'sandstorm', title: t.rules.sandstormTitle },
                  { key: 'gekokujo', title: t.rules.gekokujoTitle },
                  { key: 'cardExchange', title: t.rules.cardExchangeTitle },
                ].map((item) => (
                  <label
                    key={item.key}
                    className={`flex items-center space-x-1.5 cursor-pointer p-1.5 rounded-lg border transition-all ${
                      config[item.key as keyof DaifugoConfig]
                        ? 'bg-emerald-900/80 border-emerald-600/80 text-yellow-300'
                        : 'bg-emerald-950/40 border-emerald-900/50 text-gray-400 opacity-60 hover:opacity-90'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={!!config[item.key as keyof DaifugoConfig]}
                      onChange={() => toggleConfig(item.key as any)}
                      className="accent-yellow-400 w-3.5 h-3.5 rounded"
                    />
                    <span className="font-extrabold text-[11px] truncate">{item.title}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Participant List */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-extrabold text-emerald-300">
                <span>{t.lobby.playersCount} ({players.length}/8)</span>
                <span className="text-[11px] text-yellow-400">{t.lobby.minPlayersToStart}</span>
              </div>
              <div className="max-h-24 overflow-y-auto space-y-1.5 scrollbar-thin">
                {players.map((p, idx) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-emerald-950/90 border border-emerald-800 text-xs font-black animate-in fade-in"
                  >
                    <span className="flex items-center space-x-2">
                      <span className="text-yellow-400">#{idx + 1}</span>
                      <span>{p.name}</span>
                    </span>
                    {idx === 0 && (
                      <span className="text-[10px] text-gray-950 bg-yellow-400 px-2 py-0.5 rounded-full font-black">
                        {t.lobby.hostBadge}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Start Button */}
            <button
              type="button"
              disabled={players.length < 3 || isConnecting}
              onClick={() => onStartGame(config)}
              className={`w-full py-3.5 rounded-2xl font-black text-sm shadow-xl transition active:scale-95 ${
                players.length >= 3 && !isConnecting
                  ? 'bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 text-gray-950 ring-2 ring-yellow-300 shadow-yellow-500/30'
                  : 'bg-emerald-950/80 text-gray-400 border border-emerald-800 cursor-not-allowed opacity-60'
              }`}
            >
              {players.length >= 3 ? `${t.lobby.startGame} (${players.length})` : `${t.lobby.waitingPlayers} (${players.length}/3...)`}
            </button>
          </div>
        )}

        {/* MODE 3: CLIENT */}
        {mode === 'client' && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-emerald-300 mb-1">{t.lobby.playerName}</label>
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
                {t.lobby.enterHostId}
              </label>
              <input
                type="text"
                placeholder={t.lobby.idPlaceholder}
                value={targetPeerId}
                onChange={(e) => {
                  const val = e.target.value.trim();
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

            {/* Room Rules Summary for Client */}
            <div className="p-3 rounded-2xl bg-emerald-950/70 border border-emerald-800 text-xs space-y-1">
              <div className="flex items-center justify-between text-yellow-300 font-bold">
                <span>{t.lobby.roomRules}</span>
                <span>{config.chipsMode ? '💰 ON' : 'OFF'}</span>
              </div>
              <div className="text-[11px] text-emerald-300/80">
                {t.rules.eightCutTitle}: {config.eightCut ? 'ON' : 'OFF'} • {t.rules.revolutionTitle}: {config.revolution ? 'ON' : 'OFF'} • {t.rules.spadeThreeTitle}: {config.spadeThreeReturn ? 'ON' : 'OFF'}
              </div>
            </div>

            {/* Participant List if joined */}
            {players.length > 0 && (
              <div className="space-y-1">
                <div className="text-xs font-bold text-emerald-300">
                  {t.lobby.joinedPlayers} ({players.length})
                </div>
                <div className="max-h-20 overflow-y-auto space-y-1 scrollbar-thin">
                  {players.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-emerald-950 text-xs font-bold"
                    >
                      <span>{p.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              type="button"
              disabled={!targetPeerId.trim() || isConnecting}
              onClick={() => onJoinClient(targetPeerId.trim(), playerName)}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-gray-950 font-black text-sm shadow-lg shadow-yellow-500/25 transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isConnecting ? '接続中...' : t.lobby.enterRoom}
            </button>

            <button
              type="button"
              onClick={() => setMode('select')}
              className="w-full py-2 text-xs text-emerald-400 hover:text-emerald-300 hover:underline font-bold"
            >
              {t.lobby.backToModeSelect}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
