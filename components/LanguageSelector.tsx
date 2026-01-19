import React from 'react';
import { SUPPORTED_LANGUAGES } from '../constants';

interface Props {
  selected: string;
  onChange: (code: string) => void;
}

export const LanguageSelector: React.FC<Props> = ({ selected, onChange }) => {
  return (
    <div className="relative inline-block w-full">
      <label className="block text-xs font-bold text-stone-400 dark:text-stone-500 uppercase mb-1 tracking-wider">
        Source Language
      </label>
      <select
        value={selected}
        onChange={(e) => onChange(e.target.value)}
        className="block w-full px-4 py-3 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-stone-700 dark:text-stone-200 text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-japanRed focus:border-transparent appearance-none cursor-pointer shadow-sm transition-colors truncate pr-8"
      >
        {SUPPORTED_LANGUAGES.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.flag} {lang.name}
          </option>
        ))}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 pt-6 text-stone-500">
        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
          <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
        </svg>
      </div>
    </div>
  );
};