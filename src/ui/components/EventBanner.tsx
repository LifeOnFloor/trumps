import React, { useEffect, useState } from 'react';
import type { GameEvent } from '../../core/types/engine.js';

export interface EventBannerProps {
  events: readonly GameEvent[];
  players?: readonly { id: string; name: string }[];
}

export const EventBanner: React.FC<EventBannerProps> = ({ events, players }) => {
  const [activeMessage, setActiveMessage] = useState<{ text: string; isAlert?: boolean } | null>(null);

  useEffect(() => {
    if (!events || events.length === 0) return;

    for (const event of events) {
      if (event.type === 'EIGHT_CUT') {
        setActiveMessage({ text: '8切り！場が流れました' });
        break;
      } else if (event.type === 'ELEVEN_BACK') {
        setActiveMessage({ text: '11バック発動！一時的に強さが逆転しました', isAlert: true });
        break;
      } else if (event.type === 'SANDSTORM') {
        setActiveMessage({ text: '🌪️ 砂嵐！場を支配し革命が発動しました', isAlert: true });
        break;
      } else if (event.type === 'MIYAKO_OCHI') {
        setActiveMessage({ text: '👑 都落ち！前大富豪が失格・最下位に転落しました', isAlert: true });
        break;
      } else if (event.type === 'GEKOKUJO') {
        setActiveMessage({ text: '⚔️ 下剋上！大貧民が1位となり順位が完全逆転しました', isAlert: true });
        break;
      } else if (event.type === 'NINE_REVERSE') {
        setActiveMessage({ text: '🔄 9リバース！回り順が逆転しました' });
        break;
      } else if (event.type === 'NINE_REVOLUTION') {
        setActiveMessage({ text: '⚡ 9革命！一時的に強さが逆転しました', isAlert: true });
        break;
      } else if (event.type === 'FIVE_SKIP') {
        setActiveMessage({ text: '⏭️ 5スキップ！手番がスキップされました' });
        break;
      } else if (event.type === 'SUIT_LOCKED') {
        setActiveMessage({ text: '🔒 スート縛り！同じスートしか出せません', isAlert: true });
        break;
      } else if (event.type === 'SEQUENCE_LOCKED') {
        setActiveMessage({ text: '🔢 連番縛り！連続する数字しか出せません', isAlert: true });
        break;
      } else if (event.type === 'REVOLUTION') {
        setActiveMessage({ text: '革命発生！強さが逆転しました', isAlert: true });
        break;
      } else if (event.type === 'SPADE_THREE_RETURN') {
        setActiveMessage({ text: 'スペ3返し！ジョーカーが破られました', isAlert: true });
        break;
      } else if (event.type === 'FOUL_FINISH') {
        setActiveMessage({ text: '反則上がり！失格（最下位）です', isAlert: true });
        break;
      } else if (event.type === 'PLAYER_JOINED') {
        const payload = event.payload as any;
        const name = payload?.player?.name ?? 'プレイヤー';
        setActiveMessage({ text: `🎉 ${name} さんが参加しました！` });
        break;
      } else if (event.type === 'PLAYER_DISCONNECTED') {
        const payload = event.payload as any;
        const resolvedName =
          payload?.playerName ??
          players?.find((p) => p.id === payload?.playerId)?.name;
        const nameText = resolvedName ? `${resolvedName} さん` : 'プレイヤー';
        setActiveMessage({ text: `⚠️ ${nameText}が切断・離脱しました`, isAlert: true });
        break;
      } else if (event.type === 'GAME_OVER_INSUFFICIENT_PLAYERS') {
        const payload = event.payload as any;
        const msg = payload?.message ?? '人数不足のためゲームを終了しました';
        setActiveMessage({ text: `⚠️ ${msg}`, isAlert: true });
        break;
      }
    }

    const timer = setTimeout(() => {
      setActiveMessage(null);
    }, 2800);

    return () => clearTimeout(timer);
  }, [events]);

  if (!activeMessage) return null;

  return (
    <div
      data-testid="event-banner"
      role="status"
      aria-live="polite"
      className={`fixed top-12 left-1/2 -translate-x-1/2 z-50 px-6 py-2.5 rounded-full font-extrabold text-sm sm:text-base shadow-2xl animate-bounce flex items-center space-x-2 transition-all ${
        activeMessage.isAlert
          ? 'bg-red-600 text-white ring-4 ring-red-400'
          : 'bg-amber-400 text-gray-950 ring-4 ring-amber-300'
      }`}
    >
      <span>{activeMessage.text}</span>
    </div>
  );
};
