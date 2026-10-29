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

  it('1人プレイと2人対戦モードの切り替えができること', () => {
    const handleBack = vi.fn();
    render(<ShinkeiSuijakuScreen onBackToLobby={handleBack} />);

    const switchButton = screen.getByRole('button', { name: /2人対戦/ });
    fireEvent.click(switchButton);

    expect(screen.getByText(/プレイヤー 1/)).toBeInTheDocument();
    expect(screen.getByText(/プレイヤー 2/)).toBeInTheDocument();
  });
});
