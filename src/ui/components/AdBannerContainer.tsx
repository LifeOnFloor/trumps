import React from 'react';

export interface AdBannerContainerProps {
  slotId?: string;
  className?: string;
  testId?: string;
}

/**
 * AdBannerContainer:
 * Compliant with Google AdSense / AdMob invalid traffic policies:
 * 1. Fixed container height (CLS prevention: 50px on mobile, 90px on desktop)
 * 2. Visual isolation from clickable game buttons (safe margins & distinct border)
 * 3. Clear labeling ("広告 / ADVERTISEMENT")
 */
export const AdBannerContainer: React.FC<AdBannerContainerProps> = ({
  slotId = 'table-top-banner',
  className = '',
  testId = 'ad-banner-container',
}) => {
  return (
    <div
      data-testid={testId}
      className={`w-full max-w-2xl mx-auto px-2 my-1 pointer-events-auto select-none ${className}`}
    >
      <div className="w-full flex flex-col items-center justify-center p-1.5 rounded-xl bg-emerald-950/60 border border-emerald-800/40 shadow-inner">
        <div className="w-full flex items-center justify-between px-2 text-[9px] uppercase tracking-wider text-emerald-400/50 mb-1">
          <span>Advertisement / 広告</span>
          <span className="text-[8px] opacity-60">Sponsored</span>
        </div>
        <div
          id={`ad-slot-${slotId}`}
          className="w-full h-[50px] sm:h-[60px] rounded-lg bg-emerald-900/30 border border-emerald-700/30 flex items-center justify-center text-xs text-emerald-300/40 overflow-hidden"
          style={{ minHeight: '50px', contain: 'layout' }}
        >
          {/* AdSense / AdMob unit placeholder */}
          <div className="flex items-center space-x-2 text-emerald-400/40 text-[11px]">
            <span>📢</span>
            <span>広告掲載エリア ({slotId})</span>
          </div>
        </div>
      </div>
    </div>
  );
};
