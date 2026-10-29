import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { ShinkeiSuijakuScreen } from '../../src/ui/screens/ShinkeiSuijakuScreen.js';

describe('ShinkeiSuijakuScreen Component', () => {
  it('初期レンダリングでタイトル、52枚のカード、スコアが表示されること', () => {
    const handleBack = vi.fn();
    render(<ShinkeiSuijakuScreen onBackToLobby={handleBack} />);

    expect(screen.getByText(/神経衰弱/)).toBeInTheDocument();
    expect(screen.getByText(/獲得ペア/)).toBeInTheDocument();
    expect(screen.getByText(/ターン/)).toBeInTheDocument();

    const cards = screen.getAllByTestId(/^memory-card-\d+$/);
    expect(cards.length).toBe(52);
  });

  it('カードをクリックするとめくられること', () => {
    const handleBack = vi.fn();
    render(<ShinkeiSuijakuScreen onBackToLobby={handleBack} />);

    const firstCard = screen.getByTestId('memory-card-0');
    fireEvent.click(firstCard);

    // 1枚目がめくられ、カードの表情報またはアクティブ状態が表示される
    expect(firstCard).toHaveAttribute('data-flipped', 'true');
  });

  it('ロビーへ戻るボタンを押すと onBackToLobby がコールされること', () => {
    const handleBack = vi.fn();
    render(<ShinkeiSuijakuScreen onBackToLobby={handleBack} />);

    const backButton = screen.getByRole('button', { name: /ロビーへ戻る/ });
    fireEvent.click(backButton);

    expect(handleBack).toHaveBeenCalledTimes(1);
  });

  it('リセットボタンを押すとカード状態と手数が初期化されること', () => {
    const handleBack = vi.fn();
    render(<ShinkeiSuijakuScreen onBackToLobby={handleBack} />);

    const firstCard = screen.getByTestId('memory-card-0');
    fireEvent.click(firstCard);
    expect(firstCard).toHaveAttribute('data-flipped', 'true');

    const resetButton = screen.getByRole('button', { name: /リセット/ });
    fireEvent.click(resetButton);

    expect(screen.getByTestId('memory-card-0')).toHaveAttribute('data-flipped', 'false');
  });
});
