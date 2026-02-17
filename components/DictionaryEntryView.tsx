import React from 'react';
import { DictionaryEntry } from '../types';
import { playJapaneseAudio } from '../services/geminiService';

interface Props {
  entry: DictionaryEntry;
  onClose?: () => void;
}

export const DictionaryEntryView: React.FC<Props> = ({ entry, onClose }) => {
  return (
    <div className="bg-white dark:bg-stone-800 rounded-2xl shadow-2xl border border-stone-200 dark:border-stone-700 overflow-hidden animate-fade-in-up">
      {/* Header */}
      <div className="bg-japanRed p-6 text-white relative">
        {onClose && (
          <button onClick={onClose} className="absolute top-4 right-4 text-white/80 hover:text-white">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
        <div className="flex justify-between items-end">
          <div>
            <span className="text-sm font-bold uppercase tracking-widest text-white/70">{entry.reading}</span>
            <h2 className="text-4xl md:text-5xl font-japanese font-bold mt-1">{entry.word}</h2>
            <p className="text-lg opacity-80 font-mono mt-1">{entry.romaji}</p>
          </div>
          <button 
            onClick={() => playJapaneseAudio(entry.word)}
            className="p-3 bg-white/20 hover:bg-white/30 rounded-full transition-all"
          >
            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>

      <div className="p-6 md:p-8 space-y-8">
        {/* Basic Info */}
        <div className="flex flex-wrap gap-3">
          <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigoDye dark:text-indigo-300 rounded-full text-xs font-bold uppercase">
            {entry.partOfSpeech}
          </span>
          {entry.jlptLevel && (
            <span className="px-3 py-1 bg-japanRed/10 text-japanRed dark:text-red-400 rounded-full text-xs font-bold">
              JLPT {entry.jlptLevel}
            </span>
          )}
        </div>

        {/* Meanings */}
        <section>
          <h3 className="text-stone-400 dark:text-stone-500 text-xs font-bold uppercase tracking-widest mb-3">Definitions</h3>
          <ul className="space-y-2">
            {entry.meanings.map((m, i) => (
              <li key={i} className="text-lg text-stone-800 dark:text-stone-200 flex gap-3">
                <span className="text-japanRed font-bold">{i + 1}.</span> {m}
              </li>
            ))}
          </ul>
        </section>

        {/* Kanji Breakdown */}
        {entry.kanjiBreakdown && entry.kanjiBreakdown.length > 0 && (
          <section>
            <h3 className="text-stone-400 dark:text-stone-500 text-xs font-bold uppercase tracking-widest mb-4">Kanji Analysis</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {entry.kanjiBreakdown.map((k, i) => (
                <div key={i} className="p-4 bg-stone-50 dark:bg-stone-900 rounded-xl border border-stone-100 dark:border-stone-700 flex gap-4">
                  <span className="text-4xl font-japanese text-japanBlack dark:text-white">{k.character}</span>
                  <div className="text-sm">
                    <p className="font-bold text-japanRed">{k.meaning}</p>
                    <p className="text-stone-500"><span className="text-[10px] uppercase font-bold mr-1">On:</span> {k.onyomi}</p>
                    <p className="text-stone-500"><span className="text-[10px] uppercase font-bold mr-1">Kun:</span> {k.kunyomi}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Usage Notes */}
        {entry.usageNotes && (
          <section className="bg-amber-50 dark:bg-amber-900/10 p-4 rounded-xl border border-amber-100 dark:border-amber-900/30">
            <h3 className="text-amber-800 dark:text-amber-400 text-xs font-bold uppercase mb-2">Usage Notes</h3>
            <p className="text-stone-700 dark:text-stone-300 text-sm leading-relaxed">{entry.usageNotes}</p>
          </section>
        )}

        {/* Examples */}
        <section>
          <h3 className="text-stone-400 dark:text-stone-500 text-xs font-bold uppercase tracking-widest mb-4">Examples</h3>
          <div className="space-y-4">
            {entry.exampleSentences.map((ex, i) => (
              <div key={i} className="group cursor-pointer" onClick={() => playJapaneseAudio(ex.ja)}>
                <p className="text-lg font-japanese text-japanBlack dark:text-white group-hover:text-japanRed transition-colors">{ex.ja}</p>
                <p className="text-sm text-stone-500 italic mt-1">{ex.en}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};