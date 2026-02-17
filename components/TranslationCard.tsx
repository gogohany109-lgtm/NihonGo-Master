import React, { useState, useRef } from 'react';
import { TranslationResult, PronunciationResult, WordBreakdown } from '../types';
import { playJapaneseAudio, evaluatePronunciation } from '../services/geminiService';
import { blobToBase64 } from '../services/audioUtils';

interface Props {
  result: TranslationResult;
  isSaved?: boolean;
  onToggleSave?: () => void;
  onWordClick?: (word: string) => void;
}

const TONE_DESCRIPTIONS: Record<string, string> = {
  'Casual': 'Informal speech. Best used with close friends, family, and younger people.',
  'Polite': 'Standard politeness (Desu/Masu forms). Safe for general daily interactions and strangers.',
  'Formal/Keigo': 'Highly respectful language including honorifics. Essential for business, customer service, and speaking to superiors.'
};

const VocabularyItem: React.FC<{ item: WordBreakdown; showRomaji: boolean; onClick?: () => void }> = ({ item, showRomaji, onClick }) => {
  const getJapanesePart = (text: string) => {
    return text.replace(/[（(].*?[）)]/g, '').trim();
  };

  return (
    <div 
      onClick={onClick}
      className="group relative flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-white dark:bg-stone-800 rounded-lg shadow-sm border border-stone-100 dark:border-stone-700 gap-2 sm:gap-0 hover:shadow-md hover:border-japanRed transition-all cursor-pointer"
    >
        <div className="flex flex-col">
            <span className="text-lg font-japanese font-medium text-japanBlack dark:text-white group-hover:text-japanRed transition-colors">
              {item.word}
              <span className="ml-2 text-[10px] bg-stone-100 dark:bg-stone-700 px-1.5 py-0.5 rounded uppercase font-bold text-stone-400 group-hover:bg-japanRed group-hover:text-white transition-all">Dict</span>
            </span>
            <span className={`text-xs text-stone-400 dark:text-stone-500 transition-all duration-300 ${!showRomaji ? 'blur-sm' : ''}`}>{item.romaji}</span>
        </div>
        <div className="text-left sm:text-right">
            <span className="block text-sm font-medium text-indigoDye dark:text-indigo-300">{item.meaning}</span>
            <span className="text-[10px] text-stone-500 dark:text-stone-400 bg-stone-100 dark:bg-stone-700 px-2 py-0.5 rounded-full inline-block mt-1">{item.partOfSpeech}</span>
        </div>
    </div>
  );
};

export const TranslationCard: React.FC<Props> = ({ result, isSaved, onToggleSave, onWordClick }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isShared, setIsShared] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [showRomaji, setShowRomaji] = useState(true);

  // Practice state
  const [isRecording, setIsRecording] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [practiceResult, setPracticeResult] = useState<PronunciationResult | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  const handlePlay = async () => {
    if (isPlaying) return;
    setIsPlaying(true);
    try { await playJapaneseAudio(result.japanese, playbackSpeed); }
    finally { setIsPlaying(false); }
  };

  const togglePracticeRecording = async () => {
    if (isRecording) {
        mediaRecorderRef.current?.stop();
        setIsRecording(false);
    } else {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            const chunks: BlobPart[] = [];
            mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
            mediaRecorder.onstop = async () => {
                stream.getTracks().forEach(t => t.stop());
                setIsEvaluating(true);
                try {
                    const base64 = await blobToBase64(new Blob(chunks));
                    const res = await evaluatePronunciation(base64, 'audio/webm', result.japanese);
                    setPracticeResult(res);
                } finally { setIsEvaluating(false); }
            };
            mediaRecorder.start();
            setIsRecording(true);
        } catch (e) { alert("Microphone required"); }
    }
  };

  return (
    <div className="bg-white dark:bg-stone-800 rounded-lg md:rounded-xl shadow-xl border border-stone-100 dark:border-stone-700 animate-fade-in-up overflow-hidden">
      <div className="p-5 md:p-8 bg-gradient-to-br from-white to-stone-50 dark:from-stone-800 dark:to-stone-900">
        <div className="flex justify-between items-start mb-2">
           <p className="text-stone-400 text-xs md:text-sm uppercase tracking-widest font-bold">Japanese</p>
           <span className="px-2 py-1 text-[10px] font-bold border border-japanRed text-japanRed rounded">{result.tone}</span>
        </div>
        
        <div className="flex items-start justify-between gap-3 mb-4">
            <h2 className="text-3xl md:text-5xl font-japanese font-medium text-japanBlack dark:text-white leading-tight break-words">
            {result.japanese}
            </h2>
            <button onClick={handlePlay} disabled={isPlaying} className="p-3 rounded-full bg-japanRed text-white shadow-lg active:scale-95 disabled:opacity-50">
               {isPlaying ? <svg className="w-6 h-6 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg> : <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" /></svg>}
            </button>
        </div>

        <div className="mb-5">
           <p className={`text-lg md:text-xl text-indigoDye dark:text-indigo-300 font-mono bg-stone-100/60 dark:bg-stone-700/50 px-3 py-2 rounded-lg border border-stone-200 dark:border-stone-600 inline-block tracking-wide transition-all ${!showRomaji ? 'blur-sm' : ''}`}>
             {result.pronunciation}
           </p>
        </div>

        <div className="flex items-center gap-2 border-b border-stone-200 dark:border-stone-700 pb-4 mb-4">
            {onToggleSave && <button onClick={onToggleSave} className={`px-3 py-2 text-xs font-bold uppercase rounded-lg border transition-all ${isSaved ? 'bg-japanRed text-white border-japanRed' : 'text-stone-400 border-stone-200'}`}>Save</button>}
            <button onClick={() => setShowRomaji(!showRomaji)} className="px-3 py-2 text-xs font-bold uppercase text-stone-400 border border-stone-200 rounded-lg">{showRomaji ? 'Hide' : 'Show'} Romaji</button>
        </div>

        <div className="bg-stone-100/50 dark:bg-stone-900/50 p-4 rounded-xl border border-stone-200 dark:border-stone-700">
            <h3 className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-3">Practice Speaking</h3>
            <div className="flex items-center gap-4">
                <button onClick={togglePracticeRecording} className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-indigoDye text-white shadow-md'}`}>
                    {isRecording ? <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><rect x="7" y="7" width="10" height="10" rx="1"/></svg> : <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>}
                </button>
                {practiceResult && <div className="text-sm"><p className="font-bold text-japanRed">Score: {practiceResult.score}%</p><p className="text-stone-500 line-clamp-1">{practiceResult.feedback}</p></div>}
                {!practiceResult && !isRecording && <p className="text-xs text-stone-400">Click to evaluate your pronunciation.</p>}
            </div>
        </div>
      </div>

      <div className="bg-stone-50 dark:bg-stone-900/50 p-5 md:p-8 border-t border-stone-100 dark:border-stone-700">
        <h3 className="text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest mb-4">Vocabulary Breakdown</h3>
        <div className="grid gap-3">
          {result.breakdown.map((item, idx) => (
            <VocabularyItem 
              key={idx} 
              item={item} 
              showRomaji={showRomaji} 
              onClick={() => onWordClick?.(item.word)} 
            />
          ))}
        </div>
      </div>
    </div>
  );
};