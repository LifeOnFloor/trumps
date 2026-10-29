import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { LobbyScreen } from '../../src/ui/screens/LobbyScreen.js';

describe('LobbyScreen Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('初期画面で大富豪が選択可能で、他のゲームにComing Soonバッジが表示されること', () => {
    render(
      <LobbyScreen
        isHost={false}
        peerId=""
        players={[]}
        error={null}
        onStartHost={vi.fn()}
        onJoinClient={vi.fn()}
        onStartGame={vi.fn()}
      />
    );

    expect(screen.getByText('大富豪')).toBeInTheDocument();
    expect(screen.getByText('ババ抜き')).toBeInTheDocument();
    expect(screen.getAllByText('Coming Soon').length).toBeGreaterThan(0);
  });

  it('部屋を作るボタンを押すとホスト画面へ遷移し、ルールプリセットやチップ対戦トグルが表示されること', () => {
    const handleStartHost = vi.fn();
    render(
      <LobbyScreen
        isHost={true}
        peerId="host-123"
        players={[{ id: 'p1', name: 'Host' }]}
        error={null}
        onStartHost={handleStartHost}
        onJoinClient={vi.fn()}
        onStartGame={vi.fn()}
      />
    );

    // Click "部屋を作る"
    fireEvent.click(screen.getByText(/部屋を作る/));
    expect(handleStartHost).toHaveBeenCalledTimes(1);

    // In Host screen, verify presets & chips mode
    expect(screen.getByTestId('chips-mode-row')).toBeInTheDocument();
    expect(screen.getByText('スタンダード')).toBeInTheDocument();
    expect(screen.getByText('ローカル全盛り')).toBeInTheDocument();
    expect(screen.getByText('シンプル')).toBeInTheDocument();
  });

  it('チップ対戦モードトグルを切り替えると onUpdateConfig が呼ばれること', () => {
    const handleUpdateConfig = vi.fn();
    render(
      <LobbyScreen
        isHost={true}
        peerId="host-123"
        players={[{ id: 'p1', name: 'Host' }]}
        error={null}
        onStartHost={vi.fn()}
        onJoinClient={vi.fn()}
        onUpdateConfig={handleUpdateConfig}
        onStartGame={vi.fn()}
      />
    );

    // Switch to host view
    fireEvent.click(screen.getByText(/部屋を作る/));

    const toggle = screen.getByTestId('chips-mode-toggle');
    fireEvent.click(toggle);

    expect(handleUpdateConfig).toHaveBeenCalled();
    const updatedConfig = handleUpdateConfig.mock.calls[0][0];
    expect(updatedConfig.chipsMode).toBe(true);
  });

  it('ルールボタンをクリックするとルール確認モーダルが開くこと', () => {
    render(
      <LobbyScreen
        isHost={false}
        peerId=""
        players={[]}
        error={null}
        onStartHost={vi.fn()}
        onJoinClient={vi.fn()}
        onStartGame={vi.fn()}
      />
    );

    fireEvent.click(screen.getByTestId('open-rules-button'));
    expect(screen.getByTestId('rules-modal')).toBeInTheDocument();
    expect(screen.getByText('現在のルール設定')).toBeInTheDocument();
  });

  it('神経衰弱選択時は一人で遊ぶと対戦するが分離され、他ゲーム選択肢が表示されないこと', () => {
    const handleStartSolo = vi.fn();
    const handleStartHost = vi.fn();

    render(
      <LobbyScreen
        isHost={false}
        peerId=""
        players={[]}
        error={null}
        onStartHost={handleStartHost}
        onJoinClient={vi.fn()}
        onStartGame={vi.fn()}
        onStartSinglePlayerGame={handleStartSolo}
      />
    );

    // Select memory game
    fireEvent.click(screen.getByText('神経衰弱'));

    // "一人で遊ぶ" and "オンラインで対戦する" should be present
    expect(screen.getByText('一人で遊ぶ')).toBeInTheDocument();
    expect(screen.getByTestId('play-memory-solo-button')).toBeInTheDocument();
    expect(screen.getByText('オンラインで対戦する（1〜6人）')).toBeInTheDocument();
    expect(screen.getByTestId('create-room-button')).toBeInTheDocument();
    expect(screen.getByTestId('join-room-button')).toBeInTheDocument();

    // Klondike button should NOT be present
    expect(screen.queryByTestId('quick-solitaire-button')).not.toBeInTheDocument();

    // Clicking solo button calls onStartSinglePlayerGame with shinkei-suijaku
    fireEvent.click(screen.getByTestId('play-memory-solo-button'));
    expect(handleStartSolo).toHaveBeenCalledWith('shinkei-suijaku');
  });

  it('神経衰弱でホスト画面に入ると大富豪用設定は非表示で、神経衰弱ルールが表示され1人以上で開始可能であること', () => {
    const handleStartGame = vi.fn();

    render(
      <LobbyScreen
        isHost={true}
        peerId="host-memory-1"
        players={[{ id: 'p1', name: 'Player 1' }]}
        error={null}
        onStartHost={vi.fn()}
        onJoinClient={vi.fn()}
        onStartGame={handleStartGame}
      />
    );

    // Select memory game then create room
    fireEvent.click(screen.getByText('神経衰弱'));
    fireEvent.click(screen.getByTestId('create-room-button'));

    // Memory rules explanation should be displayed
    expect(screen.getByText('神経衰弱 ルール案内')).toBeInTheDocument();
    expect(screen.queryByTestId('chips-mode-row')).not.toBeInTheDocument();

    // Should indicate 1 person minimum to start
    expect(screen.getByText('1人以上で開始可能')).toBeInTheDocument();

    // Start button should be enabled with 1 player
    const startButton = screen.getByRole('button', { name: /神経衰弱を開始する/ });
    expect(startButton).toBeEnabled();

    fireEvent.click(startButton);
    expect(handleStartGame).toHaveBeenCalledTimes(1);
  });
});
