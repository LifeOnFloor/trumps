import React from 'react';
import { useTranslation } from '../../i18n/context.js';
import type { Language } from '../../i18n/types.js';

interface LanguageOption {
  code: Language;
  label: string;
}

const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'ja', label: '日本語' },
  { code: 'en', label: 'English' },
];

export const LanguageSelector: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { language, setLanguage } = useTranslation();

  return (
    <div
      data-testid="language-selector"
      className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-emerald-950/80 border border-emerald-700/80 shadow-sm text-xs ${className}`}
    >
      <span className="text-emerald-400 select-none text-xs">🌐</span>
      <select
        data-testid="language-select"
        value={language}
        onChange={(e) => setLanguage(e.target.value as Language)}
        className="bg-transparent text-emerald-200 font-bold text-xs focus:outline-none cursor-pointer pr-1"
        aria-label="Language"
      >
        {SUPPORTED_LANGUAGES.map((lang) => (
          <option
            key={lang.code}
            value={lang.code}
            data-testid={`lang-${lang.code}`}
            className="bg-emerald-950 text-white font-medium"
          >
            {lang.label}
          </option>
        ))}
      </select>
    </div>
  );
};
