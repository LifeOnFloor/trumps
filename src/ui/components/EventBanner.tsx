import React, { useEffect, useState } from 'react';
import type { GameEvent } from '../../core/types/engine.js';
import { useTranslation } from '../../i18n/context.js';

export interface EventBannerProps {
  events: readonly GameEvent[];
  players?: readonly { id: string; name: string }[];
}

export const EventBanner: React.FC<EventBannerProps> = ({ events, players }) => {
  const { t, language } = useTranslation();
  const [activeMessage, setActiveMessage] = useState<{ text: string; isAlert?: boolean } | null>(null);

  useEffect(() => {
    if (!events || events.length === 0) return;

    for (const event of events) {
      if (event.type === 'EIGHT_CUT') {
        setActiveMessage({ text: t.events.eightCut });
        break;
      } else if (event.type === 'ELEVEN_BACK') {
        setActiveMessage({
          text: language === 'en' ? '⚡ 11-Back! Reversed strength' : '11バック発動！一時的に強さが逆転しました',
          isAlert: true,
        });
        break;
      } else if (event.type === 'SANDSTORM') {
        setActiveMessage({
          text: language === 'en' ? '🌪️ Sandstorm! Instant revolution' : '🌪️ 砂嵐！場を支配し革命が発動しました',
          isAlert: true,
        });
        break;
      } else if (event.type === 'MIYAKO_OCHI') {
        setActiveMessage({
          text: language === 'en' ? '👑 Capital Fall! Reigning champion drops' : '👑 都落ち！前大富豪が失格・最下位に転落しました',
          isAlert: true,
        });
        break;
      } else if (event.type === 'GEKOKUJO') {
        setActiveMessage({
          text: language === 'en' ? '⚔️ Bottom Uprising! Rankings inverted' : '⚔️ 下剋上！大貧民が1位となり順位が完全逆転しました',
          isAlert: true,
        });
        break;
      } else if (event.type === 'NINE_REVERSE') {
        setActiveMessage({
          text: language === 'en' ? '🔄 9-Reverse! Turn order reversed' : '🔄 9リバース！回り順が逆転しました',
        });
        break;
      } else if (event.type === 'NINE_REVOLUTION') {
        setActiveMessage({
          text: language === 'en' ? '⚡ 9-Revolution! Reversed strength' : '⚡ 9革命！一時的に強さが逆転しました',
          isAlert: true,
        });
        break;
      } else if (event.type === 'FIVE_SKIP') {
        setActiveMessage({
          text: language === 'en' ? '⏭️ 5-Skip! Turns skipped' : '⏭️ 5スキップ！手番がスキップされました',
        });
        break;
      } else if (event.type === 'SUIT_LOCKED') {
        setActiveMessage({
          text: language === 'en' ? '🔒 Suit Lock! Same suit only' : '🔒 スート縛り！同じスートしか出せません',
          isAlert: true,
        });
        break;
      } else if (event.type === 'SEQUENCE_LOCKED') {
        setActiveMessage({
          text: language === 'en' ? '🔢 Sequence Lock! Sequential numbers only' : '🔢 連番縛り！連続する数字しか出せません',
          isAlert: true,
        });
        break;
      } else if (event.type === 'REVOLUTION') {
        setActiveMessage({ text: t.events.revolution, isAlert: true });
        break;
      } else if (event.type === 'SPADE_THREE_RETURN') {
        setActiveMessage({ text: t.events.spadeThreeReturn, isAlert: true });
        break;
      } else if (event.type === 'FOUL_FINISH') {
        setActiveMessage({ text: t.events.foulFinish, isAlert: true });
        break;
      } else if (event.type === 'PLAYER_JOINED') {
        const payload = event.payload as any;
        const name = payload?.player?.name ?? (language === 'en' ? 'Player' : 'プレイヤー');
        setActiveMessage({
          text: language === 'en' ? `🎉 ${name} joined the room!` : `🎉 ${name} さんが参加しました！`,
        });
        break;
      } else if (event.type === 'PLAYER_DISCONNECTED') {
        const payload = event.payload as any;
        const resolvedName =
          payload?.playerName ??
          players?.find((p) => p.id === payload?.playerId)?.name;
        const nameText = resolvedName
          ? language === 'en'
            ? resolvedName
            : `${resolvedName} さん`
          : language === 'en'
          ? 'Player'
          : 'プレイヤー';
        setActiveMessage({
          text: language === 'en' ? `⚠️ ${nameText} disconnected` : `⚠️ ${nameText}が切断・離脱しました`,
          isAlert: true,
        });
        break;
      } else if (event.type === 'GAME_OVER_INSUFFICIENT_PLAYERS') {
        setActiveMessage({
          text: language === 'en' ? '⚠️ Not enough players. Game ended.' : '⚠️ 人数不足のためゲームを終了しました',
          isAlert: true,
        });
        break;
      }
    }

    const timer = setTimeout(() => {
      setActiveMessage(null);
    }, 3500);

    return () => clearTimeout(timer);
  }, [events, players, t, language]);

  if (!activeMessage) return null;

  return (
    <div
      data-testid="event-banner"
      className="fixed top-12 left-1/2 -translate-x-1/2 z-50 pointer-events-none transition-all duration-300 animate-in fade-in slide-in-from-top-4"
    >
      <div
        className={`px-5 py-2.5 rounded-full font-black text-sm tracking-wide shadow-2xl flex items-center space-x-2 border ${
          activeMessage.isAlert
            ? 'bg-amber-500 text-gray-950 border-yellow-300 ring-2 ring-yellow-400'
            : 'bg-emerald-800 text-white border-emerald-400'
        }`}
      >
        <span>{activeMessage.text}</span>
      </div>
    </div>
  );
};
