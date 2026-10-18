import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { GameSelector } from '../../src/ui/components/GameSelector.js';
import { I18nProvider } from '../../src/i18n/context.js';

describe('GameSelector Component', () => {
  const renderWithI18n = (ui: React.ReactElement, initialLanguage: 'ja' | 'en' = 'ja') => {
    return render(
      <I18nProvider initialLanguage={initialLanguage}>
        {ui}
      </I18nProvider>
    );
  };

  it('初期レンダリングで検索バー、カテゴリ、ゲームカードが表示されること', () => {
    renderWithI18n(
      <GameSelector selectedGameId="daifugo" onSelectGame={vi.fn()} />
    );

    expect(screen.getByPlaceholderText(/ゲーム名、ルール、タグで検索/)).toBeInTheDocument();
    expect(screen.getByText('大富豪')).toBeInTheDocument();
    expect(screen.getByText('PLAYABLE')).toBeInTheDocument();
  });

  it('検索バーに入力するとインクリメンタル検索でゲームが絞り込まれること', () => {
    renderWithI18n(
      <GameSelector selectedGameId="daifugo" onSelectGame={vi.fn()} />
    );

    const input = screen.getByPlaceholderText(/ゲーム名、ルール、タグで検索/);
    fireEvent.change(input, { target: { value: 'ブラックジャック' } });

    expect(screen.getByText('ブラックジャック')).toBeInTheDocument();
    expect(screen.queryByText('大富豪')).not.toBeInTheDocument();
  });

  it('カテゴリタブをクリックすると、該当カテゴリのゲームに絞り込まれること', () => {
    renderWithI18n(
      <GameSelector selectedGameId="daifugo" onSelectGame={vi.fn()} />
    );

    // トリックテイキングを選択
    const trickTakingButton = screen.getByText('トリックテイキング');
    fireEvent.click(trickTakingButton);

    expect(screen.getByText('ナポレオン')).toBeInTheDocument();
    expect(screen.getByText('ハーツ')).toBeInTheDocument();
    expect(screen.queryByText('大富豪')).not.toBeInTheDocument();
  });

  it('詳細ボタンを押すと詳細モーダルが開き、閉じるボタンで閉じられること', () => {
    renderWithI18n(
      <GameSelector selectedGameId="daifugo" onSelectGame={vi.fn()} />
    );

    // 大富豪の詳細ボタンをクリック
    const detailButtons = screen.getAllByText(/詳細/);
    fireEvent.click(detailButtons[0]);

    // モーダルが開いていること
    expect(screen.getByTestId('game-detail-modal')).toBeInTheDocument();
    expect(screen.getByText('ルール概要:')).toBeInTheDocument();

    // 閉じるボタン (✕)
    const closeBtn = screen.getByText('✕');
    fireEvent.click(closeBtn);

    expect(screen.queryByTestId('game-detail-modal')).not.toBeInTheDocument();
  });

  it('ゲームカードをクリックすると onSelectGame がコールされること', () => {
    const handleSelectGame = vi.fn();
    renderWithI18n(
      <GameSelector selectedGameId="daifugo" onSelectGame={handleSelectGame} />
    );

    const daifugoCard = screen.getByTestId('game-card-daifugo');
    fireEvent.click(daifugoCard);

    expect(handleSelectGame).toHaveBeenCalledWith('daifugo');
  });

  it('英語モードで表示した際に英語タイトルが表示されること', () => {
    renderWithI18n(
      <GameSelector selectedGameId="daifugo" onSelectGame={vi.fn()} />,
      'en'
    );

    expect(screen.getByText('Daifugo (President)')).toBeInTheDocument();
    expect(screen.getByText('Trick-Taking')).toBeInTheDocument();
  });
});
