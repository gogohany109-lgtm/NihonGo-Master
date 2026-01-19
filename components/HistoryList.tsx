import React from 'react';
import { HistoryItem } from '../types';

interface Props {
  history: HistoryItem[];
  title?: string;
  onSelect: (item: HistoryItem) => void;
  onClear?: () => void;
  onDelete?: (id: string) => void;
  onExport?: () => void;
  onImport?: () => void;
}

export const HistoryList: React.FC<Props> = ({ 
  history, 
  title = "Recent Translations", 
  onSelect, 
  onClear, 
  onDelete,
  onExport,
  onImport
}) => {
  if (history.length === 0 && !onImport) {
      if (!onClear && !onDelete) return null; // Don't render empty recent list
      return (
        <div className="mt-10 md:mt-16 text-center animate-fade-in border-t border-stone-200 dark:border-stone-800 pt-8">
            <h3 className="text-stone-400 dark:text-stone-500 text-xs md:text-sm uppercase tracking-widest font-bold mb-4">{title}</h3>
            <p className="text-stone-400 dark:text-stone-500 text-sm italic">No items found.</p>
            {onImport && (
               <button
                 onClick={onImport}
                 className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider text-japanRed dark:text-red-400 border border-japanRed/20 dark:border-red-400/20 rounded-lg hover:bg-japanRed/5 transition-colors"
               >
                 <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                 </svg>
                 Import Saved Data
               </button>
            )}
        </div>
      );
  }

  return (
    <div className="mt-10 md:mt-16 animate-fade-in border-t border-stone-200 dark:border-stone-800 pt-8 transition-colors">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-6 px-2 gap-4 sm:gap-0">
        <h3 className="text-stone-400 dark:text-stone-500 text-xs md:text-sm uppercase tracking-widest font-bold">
          {title}
        </h3>
        <div className="flex items-center gap-4">
          {onImport && (
            <button
              onClick={onImport}
              className="flex items-center gap-1 text-xs text-stone-400 hover:text-japanRed dark:text-stone-500 dark:hover:text-red-400 transition-colors font-medium"
              title="Import from JSON file"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Import
            </button>
          )}
          {onExport && history.length > 0 && (
            <button
              onClick={onExport}
              className="flex items-center gap-1 text-xs text-stone-400 hover:text-japanRed dark:text-stone-500 dark:hover:text-red-400 transition-colors font-medium"
              title="Download collection as JSON"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export JSON
            </button>
          )}
          {onClear && history.length > 0 && (
            <button
              onClick={onClear}
              className="flex items-center gap-1 text-xs text-stone-400 hover:text-japanRed dark:text-stone-500 dark:hover:text-red-400 transition-colors font-medium"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Clear
            </button>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {history.map((item) => (
          <div
            key={item.id}
            className="relative bg-white dark:bg-stone-800 rounded-xl border border-stone-100 dark:border-stone-700 shadow-sm hover:shadow-md hover:border-stone-200 dark:hover:border-stone-600 transition-all duration-200 group flex flex-col h-full overflow-hidden"
          >
            {onDelete && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete(item.id);
                    }}
                    className="absolute top-2 right-2 p-1.5 rounded-full text-stone-300 dark:text-stone-600 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/30 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all z-10"
                    title="Remove"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            )}

            <button
                onClick={() => onSelect(item)}
                className="text-left p-4 flex flex-col h-full w-full"
            >
                <div className="mb-2 pr-6">
                    <p className="font-japanese text-xl font-medium text-japanBlack dark:text-white truncate group-hover:text-japanRed dark:group-hover:text-red-400 transition-colors">
                    {item.result.japanese}
                    </p>
                    <p className="text-xs text-stone-400 dark:text-stone-500 font-mono truncate">
                    {item.result.romaji}
                    </p>
                </div>
                
                <div className="mt-auto pt-2 border-t border-stone-50 dark:border-stone-700 w-full">
                    <p className="text-sm text-stone-600 dark:text-stone-400 line-clamp-2 italic">
                    "{item.originalText}"
                    </p>
                </div>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};