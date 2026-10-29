import React from 'react';
import { useTranslation } from '../../i18n/context.js';
import { LanguageSelector } from './LanguageSelector.js';
import { I18N_CONFIG } from '../../config/i18n.js';

import type { DaifugoConfig } from '../../core/rules/daifugo/config.js';
import { encodeConfigToUrlParam } from '../../core/rules/daifugo/url.js';

export interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  onOpenRules: () => void;
  onLeaveRoom?: () => void;
  peerId?: string;
  config?: DaifugoConfig;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  isMuted,
  onToggleMute,
  onOpenRules,
  onLeaveRoom,
  peerId,
  config,
}) => {
  const { t } = useTranslation();
  const [copiedLink, setCopiedLink] = React.useState(false);

  if (!isOpen) return null;

  const handleCopyInviteLink = () => {
    if (peerId && typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('room', peerId);
      if (config) {
        url.searchParams.set('rules', encodeConfigToUrlParam(config));
      }
      navigator.clipboard.writeText(url.toString());
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  return (
    <div
      data-testid="settings-modal"
      role="dialog"
      aria-modal="true"
      aria-label={t.settings.title}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative bg-emerald-950 border border-emerald-600/70 rounded-3xl p-5 w-full max-w-xs shadow-2xl text-gray-100 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-2 border-b border-emerald-800">
          <div className="flex items-center space-x-2">
            <span className="text-xl">⚙️</span>
            <h2 className="text-base font-black text-yellow-400 tracking-wider">{t.settings.title}</h2>
          </div>
          <button
            type="button"
            data-testid="close-settings-button"
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full bg-emerald-900/80 hover:bg-emerald-800 text-gray-300 hover:text-white font-bold transition text-xs"
            aria-label={t.settings.close}
          >
            ✕
          </button>
        </div>

        <div className="space-y-3 text-xs">
          {/* Sound Toggle */}
          <div className="flex items-center justify-between p-2.5 rounded-2xl bg-emerald-900/60 border border-emerald-800">
            <span className="font-bold flex items-center space-x-1.5">
              <span>{isMuted ? '🔇' : '🔊'}</span>
              <span>{t.settings.sound}</span>
            </span>
            <button
              type="button"
              data-testid="sound-toggle-button"
              onClick={onToggleMute}
              className={`px-3 py-1 rounded-full font-black text-xs transition ${
                isMuted
                  ? 'bg-gray-700 text-gray-300'
                  : 'bg-yellow-400 text-gray-950 shadow-sm'
              }`}
            >
              {isMuted ? 'OFF' : 'ON'}
            </button>
          </div>

          {/* Language Selector (hidden if multilingual is disabled) */}
          {I18N_CONFIG.multilingualEnabled && (
            <div className="flex items-center justify-between p-2.5 rounded-2xl bg-emerald-900/60 border border-emerald-800">
              <span className="font-bold flex items-center space-x-1.5">
                <span>🌐</span>
                <span>{t.settings.language}</span>
              </span>
              <LanguageSelector forceShow />
            </div>
          )}

          {/* Rules button */}
          <button
            type="button"
            data-testid="table-rules-button"
            onClick={() => {
              onClose();
              onOpenRules();
            }}
            className="w-full flex items-center justify-between p-2.5 rounded-2xl bg-emerald-900/60 hover:bg-emerald-800/80 border border-emerald-800 text-yellow-300 font-bold transition active:scale-95"
          >
            <span className="flex items-center space-x-1.5">
              <span>📋</span>
              <span>{t.settings.checkRules}</span>
            </span>
            <span>➔</span>
          </button>

          {/* Invite link button */}
          {peerId && (
            <button
              type="button"
              data-testid="settings-copy-invite-button"
              onClick={handleCopyInviteLink}
              className="w-full flex items-center justify-between p-2.5 rounded-2xl bg-emerald-900/60 hover:bg-emerald-800/80 border border-emerald-800 text-emerald-200 font-bold transition active:scale-95"
            >
              <span className="flex items-center space-x-1.5">
                <span>🔗</span>
                <span>{copiedLink ? t.app.copied : t.app.inviteLink}</span>
              </span>
              <span>{copiedLink ? '✓' : '📋'}</span>
            </button>
          )}

          {/* Leave Room button */}
          {onLeaveRoom && (
            <button
              type="button"
              data-testid="leave-room-button"
              onClick={() => {
                onClose();
                onLeaveRoom();
              }}
              className="w-full flex items-center justify-center space-x-1.5 p-2.5 rounded-2xl bg-red-950/80 hover:bg-red-900/80 border border-red-700 text-red-300 font-bold transition active:scale-95"
            >
              <span>🚪</span>
              <span>{t.settings.leaveRoom}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
