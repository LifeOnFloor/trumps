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
  it('デフォルトで日本語がロードされ、タイトルやラベルが日本語で表示されること', () => {
    render(
      <I18nProvider>
        <TestConsumer />
        <LanguageSelector />
      </I18nProvider>
    );

    expect(screen.getByTestId('current-lang')).toHaveTextContent('ja');
    expect(screen.getByTestId('play-text')).toHaveTextContent('出す (PLAY)');
  });

  it('言語セレクターでEnglishをクリックすると英語に切り替わること', () => {
    render(
      <I18nProvider>
        <TestConsumer />
        <LanguageSelector />
      </I18nProvider>
    );

    fireEvent.click(screen.getByTestId('lang-en'));
    expect(screen.getByTestId('current-lang')).toHaveTextContent('en');
    expect(screen.getByTestId('play-text')).toHaveTextContent('PLAY');

    // Switch back to ja
    fireEvent.click(screen.getByTestId('lang-ja'));
    expect(screen.getByTestId('current-lang')).toHaveTextContent('ja');
    expect(screen.getByTestId('play-text')).toHaveTextContent('出す (PLAY)');
  });
});
