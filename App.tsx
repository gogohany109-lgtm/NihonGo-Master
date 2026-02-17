import React, { useState, useRef, useEffect } from 'react';
import { Header } from './components/Header';
import { LanguageSelector } from './components/LanguageSelector';
import { TranslationCard } from './components/TranslationCard';
import { HistoryList } from './components/HistoryList';
import { DictionaryEntryView } from './components/DictionaryEntryView';
import { translateTextToJapanese, transcribeAudio, searchDictionary } from './services/geminiService';
import { blobToBase64 } from './services/audioUtils';
import { TranslationResult, AppState, HistoryItem, DictionaryEntry } from './types';

const App: React.FC = () => {
  const [inputText, setInputText] = useState('');
  const [dictQuery, setDictQuery] = useState('');
  const [sourceLang, setSourceLang] = useState('auto');
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [result, setResult] = useState<TranslationResult | null>(null);
  const [dictEntry, setDictEntry] = useState<DictionaryEntry | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [isQuotaExceeded, setIsQuotaExceeded] = useState(false);
  
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [savedItems, setSavedItems] = useState<HistoryItem[]>([]);
  const [activeTab, setActiveTab] = useState<'history' | 'saved' | 'dictionary'>('history');

  const [darkMode, setDarkMode] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleTheme = () => {
    setDarkMode(prev => {
      const next = !prev;
      document.documentElement.classList.toggle('dark');
      localStorage.setItem('theme', next ? 'dark' : 'light');
      return next;
    });
  };

  const handleOpenKeySelector = async () => {
    try {
      if (window.aistudio && window.aistudio.openSelectKey) {
        await window.aistudio.openSelectKey();
        setIsQuotaExceeded(false);
        setErrorMsg('');
      }
    } catch (e) {
      console.error("Failed to open key selector", e);
    }
  };

  useEffect(() => {
    const h = localStorage.getItem('translationHistory');
    if (h) setHistory(JSON.parse(h));
    const s = localStorage.getItem('savedTranslations');
    if (s) setSavedItems(JSON.parse(s));
  }, []);

  const handleTranslate = async () => {
    if (!inputText.trim()) return;
    setAppState(AppState.TRANSLATING);
    setErrorMsg('');
    setIsQuotaExceeded(false);
    try {
      const data = await translateTextToJapanese(inputText, sourceLang);
      setResult(data);
      setAppState(AppState.SUCCESS);
      const newItem = { id: Date.now().toString(), originalText: inputText, result: data, timestamp: Date.now() };
      setHistory(prev => {
        const updated = [newItem, ...prev.filter(x => x.originalText !== inputText)].slice(0, 10);
        localStorage.setItem('translationHistory', JSON.stringify(updated));
        return updated;
      });
    } catch (e: any) {
      setAppState(AppState.ERROR);
      if (e.message?.includes('429') || e.message?.includes('quota')) {
        setIsQuotaExceeded(true);
        setErrorMsg("API Quota Exceeded. Please wait a moment or use your own API key.");
      } else {
        setErrorMsg("Translation failed. Please try again.");
      }
    }
  };

  const handleDictSearch = async (query?: string) => {
    const q = query || dictQuery;
    if (!q.trim()) return;
    setAppState(AppState.DICTIONARY_LOADING);
    setActiveTab('dictionary');
    setDictEntry(null);
    setIsQuotaExceeded(false);
    try {
      const entry = await searchDictionary(q);
      setDictEntry(entry);
      setAppState(AppState.IDLE);
    } catch (e: any) {
      setAppState(AppState.ERROR);
      if (e.message?.includes('429') || e.message?.includes('quota')) {
        setIsQuotaExceeded(true);
        setErrorMsg("Dictionary quota exceeded. Please try later.");
      } else {
        setErrorMsg("Word not found in dictionary.");
      }
    }
  };

  const toggleRecording = async () => {
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
          setIsTranscribing(true);
          try {
            const base64 = await blobToBase64(new Blob(chunks));
            const text = await transcribeAudio(base64, 'audio/webm');
            if (text) setInputText(prev => prev + (prev ? ' ' : '') + text);
          } catch (e: any) {
             if (e.message?.includes('429')) setErrorMsg("Transcription quota exceeded.");
          } finally { setIsTranscribing(false); }
        };
        mediaRecorder.start();
        setIsRecording(true);
      } catch (e) { alert("Microphone access denied."); }
    }
  };

  return (
    <div className="min-h-screen bg-paper dark:bg-stone-950 pb-20 font-sans transition-colors duration-300">
      <Header darkMode={darkMode} toggleTheme={toggleTheme} onOpenKey={handleOpenKeySelector} />

      <main className="max-w-4xl mx-auto px-4 pt-10">
        
        {/* Quota Error Banner */}
        {isQuotaExceeded && (
          <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4 animate-fade-in">
             <div className="flex items-center gap-3">
               <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-800 flex items-center justify-center text-amber-600 dark:text-amber-400">
                 <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                 </svg>
               </div>
               <div>
                 <p className="text-amber-800 dark:text-amber-200 font-bold text-sm">Limit Reached</p>
                 <p className="text-amber-700 dark:text-amber-400 text-xs">The global API quota is full. Use your own key for unlimited access.</p>
               </div>
             </div>
             <button 
               onClick={handleOpenKeySelector}
               className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all whitespace-nowrap"
             >
               Use My Own Key
             </button>
          </div>
        )}

        {/* Dictionary Search Bar */}
        <div className="mb-8 flex gap-2">
            <div className="relative flex-grow">
                <input 
                    type="text" 
                    value={dictQuery} 
                    onChange={(e) => setDictQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleDictSearch()}
                    placeholder="Search Japanese Dictionary (Kanji, Romaji...)"
                    className="w-full px-6 py-4 bg-white dark:bg-stone-800 rounded-2xl border border-stone-200 dark:border-stone-700 shadow-lg focus:ring-2 focus:ring-japanRed outline-none dark:text-white"
                />
                <button 
                  onClick={() => handleDictSearch()}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 hover:text-japanRed"
                >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </button>
            </div>
        </div>

        {/* Main Translator UI */}
        <div className="bg-white dark:bg-stone-800 rounded-2xl shadow-xl border border-stone-100 dark:border-stone-700 mb-8 overflow-hidden">
           <div className="bg-stone-50/50 dark:bg-stone-900/50 p-4 border-b border-stone-100 dark:border-stone-700">
              <LanguageSelector selected={sourceLang} onChange={setSourceLang} />
           </div>
           
           <div className="relative p-6">
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Type something to translate to Japanese..."
                className="w-full h-40 text-2xl text-stone-800 dark:text-stone-100 placeholder-stone-300 outline-none bg-transparent"
              />
              <button
                onClick={toggleRecording}
                className={`absolute bottom-4 right-4 w-12 h-12 rounded-full flex items-center justify-center transition-all ${isRecording ? 'bg-japanRed text-white animate-pulse' : 'bg-stone-100 dark:bg-stone-700 text-stone-400'}`}
              >
                {isTranscribing ? <svg className="animate-spin w-6 h-6" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"></circle><path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" className="opacity-75"></path></svg> : <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>}
              </button>
           </div>
           
           <div className="p-4 bg-stone-50 dark:bg-stone-900 border-t border-stone-100 dark:border-stone-700 flex justify-end">
              <button
                onClick={handleTranslate}
                disabled={appState === AppState.TRANSLATING || !inputText.trim()}
                className="px-8 py-3 bg-japanRed hover:bg-rose-700 text-white rounded-lg font-bold shadow-md transition-all disabled:opacity-50"
              >
                {appState === AppState.TRANSLATING ? "Translating..." : "Translate"}
              </button>
           </div>
        </div>

        {errorMsg && !isQuotaExceeded && <div className="p-4 mb-8 bg-red-50 text-red-600 rounded-lg border border-red-200 text-center">{errorMsg}</div>}

        {/* Dictionary Results Overlay-style */}
        {activeTab === 'dictionary' && (
          <div className="mb-12">
            {appState === AppState.DICTIONARY_LOADING ? (
              <div className="flex flex-col items-center justify-center p-20 text-stone-400">
                <svg className="animate-spin h-12 w-12 mb-4" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"></circle><path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" className="opacity-75"></path></svg>
                <p className="font-artistic text-xl text-center">Consulting the Sages...</p>
              </div>
            ) : dictEntry ? (
              <DictionaryEntryView entry={dictEntry} onClose={() => setActiveTab('history')} />
            ) : null}
          </div>
        )}

        {/* Translation Results */}
        {result && appState === AppState.SUCCESS && (
          <div className="mb-12">
            <TranslationCard 
                result={result} 
                isSaved={savedItems.some(x => x.result.japanese === result.japanese)}
                onToggleSave={() => {
                  setSavedItems(prev => {
                    const isS = prev.some(x => x.result.japanese === result.japanese);
                    const updated = isS ? prev.filter(x => x.result.japanese !== result.japanese) : [{ id: Date.now().toString(), originalText: inputText, result, timestamp: Date.now() }, ...prev];
                    localStorage.setItem('savedTranslations', JSON.stringify(updated));
                    return updated;
                  });
                }}
                onWordClick={(w) => handleDictSearch(w)}
            />
          </div>
        )}

        {/* Tabs for History / Saved */}
        <div className="mt-20">
            <div className="flex justify-center mb-8 gap-8 border-b border-stone-200 dark:border-stone-800">
                {['history', 'saved'].map((t) => (
                  <button 
                      key={t}
                      onClick={() => setActiveTab(t as any)}
                      className={`pb-4 text-sm font-bold uppercase tracking-widest relative ${activeTab === t ? 'text-japanRed' : 'text-stone-400'}`}
                  >
                      {t} {activeTab === t && <span className="absolute bottom-0 left-0 w-full h-1 bg-japanRed rounded-full"></span>}
                  </button>
                ))}
            </div>

            {activeTab === 'history' && <HistoryList history={history} onSelect={(i) => { setInputText(i.originalText); setResult(i.result); setAppState(AppState.SUCCESS); }} />}
            {activeTab === 'saved' && <HistoryList history={savedItems} title="Saved collection" onSelect={(i) => { setInputText(i.originalText); setResult(i.result); setAppState(AppState.SUCCESS); }} />}
        </div>
      </main>

      <footer className="mt-20 text-center text-stone-400 text-xs pb-10">
        <p>© {new Date().getFullYear()} NihonGo Master • AI-Powered Dictionary & Translator</p>
        <p className="mt-2 text-[10px] opacity-50">Powered by Gemini 2.5 & 3 Pro</p>
      </footer>
    </div>
  );
};

export default App;