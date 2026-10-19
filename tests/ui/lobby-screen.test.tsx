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
    expect(screen.getByText('カジノチップ対戦モード')).toBeInTheDocument();
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
});
