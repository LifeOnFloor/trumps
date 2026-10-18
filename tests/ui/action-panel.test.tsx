import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { ActionPanel } from '../../src/ui/components/ActionPanel.js';

describe('ActionPanel Component', () => {
  it('自分の手番でない場合、PLAY/PASSボタンが共に disabled であること', () => {
    render(
      <ActionPanel
        isMyTurn={false}
        canPlay={true}
        canPass={true}
        onPlay={vi.fn()}
        onPass={vi.fn()}
      />
    );

    const playBtn = screen.getByTestId('play-button');
    const passBtn = screen.getByTestId('pass-button');

    expect(playBtn).toBeDisabled();
    expect(passBtn).toBeDisabled();
  });

  it('自分の手番時、合法手が選択されていない時は PLAY ボタンが disabled であること', () => {
    render(
      <ActionPanel
        isMyTurn={true}
        canPlay={false}
        canPass={true}
        onPlay={vi.fn()}
        onPass={vi.fn()}
      />
    );

    const playBtn = screen.getByTestId('play-button');
    const passBtn = screen.getByTestId('pass-button');

    expect(playBtn).toBeDisabled();
    expect(passBtn).not.toBeDisabled();
  });

  it('合法手が選択された瞬間に PLAY ボタンが押下可能になること', () => {
    const handlePlay = vi.fn();
    const { rerender } = render(
      <ActionPanel
        isMyTurn={true}
        canPlay={false}
        canPass={true}
        onPlay={handlePlay}
        onPass={vi.fn()}
      />
    );

    const playBtn = screen.getByTestId('play-button');
    expect(playBtn).toBeDisabled();

    // Player selects valid cards
    rerender(
      <ActionPanel
        isMyTurn={true}
        canPlay={true}
        canPass={true}
        onPlay={handlePlay}
        onPass={vi.fn()}
      />
    );

    expect(playBtn).not.toBeDisabled();
    fireEvent.click(playBtn);
    expect(handlePlay).toHaveBeenCalledTimes(1);
  });
});
