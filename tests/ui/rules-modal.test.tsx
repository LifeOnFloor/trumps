import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { RulesModal } from '../../src/ui/components/RulesModal.js';
import { DEFAULT_DAIFUGO_CONFIG } from '../../src/core/rules/daifugo/config.js';

describe('RulesModal Component', () => {
  it('isOpen: false の時は何も描画されないこと', () => {
    const { container } = render(
      <RulesModal
        isOpen={false}
        config={DEFAULT_DAIFUGO_CONFIG}
        onClose={vi.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('isOpen: true の時、ルール一覧が表示されること', () => {
    render(
      <RulesModal
        isOpen={true}
        config={DEFAULT_DAIFUGO_CONFIG}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByTestId('rules-modal')).toBeInTheDocument();
    expect(screen.getByText('現在のルール設定')).toBeInTheDocument();
    expect(screen.getByText('8切り')).toBeInTheDocument();
    expect(screen.getByText('革命')).toBeInTheDocument();
  });

  it('閉じるボタンを押すと onClose が呼ばれること', () => {
    const handleClose = vi.fn();
    render(
      <RulesModal
        isOpen={true}
        config={DEFAULT_DAIFUGO_CONFIG}
        onClose={handleClose}
      />
    );

    fireEvent.click(screen.getByTestId('close-rules-button'));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('gameId: shinkei-suijaku の時、神経衰弱のルールが表示され大富豪ルールが表示されないこと', () => {
    render(
      <RulesModal
        isOpen={true}
        gameId="shinkei-suijaku"
        onClose={vi.fn()}
      />
    );

    expect(screen.getByTestId('rules-modal')).toBeInTheDocument();
    expect(screen.getByText(/神経衰弱/)).toBeInTheDocument();
    expect(screen.getByText(/ペア成立/)).toBeInTheDocument();
    expect(screen.queryByText('8切り')).not.toBeInTheDocument();
  });

  it('gameId: klondike の時、ソリティアのルールが表示されること', () => {
    render(
      <RulesModal
        isOpen={true}
        gameId="klondike"
        onClose={vi.fn()}
      />
    );

    expect(screen.getByTestId('rules-modal')).toBeInTheDocument();
    expect(screen.getByText(/ソリティア|クロンダイク/)).toBeInTheDocument();
    expect(screen.getAllByText(/組札/).length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText('8切り')).not.toBeInTheDocument();
  });

  it('gameId: old-maid など他ゲームの時、そのゲームの概要・ルールが表示されること', () => {
    render(
      <RulesModal
        isOpen={true}
        gameId="old-maid"
        onClose={vi.fn()}
      />
    );

    expect(screen.getByTestId('rules-modal')).toBeInTheDocument();
    expect(screen.getByText(/ババ抜き/)).toBeInTheDocument();
    expect(screen.queryByText('8切り')).not.toBeInTheDocument();
  });
});
