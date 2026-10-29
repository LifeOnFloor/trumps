import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { I18nProvider, useTranslation } from '../../src/i18n/context.js';
import { LanguageSelector } from '../../src/ui/components/LanguageSelector.js';

const TestConsumer: React.FC = () => {
  const { t, language } = useTranslation();
  return (
    <div>
      <span data-testid="current-lang">{language}</span>
      <h1 data-testid="app-title">{t.app.title}</h1>
      <span data-testid="play-text">{t.table.play}</span>
    </div>
  );
};

describe('I18n Localization', () => {
  it('デフォルトで日本語がロードされ、言語セレクターは非表示（日本語固定）であること', () => {
    render(
      <I18nProvider>
        <TestConsumer />
        <LanguageSelector />
      </I18nProvider>
    );

    expect(screen.getByTestId('current-lang')).toHaveTextContent('ja');
    expect(screen.getByTestId('play-text')).toHaveTextContent('出す');
    expect(screen.queryByTestId('language-selector')).not.toBeInTheDocument();
  });

  it('言語セレクター有効時（forceShow）にEnglishを選択すると英語に切り替わること', () => {
    render(
      <I18nProvider>
        <TestConsumer />
        <LanguageSelector forceShow />
      </I18nProvider>
    );

    const select = screen.getByTestId('language-select');
    fireEvent.change(select, { target: { value: 'en' } });
    expect(screen.getByTestId('current-lang')).toHaveTextContent('en');
    expect(screen.getByTestId('play-text')).toHaveTextContent('Play');

    // Switch back to ja
    fireEvent.change(select, { target: { value: 'ja' } });
    expect(screen.getByTestId('current-lang')).toHaveTextContent('ja');
    expect(screen.getByTestId('play-text')).toHaveTextContent('出す');
  });
});
