import React, { useEffect, useState } from 'react';
import type { GameEvent } from '../../core/types/engine.js';

export interface EventBannerProps {
  events: readonly GameEvent[];
}

export const EventBanner: React.FC<EventBannerProps> = ({ events }) => {
  const [activeMessage, setActiveMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!events || events.length === 0) return;

    for (const event of events) {
      if (event.type === 'EIGHT_CUT') {
        setActiveMessage('8切り！場が流れました');
        break;
      } else if (event.type === 'REVOLUTION') {
        setActiveMessage('革命発生！強さが逆転しました');
        break;
      } else if (event.type === 'SPADE_THREE_RETURN') {
        setActiveMessage('スペ3返し！ジョーカーが破られました');
        break;
      } else if (event.type === 'FOUL_FINISH') {
        setActiveMessage('反則上がり！失格（最下位）です');
        break;
      }
    }

    const timer = setTimeout(() => {
      setActiveMessage(null);
    }, 2500);

    return () => clearTimeout(timer);
  }, [events]);

  if (!activeMessage) return null;

  return (
    <div
      data-testid="event-banner"
      className="fixed top-12 left-1/2 -translate-x-1/2 z-50 px-6 py-2.5 rounded-full bg-amber-500 text-gray-900 font-extrabold text-sm sm:text-base shadow-2xl ring-4 ring-amber-300 animate-bounce"
    >
      {activeMessage}
    </div>
  );
};
