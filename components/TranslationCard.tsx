import React, { useState, useRef, useEffect } from 'react';
import { TranslationResult, PronunciationResult, WordBreakdown } from '../types';
import { playJapaneseAudio, evaluatePronunciation, generateExampleSentence } from '../services/geminiService';
import { blobToBase64 } from '../services/audioUtils';

interface Props {
  result: TranslationResult;
  isSaved?: boolean;
  onToggleSave?: () => void;
}

const TONE_DESCRIPTIONS: Record<string, string> = {
  'Casual': 'Informal speech. Best used with close friends, family, and younger people.',
  'Polite': 'Standard politeness (Desu/Masu forms). Safe for general daily interactions and strangers.',
  'Formal/Keigo': 'Highly respectful language including honorifics. Essential for business, customer service, and speaking to superiors.'
};

const VocabularyItem: React.FC<{ item: WordBreakdown; showRomaji: boolean }> = ({ item, showRomaji }) => {
  const [example, setExample] = useState<string | undefined>(item.exampleSentence);
  const [isLoading, setIsLoading] = useState(false);
  const hasFetched = useRef(false);

  useEffect(() => {
    setExample(item.exampleSentence);
    hasFetched.current = false;
  }, [item.word, item.exampleSentence]);

  useEffect(() => {
    if (!example && !hasFetched.current && !isLoading) {
      setIsLoading(true);
      hasFetched.current = true;
      generateExampleSentence(item.word, item.meaning)
        .then((res) => {
          if (res) setExample(res);
        })
        .finally(() => setIsLoading(false));
    }
  }, [example, item.word, item.meaning, isLoading]);

  const getJapanesePart = (text: string) => {
    // Remove parentheses and their content (English translation) to show only Japanese
    // Handles both ASCII () and Japanese （）
    return text.replace(/[（(].*?[）)]/g, '').trim();
  };

  return (
    <div className="group relative flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-white dark:bg-stone-800 rounded-lg shadow-sm border border-stone-100 dark:border-stone-700 gap-2 sm:gap-0 hover:shadow-md transition-all cursor-help">
        {/* Tooltip */}
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 p-3 bg-stone-800 dark:bg-stone-700 text-stone-100 text-xs rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none">
            <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-stone-800 dark:bg-stone-700 rotate-45"></div>
            <p className="font-bold mb-1 text-white">{item.word} ({item.romaji})</p>
            <p className="mb-2 text-stone-300">{item.meaning}</p>
            
            {(example || isLoading) && (
                <div className="pt-2 border-t border-stone-700 dark:border-stone-600">
                    {isLoading ? (
                         <div className="flex items-center gap-2 text-stone-400">
                            <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            <span className="italic">Generating example...</span>
                        </div>
                    ) : (
                        <>
                            <p className="text-amber-200 font-japanese">{getJapanesePart(example!)}</p>
                            <p className="text-stone-400 italic mt-0.5">{example}</p>
                        </>
                    )}
                </div>
            )}
        </div>

        <div className="flex flex-col">
            <span className="text-lg font-japanese font-medium text-japanBlack dark:text-white group-hover:text-japanRed dark:group-hover:text-red-400 transition-colors">{item.word}</span>
            <span className={`text-xs text-stone-400 dark:text-stone-500 transition-all duration-300 ${!showRomaji ? 'blur-sm select-none hover:blur-none hover:select-text cursor-help' : ''}`}>{item.romaji}</span>
        </div>
        <div className="text-left sm:text-right flex flex-row sm:flex-col items-center sm:items-end gap-2 sm:gap-0">
            <span className="block text-sm font-medium text-indigoDye dark:text-indigo-300">{item.meaning}</span>
            <span className="text-[10px] md:text-xs text-stone-500 dark:text-stone-400 bg-stone-100 dark:bg-stone-700 px-2 py-0.5 rounded-full inline-block sm:mt-1">{item.partOfSpeech}</span>
        </div>
    </div>
  );
};

export const TranslationCard: React.FC<Props> = ({ result, isSaved, onToggleSave }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isShared, setIsShared] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [showRomaji, setShowRomaji] = useState(true);

  // Pronunciation Practice State
  const [isRecording, setIsRecording] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [practiceResult, setPracticeResult] = useState<PronunciationResult | null>(null);
  const [practiceError, setPracticeError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  const handlePlay = async () => {
    if (isPlaying) return;
    setIsPlaying(true);
    try {
      await playJapaneseAudio(result.japanese, playbackSpeed);
    } catch (e) {
        console.error("Audio playback error:", e);
        // Could show a toast or error here if needed
    } finally {
      setIsPlaying(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(result.japanese);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const handleShare = async () => {
    const shareData = {
        title: 'NihonGo Master Translation',
        text: `${result.japanese}\n${result.pronunciation}\n\n"${result.englishMeaning}"`,
    };

    if (navigator.share) {
        try {
            await navigator.share(shareData);
            setIsShared(true);
            setTimeout(() => setIsShared(false), 2000);
        } catch (err) {
            if (err instanceof Error && err.name === 'AbortError') {
                return;
            }
            console.error('Error sharing:', err);
        }
    } else {
        try {
            await navigator.clipboard.writeText(`${shareData.text}`);
            setIsShared(true);
            setTimeout(() => setIsShared(false), 2000);
        } catch (err) {
            console.error('Failed to copy fallback:', err);
        }
    }
  };

  const togglePracticeRecording = async () => {
    setPracticeError(null);
    if (isRecording) {
        mediaRecorderRef.current?.stop();
        setIsRecording(false);
    } else {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            const chunks: BlobPart[] = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunks.push(e.data);
            };

            mediaRecorder.onstop = async () => {
                stream.getTracks().forEach(track => track.stop());
                const blob = new Blob(chunks, { type: 'audio/webm' });
                
                setIsEvaluating(true);
                setPracticeResult(null);
                
                try {
                    const base64Audio = await blobToBase64(blob);
                    const evalResult = await evaluatePronunciation(base64Audio, blob.type || 'audio/webm', result.japanese);
                    setPracticeResult(evalResult);
                } catch (error) {
                    console.error("Evaluation failed", error);
                    setPracticeError("Failed to evaluate. Please try again.");
                } finally {
                    setIsEvaluating(false);
                }
            };

            mediaRecorder.start();
            setIsRecording(true);
        } catch (err) {
            console.error("Error accessing microphone:", err);
            setPracticeError("Microphone access denied. Please check your browser settings.");
        }
    }
  };

  return (
    <div className="bg-white dark:bg-stone-800 rounded-lg md:rounded-xl shadow-xl border border-stone-100 dark:border-stone-700 animate-fade-in-up transition-colors duration-300">
      {/* Main Result */}
      <div className="p-5 md:p-8 bg-gradient-to-br from-white to-stone-50 dark:from-stone-800 dark:to-stone-900 rounded-t-lg md:rounded-t-xl transition-colors">
        
        {/* Header Row: Label + Tone Badge */}
        <div className="flex justify-between items-start mb-2 relative z-10">
           <p className="text-stone-400 dark:text-stone-500 text-xs md:text-sm uppercase tracking-widest font-bold mt-1">Japanese</p>
           
           <div className="flex items-center gap-2">
             <span className={`px-2 py-1 text-[10px] md:text-xs font-bold uppercase rounded border whitespace-nowrap cursor-default transition-colors duration-200 ${
               result.tone === 'Polite' ? 'border-indigoDye text-indigoDye bg-indigo-50/50 dark:text-indigo-300 dark:border-indigo-400 dark:bg-indigo-900/30' :
               result.tone === 'Formal/Keigo' ? 'border-purple-600 text-purple-600 bg-purple-50/50 dark:text-purple-300 dark:border-purple-400 dark:bg-purple-900/30' :
               'border-orange-500 text-orange-500 bg-orange-50/50 dark:text-orange-300 dark:border-orange-400 dark:bg-orange-900/30'
             }`}>
               {result.tone}
             </span>
             
             {/* Dedicated Info Icon */}
             <div className="relative group">
                <button className="flex items-center justify-center text-stone-400 hover:text-japanRed dark:text-stone-500 dark:hover:text-red-400 transition-colors focus:outline-none" aria-label="Tone Information">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </button>
                
                {/* Tooltip */}
                <div className="absolute right-0 top-full mt-2 w-56 p-3 bg-stone-800 dark:bg-stone-700 text-stone-100 text-[11px] leading-relaxed rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform translate-y-[-4px] group-hover:translate-y-0 z-50 pointer-events-none text-left border border-stone-700">
                    <div className="absolute -top-1.5 right-1 w-3 h-3 bg-stone-800 dark:bg-stone-700 transform rotate-45 border-l border-t border-stone-700 dark:border-stone-600"></div>
                    <div className="relative z-10">
                        <span className="block font-bold mb-1 text-white border-b border-stone-600 pb-1">{result.tone} Tone</span>
                        {TONE_DESCRIPTIONS[result.tone] || 'Tone level of the translation.'}
                    </div>
                </div>
             </div>
           </div>
        </div>
        
        {/* Japanese Text & Audio */}
        <div className="flex items-start justify-between gap-3 mb-4">
            <h2 className="text-3xl md:text-5xl font-japanese font-medium text-japanBlack dark:text-white leading-tight select-all break-words transition-colors">
            {result.japanese}
            </h2>
            
            <div className="flex flex-col items-end gap-2 flex-shrink-0 mt-1">
                 <button
                    onClick={handlePlay}
                    disabled={isPlaying}
                    className="p-2 md:p-3 rounded-full bg-japanRed hover:bg-rose-700 text-white transition-all transform active:scale-95 shadow-lg hover:shadow-xl focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Listen"
                >
                    {isPlaying ? (
                         <svg className="w-5 h-5 md:w-6 md:h-6 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                        </svg>
                    ) : (
                        <svg className="w-5 h-5 md:w-6 md:h-6" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                        </svg>
                    )}
                </button>

                {/* Speed Controls */}
                <div className="flex bg-stone-100 dark:bg-stone-700 rounded-lg p-1 border border-stone-200 dark:border-stone-600 shadow-inner transition-colors">
                    {[0.75, 1, 1.25].map((speed) => (
                        <button
                            key={speed}
                            onClick={() => setPlaybackSpeed(speed)}
                            className={`px-1.5 py-0.5 text-[10px] font-bold rounded transition-all duration-200 ${
                                playbackSpeed === speed
                                    ? 'bg-white dark:bg-stone-600 text-japanRed dark:text-red-400 shadow-sm ring-1 ring-black/5 dark:ring-white/10'
                                    : 'text-stone-400 dark:text-stone-400 hover:text-stone-600 dark:hover:text-stone-300'
                            }`}
                        >
                            {speed}x
                        </button>
                    ))}
                </div>
            </div>
        </div>

        {/* Pronunciation Guide */}
        <div className="mb-5">
           <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5 opacity-70">
                 <svg className="w-3 h-3 text-stone-500 dark:text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                 </svg>
                 <span className="text-[10px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest">Pronunciation</span>
              </div>
              
              <button
                onClick={() => setShowRomaji(!showRomaji)}
                className="text-[10px] font-bold uppercase tracking-wider text-stone-400 hover:text-japanRed dark:text-stone-500 dark:hover:text-red-400 transition-colors flex items-center gap-1"
                title={showRomaji ? "Hide Romaji" : "Show Romaji"}
              >
                {showRomaji ? (
                  <>
                    <span>Hide</span>
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                  </>
                ) : (
                  <>
                    <span>Show</span>
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  </>
                )}
              </button>
           </div>
           
           <div className="relative group inline-block">
             <p className={`text-lg md:text-xl text-indigoDye dark:text-indigo-300 font-mono bg-stone-100/60 dark:bg-stone-700/50 px-3 py-2 rounded-lg border border-stone-200 dark:border-stone-600 inline-block tracking-wide transition-all duration-300 ${!showRomaji ? 'blur-sm select-none hover:blur-none hover:select-text cursor-help' : 'cursor-help'}`}>
               {result.pronunciation || result.romaji}
             </p>

             {/* Tooltip */}
             <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-max max-w-[200px] md:max-w-xs p-3 bg-stone-800 dark:bg-stone-700 text-stone-100 text-xs rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none text-center border border-stone-700 dark:border-stone-600">
                  <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-stone-800 dark:bg-stone-700 rotate-45 border-r border-b border-stone-700 dark:border-stone-600"></div>
                  
                  <p className="font-japanese font-bold text-lg mb-1.5 text-white">{result.japanese}</p>
                  <p className="text-stone-300 mb-2 italic">"{result.englishMeaning}"</p>
                  
                  <span className={`inline-block px-2 py-0.5 rounded text-[10px] border font-bold uppercase ${
                     result.tone === 'Polite' ? 'border-indigo-400/50 text-indigo-300 bg-indigo-900/20' :
                     result.tone === 'Formal/Keigo' ? 'border-purple-400/50 text-purple-300 bg-purple-900/20' :
                     'border-orange-400/50 text-orange-300 bg-orange-900/20'
                  }`}>
                     {result.tone}
                  </span>
             </div>
           </div>
        </div>

        {/* Action Buttons Row */}
        <div className="flex items-center gap-4 mb-4 border-b border-stone-200 dark:border-stone-700 pb-4 flex-wrap">
            {/* Save Button (New) */}
            {onToggleSave && (
              <button
                onClick={onToggleSave}
                className={`flex items-center gap-1.5 text-xs md:text-sm font-medium transition-all duration-200 focus:outline-none transform active:scale-95 ${isSaved ? 'text-japanRed dark:text-red-400' : 'text-stone-400 dark:text-stone-400 hover:text-japanRed dark:hover:text-red-400'}`}
                title={isSaved ? "Remove from saved" : "Save for offline"}
              >
                {isSaved ? (
                  <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                     <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
                  </svg>
                ) : (
                   <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                   </svg>
                )}
                <span>{isSaved ? 'Saved' : 'Save'}</span>
              </button>
            )}

            {/* Copy Button */}
            <button
            onClick={handleCopy}
            className={`flex items-center gap-1.5 text-xs md:text-sm font-medium transition-all duration-200 focus:outline-none transform active:scale-95 ${isCopied ? 'text-green-600 dark:text-green-400' : 'text-stone-400 dark:text-stone-400 hover:text-japanRed dark:hover:text-red-400'}`}
            title="Copy to clipboard"
            >
            {isCopied ? (
                <>
                <svg className="w-4 h-4 text-green-500 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-green-600 dark:text-green-400">Copied!</span>
                </>
            ) : (
                <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <span>Copy</span>
                </>
            )}
            </button>

            {/* Share Button */}
            <button
                onClick={handleShare}
                className={`flex items-center gap-1.5 text-xs md:text-sm font-medium transition-all duration-200 focus:outline-none transform active:scale-95 ${isShared ? 'text-indigoDye dark:text-indigo-300' : 'text-stone-400 dark:text-stone-400 hover:text-indigoDye dark:hover:text-indigo-300'}`}
                title="Share translation"
            >
                {isShared ? (
                    <>
                        <svg className="w-4 h-4 text-indigoDye dark:text-indigo-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Shared!</span>
                    </>
                ) : (
                    <>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                        </svg>
                        <span>Share</span>
                    </>
                )}
            </button>
        </div>

        {/* Practice Pronunciation Section */}
        <div className="bg-white/50 dark:bg-black/20 rounded-lg p-4 border border-stone-200 dark:border-stone-700/50 mb-2">
            <h3 className="text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                <span>Practice Speaking</span>
                {practiceResult && (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] text-white ${
                        practiceResult.score >= 90 ? 'bg-green-500' :
                        practiceResult.score >= 70 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}>
                        Score: {practiceResult.score}%
                    </span>
                )}
            </h3>
            
            <div className="flex items-start gap-3">
                <button
                    onClick={togglePracticeRecording}
                    disabled={isEvaluating}
                    className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                        isRecording 
                        ? 'bg-red-500 text-white animate-pulse ring-4 ring-red-200 dark:ring-red-900/30' 
                        : isEvaluating
                        ? 'bg-stone-200 dark:bg-stone-700 cursor-wait text-stone-400'
                        : 'bg-indigoDye text-white hover:bg-indigo-700 shadow-md'
                    }`}
                >
                    {isRecording ? (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><rect x="7" y="7" width="10" height="10" rx="1"/></svg>
                    ) : isEvaluating ? (
                        <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    ) : (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                    )}
                </button>
                
                <div className="flex-grow">
                    {practiceError ? (
                        <p className="text-sm text-red-500 dark:text-red-400 mt-2 font-medium">{practiceError}</p>
                    ) : isRecording ? (
                        <p className="text-sm text-stone-500 dark:text-stone-400 mt-2 italic">Listening... Speak the Japanese text above.</p>
                    ) : isEvaluating ? (
                        <p className="text-sm text-stone-500 dark:text-stone-400 mt-2 animate-pulse">Analyzing pronunciation...</p>
                    ) : practiceResult ? (
                        <div className="space-y-2 text-sm">
                            <p className="text-stone-700 dark:text-stone-300">
                                <span className="font-bold text-xs uppercase text-stone-400 mr-2">Heard:</span> 
                                {practiceResult.transcript}
                            </p>
                            <p className={`text-stone-600 dark:text-stone-400 ${practiceResult.score < 80 ? 'text-orange-600 dark:text-orange-400' : ''}`}>
                                <span className="font-bold text-xs uppercase text-stone-400 mr-2">Feedback:</span>
                                {practiceResult.feedback}
                            </p>
                        </div>
                    ) : (
                        <p className="text-sm text-stone-400 dark:text-stone-500 mt-2">Press the microphone to practice speaking this phrase.</p>
                    )}
                </div>
            </div>
        </div>

        <p className="text-sm md:text-base text-stone-500 dark:text-stone-400 italic mt-2">"{result.englishMeaning}"</p>
      </div>

      {/* Breakdown Details */}
      <div className="bg-stone-50 dark:bg-stone-900/50 p-5 md:p-6 border-t border-stone-100 dark:border-stone-700 rounded-b-lg md:rounded-b-xl transition-colors">
        
        {/* Cultural Note Enhanced */}
        {result.culturalNote && (
          <div className="mb-6 relative overflow-hidden rounded-xl border border-stone-200 dark:border-stone-700 shadow-sm hover:shadow-md transition-all group">
            {/* Background pattern/gradient */}
            <div className="absolute inset-0 bg-stone-50 dark:bg-stone-800/80 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#44403c_1px,transparent_1px)] [background-size:16px_16px] opacity-50" />
            
            <div className="relative z-10 p-5 flex gap-4">
               {/* Icon Column */}
               <div className="flex-shrink-0">
                 <div className="w-10 h-10 rounded-full bg-japanRed text-white flex items-center justify-center shadow-md">
                    {/* Lantern/Culture Icon (Book/Scroll style) */}
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                 </div>
               </div>

               {/* Content Column */}
               <div className="flex-1">
                 <h3 className="font-artistic font-bold text-lg text-japanRed dark:text-red-400 mb-1 leading-none tracking-wide">
                   CULTURAL INSIGHT
                 </h3>
                 <p className="text-stone-700 dark:text-stone-300 text-sm md:text-base leading-relaxed font-medium">
                   {result.culturalNote}
                 </p>
               </div>
            </div>
            
            {/* Decorative Corner */}
            <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-japanRed/10 to-transparent pointer-events-none" />
          </div>
        )}

        <h3 className="text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest mb-4">Vocabulary Breakdown</h3>
        <div className="grid gap-3">
          {result.breakdown.map((item, idx) => (
            <VocabularyItem key={idx} item={item} showRomaji={showRomaji} />
          ))}
        </div>
      </div>
    </div>
  );
};