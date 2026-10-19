import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import {
  isAudioMuted,
  setAudioMuted,
  triggerHaptic,
  playTapSound,
  playCardPlaySound,
  playPassSound,
  playEightCutSound,
  playRevolutionSound,
} from '../../src/ui/utils/sound.js';
import { PlayerHand } from '../../src/ui/components/PlayerHand.js';
import { I18nProvider } from '../../src/i18n/context.js';
import { LobbyScreen } from '../../src/ui/screens/LobbyScreen.js';

describe('Sound and Haptics Module', () => {
  beforeEach(() => {
    setAudioMuted(false);
  });

  it('allows toggling mute state and reading back', () => {
    expect(isAudioMuted()).toBe(false);
    setAudioMuted(true);
    expect(isAudioMuted()).toBe(true);
    setAudioMuted(false);
    expect(isAudioMuted()).toBe(false);
  });

  it('executes sound generators safely without throwing errors in headless/jsdom environment', () => {
    expect(() => playTapSound()).not.toThrow();
    expect(() => playCardPlaySound()).not.toThrow();
    expect(() => playPassSound()).not.toThrow();
    expect(() => playEightCutSound()).not.toThrow();
    expect(() => playRevolutionSound()).not.toThrow();
  });

  it('triggers navigator.vibrate when available', () => {
    const vibrateSpy = vi.fn();
    (globalThis as any).navigator.vibrate = vibrateSpy;

    triggerHaptic(20);
    expect(vibrateSpy).toHaveBeenCalledWith(20);

    triggerHaptic([10, 20, 10]);
    expect(vibrateSpy).toHaveBeenCalledWith([10, 20, 10]);
  });
});

describe('PlayerHand Touch Slide Selection', () => {
  const mockCards = [
    { id: 'S_3', suit: 'spade' as const, rank: 3 as const, isJoker: false as const },
    { id: 'H_3', suit: 'heart' as const, rank: 3 as const, isJoker: false as const },
    { id: 'D_3', suit: 'diamond' as const, rank: 3 as const, isJoker: false as const },
  ];

  it('renders cards with data-card-id and allows click selection', () => {
    const onToggleSelect = vi.fn();
    render(
      <PlayerHand
        cards={mockCards}
        selectedCardIds={['S_3']}
        onToggleSelect={onToggleSelect}
      />
    );

    const card = screen.getByTestId('card-H_3');
    fireEvent.click(card);
    expect(onToggleSelect).toHaveBeenCalledWith('H_3');
  });

  it('does not select cards on touch slide to prevent accidental selection during scroll', () => {
    const onToggleSelect = vi.fn();
    render(
      <PlayerHand
        cards={mockCards}
        selectedCardIds={[]}
        onToggleSelect={onToggleSelect}
      />
    );

    const handContainer = screen.getByTestId('player-hand');

    fireEvent.touchStart(handContainer);
    fireEvent.touchMove(handContainer, {
      touches: [{ clientX: 100, clientY: 200 }],
    });
    fireEvent.touchEnd(handContainer);

    expect(onToggleSelect).not.toHaveBeenCalled();
  });
});

describe('Sound Mute Toggle UI', () => {
  it('toggles sound mute state on click in LobbyScreen', () => {
    setAudioMuted(false);
    render(
      <I18nProvider>
        <LobbyScreen
          isHost={false}
          peerId=""
          players={[]}
          error={null}
          onStartHost={vi.fn()}
          onJoinClient={vi.fn()}
          onStartGame={vi.fn()}
        />
      </I18nProvider>
    );

    const soundBtn = screen.getByTestId('sound-toggle-button');
    expect(soundBtn).toHaveTextContent('🔊');

    fireEvent.click(soundBtn);
    expect(soundBtn).toHaveTextContent('🔇');
    expect(isAudioMuted()).toBe(true);

    fireEvent.click(soundBtn);
    expect(soundBtn).toHaveTextContent('🔊');
    expect(isAudioMuted()).toBe(false);
  });
});
