import React, { useState, useEffect } from 'react';
import type { DaifugoConfig, SuitLockType, NineEffectType } from '../../core/rules/daifugo/config.js';
import { DEFAULT_DAIFUGO_CONFIG, resolveRuleConflicts } from '../../core/rules/daifugo/config.js';
import { encodeConfigToUrlParam, decodeConfigFromUrlParam } from '../../core/rules/daifugo/url.js';
import { CHIP_PRESETS, type ChipPreset, type BankruptcyRule, type AnteType } from '../../core/types/chips.js';
import { useTranslation } from '../../i18n/context.js';
import { LanguageSelector } from '../components/LanguageSelector.js';
import { GameSelector } from '../components/GameSelector.js';
import { RulePresets } from '../components/RulePresets.js';
import { RulesModal } from '../components/RulesModal.js';
import { AdBannerContainer } from '../components/AdBannerContainer.js';
import { isAudioMuted, setAudioMuted } from '../utils/sound.js';

export interface LobbyScreenProps {
  isHost: boolean;
  peerId: string;
  players: readonly { id: string; name: string }[];
  roomConfig?: DaifugoConfig;
  error: string | null;
  isConnecting?: boolean;
  onStartHost: (playerName: string, config: any, gameId?: string) => void;
  onJoinClient: (hostPeerId: string, playerName: string) => void;
  onUpdateConfig?: (config: DaifugoConfig) => void;
  onStartGame: (config?: DaifugoConfig) => void;
  onLeaveRoom?: () => void;
  onStartSinglePlayerGame?: (gameId: string) => void;
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
  onLeaveRoom,
  onStartSinglePlayerGame,
}) => {
  const { t, language } = useTranslation();
  const [mode, setMode] = useState<'select' | 'host' | 'client'>('select');
  const [chipSubMode, setChipSubMode] = useState<'preset' | 'custom'>('preset');
  const [selectedGameId, setSelectedGameId] = useState('daifugo');
  const [playerName, setPlayerName] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('room') || params.get('r')) {
        return '#2';
      }
    }
    return '#1';
  });
  const [targetPeerId, setTargetPeerId] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(isAudioMuted());

  const handleToggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    setAudioMuted(next);
  };

  // Config settings initialized with roomConfig or default
  const [config, setConfig] = useState<DaifugoConfig>(roomConfig ?? DEFAULT_DAIFUGO_CONFIG);

  // Sync with incoming roomConfig for clients
  useEffect(() => {
    if (roomConfig) {
      setConfig(roomConfig);
    }
  }, [roomConfig]);

  // Read URL query param for automatic join link: ?room=xxx & ?rules=xxx
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const roomParam = params.get('room') || params.get('r');
      if (roomParam) {
        setTargetPeerId(roomParam);
        setMode('client');
      }
      const rulesParam = params.get('rules');
      if (rulesParam) {
        const decoded = decodeConfigFromUrlParam(rulesParam);
        if (decoded) {
          setConfig(decoded);
          if (onUpdateConfig) {
            onUpdateConfig(decoded);
          }
        }
      }
    }
  }, [onUpdateConfig]);

  // Automatically switch to client view if client has joined or has room config
  useEffect(() => {
    if (!isHost && (peerId || players.length > 0)) {
      setMode('client');
    }
  }, [isHost, peerId, players.length]);

  const handleCopyInviteLink = () => {
    if (peerId && typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('room', peerId);
      url.searchParams.set('rules', encodeConfigToUrlParam(config));
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

  const setInitialChips = (initialChips: number) => {
    updateAndNotifyConfig({ ...config, initialChips });
  };

  const setAnte = (ante: number) => {
    updateAndNotifyConfig({ ...config, ante });
  };

  const setChipSettlementType = (chipSettlementType: 'ranking_transfer' | 'pot_split') => {
    updateAndNotifyConfig({ ...config, chipSettlementType });
  };

  const applyChipPreset = (presetKey: ChipPreset) => {
    const presetDef = CHIP_PRESETS[presetKey];
    updateAndNotifyConfig({
      ...config,
      preset: presetKey,
      ...presetDef.config,
      ante: presetDef.config.baseAnte,
    });
  };

  const setBankruptcyRule = (bankruptcyRule: BankruptcyRule) => {
    updateAndNotifyConfig({ ...config, bankruptcyRule, preset: 'custom' });
  };

  const setAnteType = (anteType: AnteType, baseAnte?: number) => {
    const anteVal = anteType === 'none' ? 0 : (baseAnte ?? config.baseAnte ?? 50);
    updateAndNotifyConfig({
      ...config,
      anteType,
      baseAnte: anteVal,
      ante: anteVal,
      preset: 'custom',
    });
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

      <div className="w-full max-w-lg p-5 sm:p-7 bg-emerald-950/95 rounded-3xl border border-emerald-600/50 shadow-2xl relative overflow-hidden">
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
              data-testid="sound-toggle-button"
              onClick={handleToggleMute}
              aria-label={isMuted ? '音声ミュート解除' : '音声ミュート'}
              className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-full bg-emerald-800/80 hover:bg-emerald-700 text-yellow-300 border border-emerald-600/60 font-bold transition active:scale-95 text-xs shadow-sm"
            >
              {isMuted ? '🔇' : '🔊'}
            </button>
            <button
              type="button"
              data-testid="open-rules-button"
              onClick={() => setIsRulesModalOpen(true)}
              className="flex items-center space-x-1 px-3 py-1.5 rounded-full bg-emerald-800/80 hover:bg-emerald-700 text-yellow-300 border border-yellow-500/40 text-xs font-black transition active:scale-95 shadow-sm"
            >
              <span>📋</span>
              <span>{t.app.rules}</span>
            </button>
            {(peerId || mode !== 'select') && onLeaveRoom && (
              <button
                type="button"
                data-testid="leave-room-button"
                onClick={() => {
                  setMode('select');
                  onLeaveRoom();
                }}
                className="flex items-center space-x-1 px-3 py-1.5 rounded-full bg-red-900/80 hover:bg-red-800 text-red-200 border border-red-600/60 text-xs font-black transition active:scale-95 shadow-sm"
                aria-label={t.settings.leaveRoom}
              >
                <span>🚪</span>
              </button>
            )}
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
            {selectedGameId === 'shinkei-suijaku' ? (
              <div className="space-y-3 pt-2">
                {/* 1人で遊ぶ */}
                <div className="p-3.5 rounded-2xl bg-emerald-950/80 border border-yellow-400/40 space-y-2 shadow-sm">
                  <div className="text-xs font-black text-yellow-300 flex items-center space-x-1.5">
                    <span>🧠</span>
                    <span>一人で遊ぶ</span>
                  </div>
                  <p className="text-[11px] text-emerald-300/80">
                    52枚のカードでタイムアタック・手数記録に挑戦します。
                  </p>
                  <button
                    type="button"
                    data-testid="play-memory-solo-button"
                    onClick={() => onStartSinglePlayerGame?.('shinkei-suijaku')}
                    className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 text-gray-950 font-black text-sm shadow-md transition active:scale-95 flex items-center justify-center space-x-1.5"
                  >
                    <span>一人で遊ぶ（タイムアタック開始）</span>
                  </button>
                </div>

                {/* オンラインで対戦する */}
                <div className="p-3.5 rounded-2xl bg-emerald-950/80 border border-emerald-700/60 space-y-2.5 shadow-sm">
                  <div className="text-xs font-black text-emerald-200 flex items-center space-x-1.5">
                    <span>🌐</span>
                    <span>オンラインで対戦する（1〜6人）</span>
                  </div>
                  <p className="text-[11px] text-emerald-300/80">
                    部屋を作って友達を招待するか、友達の部屋番号を入力して対戦します。
                  </p>
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <button
                      type="button"
                      disabled={isConnecting}
                      data-testid="create-room-button"
                      onClick={() => {
                        setMode('host');
                        onStartHost(playerName, config, 'shinkei-suijaku');
                      }}
                      className="py-3 px-3 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-gray-950 font-black text-xs shadow-md transition active:scale-95 flex items-center justify-center space-x-1 disabled:opacity-50"
                    >
                      <span>👑</span>
                      <span>部屋をつくる</span>
                    </button>
                    <button
                      type="button"
                      data-testid="join-room-button"
                      onClick={() => {
                        setMode('client');
                        if (playerName === '#1') {
                          setPlayerName('#2');
                        }
                      }}
                      className="py-3 px-3 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-black text-xs shadow border border-emerald-600/70 transition active:scale-95 flex items-center justify-center space-x-1"
                    >
                      <span>🚪</span>
                      <span>部屋に入る</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : selectedGameId === 'klondike' ? (
              <div className="pt-2">
                <button
                  type="button"
                  data-testid="play-solitaire-button"
                  onClick={() => onStartSinglePlayerGame?.('klondike')}
                  className="w-full py-4 px-4 rounded-2xl bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 hover:from-yellow-300 hover:to-amber-300 text-gray-950 font-black text-base shadow-xl shadow-yellow-500/30 transition active:scale-95 flex items-center justify-center space-x-2"
                >
                  <span className="text-xl">🎴</span>
                  <span>ソリティアを1人でプレイする</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2.5 pt-2">
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    disabled={isConnecting}
                    data-testid="create-room-button"
                    onClick={() => {
                      setMode('host');
                      onStartHost(playerName, config, selectedGameId);
                    }}
                    className="py-3.5 px-4 rounded-2xl bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-gray-950 font-black text-sm shadow-lg shadow-yellow-500/25 transition active:scale-95 flex items-center justify-center space-x-1.5 disabled:opacity-50"
                  >
                    <span>👑</span>
                    <span>{t.lobby.createRoom}</span>
                  </button>

                  <button
                    type="button"
                    data-testid="join-room-button"
                    onClick={() => {
                      setMode('client');
                      if (playerName === '#1') {
                        setPlayerName('#2');
                      }
                    }}
                    className="py-3.5 px-4 rounded-2xl bg-emerald-800 hover:bg-emerald-700 text-white font-black text-sm shadow-md border border-emerald-600/60 transition active:scale-95 flex items-center justify-center space-x-1.5"
                  >
                    <span>🚪</span>
                    <span>{t.lobby.joinRoom}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* MODE 2: HOST */}
        {mode === 'host' && (
          <div className="space-y-4">
            {/* Room Header Info */}
            <div className="flex items-center justify-between px-1 text-xs">
              <span className="font-black text-yellow-300 flex items-center space-x-1.5">
                <span>{selectedGameId === 'shinkei-suijaku' ? '🧠' : '👑'}</span>
                <span>
                  {selectedGameId === 'shinkei-suijaku'
                    ? '神経衰弱ルーム（1〜6人対応）'
                    : '大富豪ルーム（3〜8人対応）'}
                </span>
              </span>
              <button
                type="button"
                onClick={() => {
                  setMode('select');
                  onLeaveRoom?.();
                }}
                className="text-[11px] text-emerald-300 hover:text-white underline font-bold"
              >
                ゲーム選択に戻る
              </button>
            </div>

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
                  value={peerId ? `${window.location.origin}${window.location.pathname}?room=${peerId}&rules=${encodeConfigToUrlParam(config)}` : '接続を準備しています...'}
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

            {selectedGameId === 'shinkei-suijaku' ? (
              <div className="p-3.5 rounded-2xl bg-emerald-950/80 border border-emerald-700/60 text-xs space-y-2.5">
                <div className="font-black text-yellow-300 flex items-center space-x-1.5">
                  <span>📜</span>
                  <span>神経衰弱 ルール案内</span>
                </div>
                <div className="text-[11px] text-emerald-200/90 leading-relaxed space-y-1">
                  <div>・トランプ標準52枚（ジョーカーなし）を使用します。</div>
                  <div>・手番で2枚めくり、同じ数字（ランク）ならペア獲得で連続手番！</div>
                  <div>・外れたらカードが伏せ直され、次のプレイヤーへ手番が回ります。</div>
                  <div>・全ペア獲得時に最も多くペアを取ったプレイヤーが勝利です。</div>
                </div>
              </div>
            ) : (
              <>
                {/* Chips Mode Toggle & Rich Settings */}
            <div className={`p-3.5 rounded-2xl border transition-all ${
              config.chipsMode
                ? 'bg-emerald-950/90 border-yellow-500/50 shadow-lg'
                : 'bg-emerald-950/60 border-emerald-800'
            } space-y-3`}>
              <div
                data-testid="chips-mode-row"
                className="flex items-center justify-between cursor-pointer select-none"
                onClick={() => toggleConfig('chipsMode')}
              >
                <div className="flex items-center space-x-2.5">
                  <span className="text-2xl">💰</span>
                  <div>
                    <div className="flex items-center space-x-1.5">
                      <span className="font-black text-xs text-yellow-300">{t.lobby.chipsMode}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        config.chipsMode ? 'bg-yellow-400 text-gray-950' : 'bg-emerald-900 text-emerald-400'
                      }`}>
                        {config.chipsMode ? 'ON' : 'OFF'}
                      </span>
                    </div>
                    <div className="text-[11px] text-emerald-400">{t.lobby.chipsModeDesc}</div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-emerald-400 font-bold transition-transform duration-200">
                    {config.chipsMode ? '▲' : '▼'}
                  </span>
                  <label
                    className="relative inline-flex items-center cursor-pointer pointer-events-none"
                  >
                    <input
                      type="checkbox"
                      data-testid="chips-mode-toggle"
                      checked={!!config.chipsMode}
                      readOnly
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-emerald-900 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-500"></div>
                  </label>
                </div>
              </div>

              {config.chipsMode && (
                <div
                  className="pt-2.5 border-t border-emerald-800/80 space-y-3 text-xs animate-in fade-in duration-200"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Mode Selector Tabs: Preset vs Custom */}
                  <div className="flex rounded-xl bg-emerald-950/90 p-1 border border-emerald-800">
                    <button
                      type="button"
                      data-testid="chip-tab-preset"
                      onClick={() => setChipSubMode('preset')}
                      className={`flex-1 py-1.5 rounded-lg font-black text-xs transition flex items-center justify-center space-x-1 ${
                        chipSubMode === 'preset'
                          ? 'bg-yellow-400 text-gray-950 shadow-sm'
                          : 'text-emerald-300 hover:text-white'
                      }`}
                    >
                      <span>⚡</span>
                      <span>テンプレから選ぶ</span>
                    </button>
                    <button
                      type="button"
                      data-testid="chip-tab-custom"
                      onClick={() => setChipSubMode('custom')}
                      className={`flex-1 py-1.5 rounded-lg font-black text-xs transition flex items-center justify-center space-x-1 ${
                        chipSubMode === 'custom'
                          ? 'bg-yellow-400 text-gray-950 shadow-sm'
                          : 'text-emerald-300 hover:text-white'
                      }`}
                    >
                      <span>🛠️</span>
                      <span>カスタム詳細設定</span>
                    </button>
                  </div>

                  {chipSubMode === 'preset' ? (
                    /* 4 Quick Presets */
                    <div className="grid grid-cols-2 gap-2">
                      {(Object.keys(CHIP_PRESETS) as ChipPreset[]).map((pKey) => {
                        const p = CHIP_PRESETS[pKey];
                        const isSelected = config.preset === pKey;
                        return (
                          <button
                            key={pKey}
                            type="button"
                            data-testid={`chip-preset-${pKey}`}
                            onClick={() => applyChipPreset(pKey)}
                            className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                              isSelected
                                ? 'bg-yellow-400/15 border-yellow-400 text-yellow-200 shadow-md ring-1 ring-yellow-400'
                                : 'bg-emerald-900/40 border-emerald-800 text-emerald-200 hover:bg-emerald-800/50'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-black text-xs text-yellow-300 flex items-center space-x-1">
                                <span>{p.icon}</span>
                                <span>{p.title}</span>
                              </span>
                              {isSelected && <span className="text-[10px] bg-yellow-400 text-gray-950 font-bold px-1 rounded">選択中</span>}
                            </div>
                            <div className="text-[10px] text-emerald-300/90 leading-tight">{p.desc}</div>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    /* Custom Fine-Grained Settings */
                    <div className="space-y-2.5">
                      {/* Starting Chips */}
                      <div className="space-y-1">
                        <div className="text-[11px] font-bold text-emerald-300">{t.lobby.initialChipsLabel}</div>
                        <div className="grid grid-cols-4 gap-1.5">
                          {[500, 1000, 5000, 10000].map((val) => (
                            <button
                              key={val}
                              type="button"
                              onClick={() => setInitialChips(val)}
                              className={`py-1 rounded-lg font-bold text-[11px] border transition-all ${
                                (config.initialChips ?? 1000) === val
                                  ? 'bg-yellow-400 text-gray-950 border-yellow-300 shadow-sm'
                                  : 'bg-emerald-900/60 text-emerald-300 border-emerald-700/60 hover:bg-emerald-800/60'
                              }`}
                            >
                              {val.toLocaleString()}枚
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Ante Mode */}
                      <div className="space-y-1">
                        <div className="text-[11px] font-bold text-emerald-300">アンティ (参加料) 方式</div>
                        <div className="grid grid-cols-3 gap-1.5">
                          <button
                            type="button"
                            onClick={() => setAnteType('none', 0)}
                            className={`py-1 rounded-lg font-bold text-[11px] border transition-all ${
                              (config.anteType ?? 'none') === 'none'
                                ? 'bg-yellow-400 text-gray-950 border-yellow-300 shadow-sm'
                                : 'bg-emerald-900/60 text-emerald-300 border-emerald-700/60'
                            }`}
                          >
                            {language === 'en' ? 'None (0)' : 'なし (0枚)'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setAnteType('fixed', 50)}
                            className={`py-1 rounded-lg font-bold text-[11px] border transition-all ${
                              config.anteType === 'fixed'
                                ? 'bg-yellow-400 text-gray-950 border-yellow-300 shadow-sm'
                                : 'bg-emerald-900/60 text-emerald-300 border-emerald-700/60'
                            }`}
                          >
                            {language === 'en' ? 'Fixed (50)' : '固定 (50枚)'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setAnteType('escalating', 50)}
                            className={`py-1 rounded-lg font-bold text-[11px] border transition-all ${
                              config.anteType === 'escalating'
                                ? 'bg-yellow-400 text-gray-950 border-yellow-300 shadow-sm'
                                : 'bg-emerald-900/60 text-emerald-300 border-emerald-700/60'
                            }`}
                          >
                            {language === 'en' ? 'Escalating (+50/R)' : '漸増 (+50/回)'}
                          </button>
                        </div>
                      </div>

                      {/* Bankruptcy Rule: Debt vs Bust */}
                      <div className="space-y-1">
                        <div className="text-[11px] font-bold text-emerald-300">
                          {language === 'en' ? 'Bankruptcy Rule (Chips ≤ 0)' : '破産・借金ルール (所持チップ0時)'}
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                          <button
                            type="button"
                            onClick={() => setBankruptcyRule('allow_debt')}
                            className={`py-1 px-1.5 rounded-lg font-bold text-[11px] border transition-all ${
                              (config.bankruptcyRule ?? 'allow_debt') === 'allow_debt'
                                ? 'bg-yellow-400 text-gray-950 border-yellow-300 shadow-sm'
                                : 'bg-emerald-900/60 text-emerald-300 border-emerald-700/60'
                            }`}
                          >
                            {language === 'en' ? '🀄 Allow Debt' : '🀄 借金OK (麻雀黒棒)'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setBankruptcyRule('bust_game_over')}
                            className={`py-1 px-1.5 rounded-lg font-bold text-[11px] border transition-all ${
                              config.bankruptcyRule === 'bust_game_over'
                                ? 'bg-yellow-400 text-gray-950 border-yellow-300 shadow-sm'
                                : 'bg-emerald-900/60 text-emerald-300 border-emerald-700/60'
                            }`}
                          >
                            {language === 'en' ? '💥 Bust (Game Over)' : '💥 破産脱落 (Bust)'}
                          </button>
                        </div>
                      </div>

                      {/* Settlement Type */}
                      <div className="space-y-1">
                        <div className="text-[11px] font-bold text-emerald-300">{t.lobby.settlementTypeLabel}</div>
                        <div className="grid grid-cols-2 gap-1.5">
                          <button
                            type="button"
                            onClick={() => setChipSettlementType('ranking_transfer')}
                            className={`py-1 px-1.5 rounded-lg font-bold text-[11px] border transition-all ${
                              (config.chipSettlementType ?? 'ranking_transfer') === 'ranking_transfer'
                                ? 'bg-yellow-400 text-gray-950 border-yellow-300 shadow-sm'
                                : 'bg-emerald-900/60 text-emerald-300 border-emerald-700/60'
                            }`}
                          >
                            {t.lobby.settlementRanking}
                          </button>
                          <button
                            type="button"
                            onClick={() => setChipSettlementType('pot_split')}
                            className={`py-1 px-1.5 rounded-lg font-bold text-[11px] border transition-all ${
                              config.chipSettlementType === 'pot_split'
                                ? 'bg-yellow-400 text-gray-950 border-yellow-300 shadow-sm'
                                : 'bg-emerald-900/60 text-emerald-300 border-emerald-700/60'
                            }`}
                          >
                            {t.lobby.settlementPotSplit}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Rule Presets */}
            <RulePresets onApplyPreset={handleApplyPreset} />

            {/* Fine-grained Toggles & Exclusive Selectors */}
            <div className="p-3.5 rounded-2xl bg-emerald-950/70 border border-emerald-800/80 text-xs space-y-3.5 shadow-md">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-xs text-yellow-300">{t.lobby.ruleDetails}</span>
                <span className="text-[10px] text-emerald-400">
                  {language === 'en' ? 'Click to toggle rules' : 'クリックで個別切替・排他自動解決'}
                </span>
              </div>

              {/* Exclusive 1: Suit Lock */}
              <div className="space-y-1">
                <div className="text-[11px] font-bold text-emerald-300">
                  {t.rules.suitLockTitle} ({language === 'en' ? 'Single Choice' : '単一選択'})
                </div>
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
                      {modeKey === 'none' && (language === 'en' ? 'None' : 'なし')}
                      {modeKey === 'single' && (language === 'en' ? 'Single' : '片縛り')}
                      {modeKey === 'double' && (language === 'en' ? 'Double' : '両縛り')}
                      {modeKey === 'geki' && (language === 'en' ? 'Super' : '激縛り')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Exclusive 2: 9 Effect */}
              <div className="space-y-1">
                <div className="text-[11px] font-bold text-emerald-300">
                  {t.rules.nineEffectTitle} ({language === 'en' ? 'Single Choice' : '単一選択'})
                </div>
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
                      {modeKey === 'none' && (language === 'en' ? 'None' : 'なし')}
                      {modeKey === 'reverse' && (language === 'en' ? '9-Reverse' : '9リバース')}
                      {modeKey === 'revolution' && (language === 'en' ? '9-Revolution' : '9一時革命')}
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
            </>
            )}

            {/* Participant List */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-extrabold text-emerald-300">
                <span>
                  {t.lobby.playersCount} ({players.length}/{selectedGameId === 'shinkei-suijaku' ? 6 : 8})
                </span>
                <span className="text-[11px] text-yellow-400">
                  {selectedGameId === 'shinkei-suijaku'
                    ? '1人以上で開始可能'
                    : t.lobby.minPlayersToStart}
                </span>
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
              disabled={
                selectedGameId === 'shinkei-suijaku'
                  ? players.length < 1 || isConnecting
                  : players.length < 3 || isConnecting
              }
              onClick={() => onStartGame(config)}
              className={`w-full py-3.5 rounded-2xl font-black text-sm shadow-xl transition active:scale-95 ${
                (selectedGameId === 'shinkei-suijaku' ? players.length >= 1 : players.length >= 3) && !isConnecting
                  ? 'bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 text-gray-950 ring-2 ring-yellow-300 shadow-yellow-500/30'
                  : 'bg-emerald-950/80 text-gray-400 border border-emerald-800 cursor-not-allowed opacity-60'
              }`}
            >
              {selectedGameId === 'shinkei-suijaku'
                ? `神経衰弱を開始する (${players.length}人参加中)`
                : players.length >= 3
                ? `${t.lobby.startGame} (${players.length})`
                : `${t.lobby.waitingPlayers} (${players.length}/3...)`}
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
            <div className="p-3.5 rounded-2xl bg-emerald-950/70 border border-emerald-800 text-xs space-y-2">
              <div className="flex items-center justify-between text-yellow-300 font-extrabold">
                <span className="flex items-center space-x-1">
                  <span>⚙️</span>
                  <span>{t.lobby.roomRules}</span>
                </span>
                {config.chipsMode && (config.baseAnte ?? config.ante ?? 0) > 0 && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 font-bold">
                    🪙 {config.baseAnte ?? config.ante}
                  </span>
                )}
              </div>

              {/* Special rules badges */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {/* Minimal Chips details (ante and pot only) */}
                {config.chipsMode && (
                  <>
                    {(config.baseAnte ?? config.ante ?? 0) > 0 && (
                      <span className="px-2 py-0.5 rounded-lg bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 font-bold text-[11px]">
                        🪙 {config.anteType === 'escalating' ? `+${config.escalationStep ?? 50}/R` : `${config.baseAnte ?? config.ante}`}
                      </span>
                    )}
                    {config.chipSettlementType === 'pot_split' && (
                      <span className="px-2 py-0.5 rounded-lg bg-amber-500/25 text-amber-300 border border-amber-400/50 font-bold text-[11px]">
                        🏺 Pot
                      </span>
                    )}
                  </>
                )}
                {/* Suit Lock Badge */}
                {config.suitLock !== 'none' && (
                  <span className="px-2 py-0.5 rounded-lg bg-yellow-400 text-gray-950 font-black text-[11px]">
                    {config.suitLock === 'single' && (language === 'en' ? 'Single Lock' : '片縛り')}
                    {config.suitLock === 'double' && (language === 'en' ? 'Double Lock' : '両縛り')}
                    {config.suitLock === 'geki' && (language === 'en' ? 'Super Lock' : '激縛り')}
                  </span>
                )}
                {/* 9 Effect Badge */}
                {config.nineEffect !== 'none' && (
                  <span className="px-2 py-0.5 rounded-lg bg-yellow-400 text-gray-950 font-black text-[11px]">
                    {config.nineEffect === 'reverse' && (language === 'en' ? '9-Reverse' : '9リバース')}
                    {config.nineEffect === 'revolution' && (language === 'en' ? '9-Revolution' : '9一時革命')}
                  </span>
                )}
                {/* Other Active Rules */}
                {config.eightCut && (
                  <span className="px-2 py-0.5 rounded-lg bg-emerald-800 text-emerald-100 font-bold text-[11px] border border-emerald-600">
                    {t.rules.eightCutTitle}
                  </span>
                )}
                {config.revolution && (
                  <span className="px-2 py-0.5 rounded-lg bg-emerald-800 text-emerald-100 font-bold text-[11px] border border-emerald-600">
                    {t.rules.revolutionTitle}
                  </span>
                )}
                {config.elevenBack && (
                  <span className="px-2 py-0.5 rounded-lg bg-emerald-800 text-emerald-100 font-bold text-[11px] border border-emerald-600">
                    {t.rules.elevenBackTitle}
                  </span>
                )}
                {config.miyakoOchi && (
                  <span className="px-2 py-0.5 rounded-lg bg-emerald-800 text-emerald-100 font-bold text-[11px] border border-emerald-600">
                    {t.rules.miyakoOchiTitle}
                  </span>
                )}
                {config.spadeThreeReturn && (
                  <span className="px-2 py-0.5 rounded-lg bg-emerald-800 text-emerald-100 font-bold text-[11px] border border-emerald-600">
                    {t.rules.spadeThreeTitle}
                  </span>
                )}
                {config.stairs && (
                  <span className="px-2 py-0.5 rounded-lg bg-emerald-800 text-emerald-100 font-bold text-[11px] border border-emerald-600">
                    {t.rules.stairsTitle}
                  </span>
                )}
                {config.fiveSkip && (
                  <span className="px-2 py-0.5 rounded-lg bg-emerald-800 text-emerald-100 font-bold text-[11px] border border-emerald-600">
                    {t.rules.fiveSkipTitle}
                  </span>
                )}
                {config.sevenPass && (
                  <span className="px-2 py-0.5 rounded-lg bg-emerald-800 text-emerald-100 font-bold text-[11px] border border-emerald-600">
                    {t.rules.sevenPassTitle}
                  </span>
                )}
                {config.tenDiscard && (
                  <span className="px-2 py-0.5 rounded-lg bg-emerald-800 text-emerald-100 font-bold text-[11px] border border-emerald-600">
                    {t.rules.tenDiscardTitle}
                  </span>
                )}
                {config.sandstorm && (
                  <span className="px-2 py-0.5 rounded-lg bg-emerald-800 text-emerald-100 font-bold text-[11px] border border-emerald-600">
                    {t.rules.sandstormTitle}
                  </span>
                )}
                {config.gekokujo && (
                  <span className="px-2 py-0.5 rounded-lg bg-emerald-800 text-emerald-100 font-bold text-[11px] border border-emerald-600">
                    {t.rules.gekokujoTitle}
                  </span>
                )}
              </div>

              <div className="pt-1 text-right">
                <button
                  type="button"
                  onClick={() => setIsRulesModalOpen(true)}
                  className="text-[11px] text-yellow-400 hover:text-yellow-300 font-extrabold underline"
                >
                  📋 {t.settings.checkRules}
                </button>
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
              {isConnecting
                ? language === 'en'
                  ? 'Connecting...'
                  : '接続中...'
                : t.lobby.enterRoom}
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

      {/* Policy-compliant Ad container with CLS prevention */}
      <AdBannerContainer slotId="lobby-screen-bottom" className="mt-4" />
    </div>
  );
};
