import React, { useState, useRef, useEffect } from 'react';
import { Header } from './components/Header';
import { LanguageSelector } from './components/LanguageSelector';
import { TranslationCard } from './components/TranslationCard';
import { HistoryList } from './components/HistoryList';
import { translateTextToJapanese, transcribeAudio } from './services/geminiService';
import { blobToBase64 } from './services/audioUtils';
import { TranslationResult, AppState, HistoryItem } from './types';
import { SAMPLE_PHRASES } from './constants';

const App: React.FC = () => {
  const [inputText, setInputText] = useState('');
  const [sourceLang, setSourceLang] = useState('auto');
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [result, setResult] = useState<TranslationResult | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Lists
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [savedItems, setSavedItems] = useState<HistoryItem[]>([]);
  const [activeTab, setActiveTab] = useState<'history' | 'saved'>('history');

  const [darkMode, setDarkMode] = useState(false);
  
  // Audio Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  // Initialize Dark Mode
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
    } else {
      setDarkMode(false);
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    setDarkMode(prev => {
      const newMode = !prev;
      if (newMode) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
      }
      return newMode;
    });
  };

  // Load history and saved items on mount
  useEffect(() => {
    const savedHistory = localStorage.getItem('translationHistory');
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }

    const savedOffline = localStorage.getItem('savedTranslations');
    if (savedOffline) {
        try {
            setSavedItems(JSON.parse(savedOffline));
        } catch (e) {
            console.error("Failed to parse saved items", e);
        }
    }
  }, []);

  const saveToHistory = (originalText: string, translationResult: TranslationResult) => {
    const newItem: HistoryItem = {
      id: Date.now().toString(),
      originalText: originalText.trim(),
      result: translationResult,
      timestamp: Date.now()
    };

    setHistory(prev => {
      // Remove duplicates based on original text to keep list fresh
      const filtered = prev.filter(item => item.originalText.toLowerCase() !== originalText.trim().toLowerCase());
      // Keep last 6 items
      const updated = [newItem, ...filtered].slice(0, 6);
      localStorage.setItem('translationHistory', JSON.stringify(updated));
      return updated;
    });
  };

  const toggleSavedItem = () => {
    if (!result) return;
    const currentText = inputText.trim();
    const isAlreadySaved = savedItems.some(item => 
        item.originalText.toLowerCase() === currentText.toLowerCase() && 
        item.result.japanese === result.japanese
    );

    if (isAlreadySaved) {
        // Remove
        const updated = savedItems.filter(item => 
            !(item.originalText.toLowerCase() === currentText.toLowerCase() && item.result.japanese === result.japanese)
        );
        setSavedItems(updated);
        localStorage.setItem('savedTranslations', JSON.stringify(updated));
    } else {
        // Add
        const newItem: HistoryItem = {
            id: `saved-${Date.now()}`,
            originalText: currentText,
            result: result,
            timestamp: Date.now()
        };
        const updated = [newItem, ...savedItems];
        setSavedItems(updated);
        localStorage.setItem('savedTranslations', JSON.stringify(updated));
    }
  };

  const handleDeleteSaved = (id: string) => {
      const updated = savedItems.filter(item => item.id !== id);
      setSavedItems(updated);
      localStorage.setItem('savedTranslations', JSON.stringify(updated));
  };

  const handleClearHistory = () => {
    if (window.confirm('Are you sure you want to clear your recent translation history?')) {
        setHistory([]);
        localStorage.removeItem('translationHistory');
    }
  };

  const handleHistorySelect = (item: HistoryItem) => {
    setInputText(item.originalText);
    setResult(item.result);
    setAppState(AppState.SUCCESS);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleExportSaved = () => {
    if (savedItems.length === 0) return;
    
    const dataStr = JSON.stringify(savedItems, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `nihongo-saved-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportSaved = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const imported = JSON.parse(event.target?.result as string);
          if (Array.isArray(imported)) {
            // Merge with existing, avoiding duplicates based on Japanese translation
            setSavedItems(prev => {
              const existingMap = new Map(prev.map(item => [item.result.japanese, item]));
              imported.forEach(item => {
                if (item.result && item.result.japanese) {
                  existingMap.set(item.result.japanese, item);
                }
              });
              const updated = Array.from(existingMap.values());
              localStorage.setItem('savedTranslations', JSON.stringify(updated));
              return updated;
            });
            alert('Import successful!');
          }
        } catch (err) {
          alert('Failed to parse file. Please ensure it is a valid NihonGo Master export.');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleTranslate = async () => {
    if (!inputText.trim()) return;

    setAppState(AppState.TRANSLATING);
    setErrorMsg('');
    setResult(null);

    try {
      const data = await translateTextToJapanese(inputText, sourceLang);
      setResult(data);
      setAppState(AppState.SUCCESS);
      saveToHistory(inputText, data);
    } catch (err) {
      setAppState(AppState.ERROR);
      setErrorMsg("Unable to translate at this moment. Please try again.");
    }
  };

  const handleSampleClick = (text: string) => {
    setInputText(text);
  };

  const toggleRecording = async () => {
    if (isRecording) {
      // Stop recording
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
    } else {
      // Start recording
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        const chunks: BlobPart[] = [];

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunks.push(e.data);
        };

        mediaRecorder.onstop = async () => {
          // Stop all tracks to release microphone
          stream.getTracks().forEach(track => track.stop());
          
          const blob = new Blob(chunks, { type: 'audio/webm' });
          setIsTranscribing(true);
          try {
             const base64Audio = await blobToBase64(blob);
             // Use 'audio/webm' or the mime type provided by the browser
             const text = await transcribeAudio(base64Audio, blob.type || 'audio/webm');
             if (text) {
               setInputText(prev => prev + (prev ? ' ' : '') + text);
             }
          } catch (error) {
             console.error("Transcription failed", error);
             setErrorMsg("Failed to transcribe audio. Please try again.");
          } finally {
             setIsTranscribing(false);
          }
        };

        mediaRecorder.start();
        setIsRecording(true);
      } catch (err) {
        console.error("Error accessing microphone:", err);
        alert("Microphone access denied or not available.");
      }
    }
  };

  const isCurrentResultSaved = result ? savedItems.some(item => 
    item.originalText.toLowerCase() === inputText.trim().toLowerCase() && 
    item.result.japanese === result.japanese
  ) : false;

  return (
    <div className="min-h-screen bg-paper dark:bg-stone-950 pb-10 md:pb-20 font-sans selection:bg-japanRed selection:text-white transition-colors duration-300">
      <Header darkMode={darkMode} toggleTheme={toggleTheme} />

      <main className="max-w-4xl mx-auto px-4 md:px-6 pt-6 md:pt-10">
        
        {/* Input Section */}
        <div className="bg-white dark:bg-stone-800 rounded-2xl shadow-xl shadow-stone-200/50 dark:shadow-black/30 border border-stone-100 dark:border-stone-700 mb-6 md:mb-8 transition-all hover:shadow-2xl hover:shadow-stone-200/60 dark:hover:shadow-black/40 overflow-hidden">
           <div className="bg-stone-50/50 dark:bg-stone-900/50 p-3 md:p-4 border-b border-stone-100 dark:border-stone-700">
              <LanguageSelector selected={sourceLang} onChange={setSourceLang} />
           </div>
           
           <div className="relative p-4 md:p-6 bg-white dark:bg-stone-800 transition-colors">
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={isTranscribing ? "Listening..." : "Type or say something..."}
                disabled={isTranscribing}
                className="w-full h-40 md:h-52 text-2xl md:text-3xl text-stone-800 dark:text-stone-100 placeholder-stone-300 dark:placeholder-stone-600 resize-none focus:outline-none bg-transparent font-light leading-relaxed tracking-wide pb-16 transition-colors"
              />
              
              {/* Voice Input Button */}
              <button
                onClick={toggleRecording}
                disabled={isTranscribing}
                className={`absolute bottom-4 right-4 w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center transition-all duration-300 transform hover:scale-105 active:scale-95 focus:outline-none z-10
                  ${isRecording 
                    ? 'bg-japanRed text-white shadow-lg shadow-red-200 dark:shadow-none ring-4 ring-red-50 dark:ring-red-900/30 animate-pulse' 
                    : isTranscribing
                      ? 'bg-stone-100 dark:bg-stone-700 text-stone-400 dark:text-stone-500 cursor-wait'
                      : 'bg-white dark:bg-stone-700 text-stone-400 dark:text-stone-300 border border-stone-200 dark:border-stone-600 hover:border-japanRed dark:hover:border-japanRed hover:text-japanRed dark:hover:text-japanRed hover:shadow-md'}
                `}
                title={isRecording ? "Stop Recording" : "Start Voice Input"}
              >
                {isTranscribing ? (
                  <svg className="animate-spin w-6 h-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : isRecording ? (
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                     <rect x="7" y="7" width="10" height="10" rx="2" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6 md:w-7 md:h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                )}
              </button>
           </div>
           
           <div className="p-3 md:p-4 flex flex-col md:flex-row justify-between items-center bg-stone-50 dark:bg-stone-900 border-t border-stone-100 dark:border-stone-700 gap-3 md:gap-0 transition-colors">
              <div className="text-xs font-mono text-stone-400 dark:text-stone-500 w-full md:w-auto text-right md:text-left order-2 md:order-1 px-2">
                {inputText.length} chars
              </div>
              <button
                onClick={handleTranslate}
                disabled={appState === AppState.TRANSLATING || !inputText.trim() || isRecording || isTranscribing}
                className={`
                  w-full md:w-auto order-1 md:order-2
                  px-8 py-3 rounded-lg font-bold text-white transition-all transform duration-200 shadow-md
                  ${appState === AppState.TRANSLATING || !inputText.trim() || isRecording || isTranscribing
                    ? 'bg-stone-300 dark:bg-stone-700 cursor-not-allowed' 
                    : 'bg-japanRed hover:bg-rose-700 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0'}
                `}
              >
                {appState === AppState.TRANSLATING ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Translating...
                  </span>
                ) : (
                  'Translate'
                )}
              </button>
           </div>
        </div>

        {/* Error Message */}
        {(appState === AppState.ERROR || errorMsg) && (
          <div className="p-4 mb-8 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg border border-red-200 dark:border-red-800 text-center text-sm md:text-base animate-pulse">
            {errorMsg}
          </div>
        )}

        {/* Result Section */}
        {result && appState === AppState.SUCCESS && (
          <div className="animate-fade-in-up">
            <TranslationCard 
                result={result} 
                isSaved={isCurrentResultSaved}
                onToggleSave={toggleSavedItem}
            />
          </div>
        )}

        {/* Empty State / Suggestions */}
        {appState === AppState.IDLE && (
          <div className="mt-8 md:mt-12 text-center px-2">
            <h3 className="text-stone-400 dark:text-stone-500 text-xs md:text-sm uppercase tracking-widest mb-4 md:mb-6 font-bold">Try one of these</h3>
            <div className="flex flex-wrap justify-center gap-2 md:gap-3">
              {SAMPLE_PHRASES.map((phrase, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSampleClick(phrase)}
                  className="px-4 py-2 md:px-5 md:py-2.5 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 text-sm hover:border-japanRed dark:hover:border-japanRed hover:text-japanRed dark:hover:text-japanRed transition-all shadow-sm hover:shadow-md active:bg-stone-50 dark:active:bg-stone-700"
                >
                  {phrase}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tabs for History / Saved */}
        <div className="mt-12 md:mt-20">
            <div className="flex justify-center mb-4 gap-6 border-b border-stone-200 dark:border-stone-800 pb-2">
                <button 
                    onClick={() => setActiveTab('history')}
                    className={`pb-2 text-sm md:text-base font-medium tracking-wide transition-all relative ${
                        activeTab === 'history' 
                        ? 'text-japanRed dark:text-red-400' 
                        : 'text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300'
                    }`}
                >
                    Recent History
                    {activeTab === 'history' && (
                        <span className="absolute bottom-0 left-0 w-full h-0.5 bg-japanRed dark:bg-red-400 rounded-t-full"></span>
                    )}
                </button>
                <button 
                    onClick={() => setActiveTab('saved')}
                    className={`pb-2 text-sm md:text-base font-medium tracking-wide transition-all relative ${
                        activeTab === 'saved' 
                        ? 'text-japanRed dark:text-red-400' 
                        : 'text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300'
                    }`}
                >
                    Saved Phrases ({savedItems.length})
                    {activeTab === 'saved' && (
                        <span className="absolute bottom-0 left-0 w-full h-0.5 bg-japanRed dark:bg-red-400 rounded-t-full"></span>
                    )}
                </button>
            </div>

            {activeTab === 'history' ? (
                <HistoryList 
                    history={history} 
                    title="Recent Translations"
                    onSelect={handleHistorySelect} 
                    onClear={handleClearHistory} 
                />
            ) : (
                <HistoryList 
                    history={savedItems} 
                    title="Saved Translations"
                    onSelect={handleHistorySelect} 
                    onDelete={handleDeleteSaved}
                    onExport={handleExportSaved}
                    onImport={handleImportSaved}
                />
            )}
        </div>
      </main>

      {/* Decorative Footer */}
      <footer className="mt-12 md:mt-20 text-center text-stone-400 dark:text-stone-500 text-xs pb-6 md:pb-10">
        <div className="w-16 h-1 bg-japanRed mx-auto mb-4 opacity-20 rounded-full"></div>
        <p>© {new Date().getFullYear()} NihonGo Master • Powered by Gemini 3.0</p>
      </footer>
    </div>
  );
};

export default App;