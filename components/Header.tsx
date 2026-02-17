import React from 'react';

interface Props {
  darkMode: boolean;
  toggleTheme: () => void;
  onOpenKey?: () => void;
}

export const Header: React.FC<Props> = ({ darkMode, toggleTheme, onOpenKey }) => {
  return (
    <header className="flex flex-col items-center justify-center py-6 md:py-10 bg-paper dark:bg-stone-950 border-b border-stone-200 dark:border-stone-800 transition-colors duration-300 relative">
      <div className="absolute right-4 top-4 md:right-8 md:top-8 flex items-center gap-2">
        {onOpenKey && (
          <button
            onClick={onOpenKey}
            className="p-2 rounded-full text-stone-500 hover:text-japanRed dark:text-stone-400 dark:hover:text-japanRed transition-colors focus:outline-none bg-white dark:bg-stone-800 shadow-sm border border-stone-100 dark:border-stone-700"
            aria-label="API Key Settings"
            title="Switch API Key"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </button>
        )}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-full text-stone-500 hover:text-japanRed dark:text-stone-400 dark:hover:text-japanRed transition-colors focus:outline-none bg-white dark:bg-stone-800 shadow-sm border border-stone-100 dark:border-stone-700"
          aria-label="Toggle Dark Mode"
        >
          {darkMode ? (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
        </button>
      </div>
      
      <div className="flex items-center space-x-2 md:space-x-3 mb-1 md:mb-2">
        <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-japanRed shadow-md" />
        <h1 className="text-2xl md:text-3xl font-bold font-artistic tracking-widest text-japanBlack dark:text-stone-100 transition-colors">
          NIHONGO MASTER
        </h1>
      </div>
      <p className="text-stone-500 dark:text-stone-400 font-sans text-xs md:text-sm tracking-wide uppercase text-center px-4 transition-colors">
        AI-Powered Cultural Translator
      </p>
    </header>
  );
};