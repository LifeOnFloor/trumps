import React from 'react';
import { useTranslation } from '../../i18n/context.js';

export const LanguageSelector: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { language, setLanguage } = useTranslation();

  return (
    <div
      data-testid="language-selector"
      className={`inline-flex items-center p-1 rounded-full bg-emerald-950/80 border border-emerald-700/80 shadow-sm ${className}`}
    >
      <button
        type="button"
        data-testid="lang-ja"
        onClick={() => setLanguage('ja')}
        className={`px-2.5 py-1 rounded-full text-xs font-black transition-all ${
          language === 'ja'
            ? 'bg-yellow-400 text-gray-950 shadow-sm'
            : 'text-gray-300 hover:text-white'
        }`}
      >
        🇯🇵 日本語
      </button>
      <button
        type="button"
        data-testid="lang-en"
        onClick={() => setLanguage('en')}
        className={`px-2.5 py-1 rounded-full text-xs font-black transition-all ${
          language === 'en'
            ? 'bg-yellow-400 text-gray-950 shadow-sm'
            : 'text-gray-300 hover:text-white'
        }`}
      >
        🇺🇸 English
      </button>
    </div>
  );
};
