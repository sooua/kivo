import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useStore } from "../store";
import { useTranslate } from "../useTranslate";
import { LANGUAGES, getProvider, PROVIDERS } from "../providers";
import { useNavigate } from "react-router-dom";

// Language code to BCP-47 for Web Speech API
function langToBcp47(code: string): string {
  const map: Record<string, string> = {
    en: "en-US",
    zh: "zh-CN",
    ja: "ja-JP",
    ko: "ko-KR",
    fr: "fr-FR",
    de: "de-DE",
    es: "es-ES",
    ru: "ru-RU",
    ar: "ar-SA",
    pt: "pt-PT",
  };
  return map[code] || "en-US";
}

export default function TranslatePage() {
  const {
    sourceText,
    targetText,
    sourceLang,
    targetLang,
    engine,
    isLoading,
    error,
    history,
    favorites,
    setSourceText,
    setSourceLang,
    setTargetLang,
    setEngine,
    setError,
    swapLanguages,
    fillFromHistory,
    toggleFavorite,
    isFavorite,
    verifiedEngines,
  } = useStore();

  const { translate } = useTranslate();
  const navigate = useNavigate();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showSourceLangDropdown, setShowSourceLangDropdown] = useState(false);
  const [showTargetLangDropdown, setShowTargetLangDropdown] = useState(false);
  const [showEngineDropdown, setShowEngineDropdown] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSpeakingSource, setIsSpeakingSource] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const recognitionRef = useRef<any>(null);
  const autoTranslateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-translate after 1 second of no typing, or when language changes
  useEffect(() => {
    if (autoTranslateTimer.current) {
      clearTimeout(autoTranslateTimer.current);
    }
    if (sourceText.trim() && !isLoading) {
      autoTranslateTimer.current = setTimeout(() => {
        translate();
      }, 1000);
    }
    return () => {
      if (autoTranslateTimer.current) {
        clearTimeout(autoTranslateTimer.current);
      }
    };
  }, [sourceText, sourceLang, targetLang, engine]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.ctrlKey && e.key === "Enter") {
      e.preventDefault();
      translate();
    }
  };

  // Speech-to-text (mic button)
  const handleMic = useCallback(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("Speech recognition is not supported in this browser.");
      return;
    }

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = langToBcp47(sourceLang === "auto" ? "en" : sourceLang);
    recognition.interimResults = false;
    recognition.continuous = false;

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setSourceText(sourceText ? sourceText + " " + transcript : transcript);
      setIsListening(false);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognition.start();
    setIsListening(true);
  }, [isListening, sourceLang, sourceText, setSourceText, setError]);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Google TTS via backend
  const playTts = useCallback(async (text: string, lang: string, setPlaying: (v: boolean) => void) => {
    // Stop any current playback
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    setPlaying(true);
    try {
      const audioBytes = await invoke<number[]>("speak", { text, lang });
      const uint8 = new Uint8Array(audioBytes);
      const blob = new Blob([uint8], { type: "audio/mpeg" });
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => { setPlaying(false); URL.revokeObjectURL(url); audioRef.current = null; };
      audio.onerror = () => { setPlaying(false); URL.revokeObjectURL(url); audioRef.current = null; };
      await audio.play();
    } catch {
      setPlaying(false);
    }
  }, []);

  // Text-to-speech for target text
  const handleSpeak = useCallback(() => {
    if (!targetText) return;
    if (isSpeaking) {
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
      setIsSpeaking(false);
      return;
    }
    playTts(targetText, targetLang, setIsSpeaking);
  }, [targetText, targetLang, isSpeaking, playTts]);

  // Text-to-speech for source text
  const handleSpeakSource = useCallback(() => {
    if (!sourceText) return;
    if (isSpeakingSource) {
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
      setIsSpeakingSource(false);
      return;
    }
    playTts(sourceText, sourceLang === "auto" ? "en" : sourceLang, setIsSpeakingSource);
  }, [sourceText, sourceLang, isSpeakingSource, playTts]);

  // Copy to clipboard
  const handleCopy = async () => {
    if (!targetText) return;
    try {
      await navigator.clipboard.writeText(targetText);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 1500);
    } catch {
      // fallback
    }
  };

  // Star / favorite
  const handleStar = () => {
    if (!targetText || !sourceText) return;
    toggleFavorite({
      sourceText,
      targetText,
      sourceLang,
      targetLang,
      engine,
    });
  };

  const starred = isFavorite(sourceText, targetText);

  const sourceLangName =
    LANGUAGES.find((l) => l.code === sourceLang)?.name || sourceLang;
  const targetLangName =
    LANGUAGES.find((l) => l.code === targetLang)?.name || targetLang;

  const targetLangs = LANGUAGES.filter((l) => l.code !== "auto");
  const currentProvider = getProvider(engine);

  // Available engines: only verified ones + MyMemory (always free)
  const availableEngines = useMemo(() => {
    return PROVIDERS.filter((p) => !!verifiedEngines[p.key]);
  }, [verifiedEngines]);

  const formatTime = (ts: number) => {
    const diff = Date.now() - ts;
    if (diff < 60000) return "just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return "Yesterday";
  };

  return (
    <div className="flex flex-col p-8 gap-8 h-full">
      {/* Error Bar */}
      {error && (
        <div className="bg-error text-on-error px-6 py-3 rounded-xl flex items-center gap-3">
          <span className="material-symbols-outlined">error</span>
          <span className="flex-1 text-sm font-medium">{error}</span>
          <button onClick={() => setError(null)} className="hover:opacity-70">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
      )}

      {/* Language Bar — same grid as translation panes so swap button aligns with the gap */}
      <section className="grid grid-cols-2 gap-[4.5rem] relative">
        {/* Source Language — right-aligned in left column */}
        <div className="flex justify-end relative">
          <div className="relative flex items-center">
            <button
              onClick={() => {
                setShowSourceLangDropdown(!showSourceLangDropdown);
                setShowTargetLangDropdown(false);
              }}
              className="px-5 py-2 rounded-full bg-primary text-on-primary font-bold text-xs uppercase tracking-widest transition-colors flex items-center gap-2"
            >
              {sourceLangName}
              <span className="material-symbols-outlined text-[16px]">expand_more</span>
            </button>
            {showSourceLangDropdown && (
              <div className="absolute top-full mt-2 right-0 bg-white/90 backdrop-blur-xl rounded-xl shadow-[0_12px_40px_rgba(0,88,190,0.08)] border border-outline-variant/10 py-2 min-w-[160px] z-50">
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => {
                      setSourceLang(lang.code);
                      setShowSourceLangDropdown(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-sm font-medium transition-colors ${
                      sourceLang === lang.code
                        ? "text-primary bg-primary/5"
                        : "text-on-surface hover:bg-surface-container-high"
                    }`}
                  >
                    {lang.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        {/* Target Language — left-aligned in right column */}
        <div className="flex justify-start relative">
          <div className="relative flex items-center">
            <button
              onClick={() => {
                setShowTargetLangDropdown(!showTargetLangDropdown);
                setShowSourceLangDropdown(false);
              }}
              className="px-5 py-2 rounded-full text-on-surface-variant hover:bg-surface-container-highest bg-surface-container-high transition-colors font-bold text-xs uppercase tracking-widest flex items-center gap-2"
            >
              {targetLangName}
              <span className="material-symbols-outlined text-[16px]">expand_more</span>
            </button>
            {showTargetLangDropdown && (
              <div className="absolute top-full mt-2 left-0 bg-white/90 backdrop-blur-xl rounded-xl shadow-[0_12px_40px_rgba(0,88,190,0.08)] border border-outline-variant/10 py-2 min-w-[160px] z-50">
                {targetLangs.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => {
                      setTargetLang(lang.code);
                      setShowTargetLangDropdown(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-sm font-medium transition-colors ${
                      targetLang === lang.code
                        ? "text-primary bg-primary/5"
                        : "text-on-surface hover:bg-surface-container-high"
                    }`}
                  >
                    {lang.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        {/* Swap Button — absolute center of the grid gap */}
        <button
          onClick={swapLanguages}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full primary-gradient text-on-primary flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all ring-4 ring-white/10"
        >
          <span className="material-symbols-outlined">swap_horiz</span>
        </button>
      </section>

      {/* Translation Area (Dual Pane) */}
      <section className="flex-1 grid grid-cols-2 gap-[4.5rem] min-h-[400px]">
        {/* Source Pane */}
        <div className="bg-surface-container-lowest rounded-3xl shadow-[0_12px_40px_rgba(0,88,190,0.08)] flex flex-col p-8 relative">
          <div className="mb-4 flex justify-between items-center">
            <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-on-surface-variant">
              Editorial Input
            </span>
            <div className="flex gap-3">
              <button
                onClick={handleSpeakSource}
                disabled={!sourceText}
                className={`transition-colors disabled:opacity-30 ${
                  isSpeakingSource
                    ? "text-primary animate-pulse"
                    : "text-on-surface-variant opacity-40 hover:opacity-100"
                }`}
                title={isSpeakingSource ? "Stop reading" : "Read aloud"}
              >
                <span className="material-symbols-outlined">
                  {isSpeakingSource ? "stop_circle" : "volume_up"}
                </span>
              </button>
              <button
                onClick={handleMic}
                className={`transition-opacity ${
                  isListening
                    ? "text-error opacity-100 animate-pulse"
                    : "text-on-surface-variant opacity-40 hover:opacity-100"
                }`}
                title={isListening ? "Stop listening" : "Start voice input"}
              >
                <span className="material-symbols-outlined">mic</span>
              </button>
            </div>
          </div>
          <textarea
            ref={textareaRef}
            value={sourceText}
            onChange={(e) => setSourceText(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 w-full bg-transparent border-none focus:ring-0 focus:outline-none text-xl text-on-surface resize-none placeholder:text-on-surface-variant/30"
            placeholder="Enter text to translate..."
          />
          <div className="mt-6 flex justify-between items-end">
            <span className="text-[10px] font-bold text-on-surface-variant opacity-40">
              {sourceText.length} CHARACTERS
            </span>
            <button
              onClick={translate}
              disabled={isLoading || !sourceText.trim()}
              className="primary-gradient px-8 py-3 rounded-xl text-on-primary font-bold shadow-lg shadow-blue-500/20 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  Translating
                  <span className="material-symbols-outlined animate-spin">
                    progress_activity
                  </span>
                </>
              ) : (
                <>
                  Translate
                  <span className="material-symbols-outlined">arrow_forward</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Target Pane */}
        <div className="bg-surface-container-low rounded-3xl flex flex-col p-8">
          <div className="mb-4 flex justify-between items-center">
            <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-on-surface-variant">
              Neural Output
            </span>
            <div className="flex gap-4">
              <button
                onClick={handleSpeak}
                disabled={!targetText}
                className={`transition-colors disabled:opacity-30 ${
                  isSpeaking
                    ? "text-primary animate-pulse"
                    : "text-on-surface-variant hover:text-primary"
                }`}
                title={isSpeaking ? "Stop speaking" : "Read aloud"}
              >
                <span className="material-symbols-outlined">
                  {isSpeaking ? "stop_circle" : "volume_up"}
                </span>
              </button>
              <button
                onClick={handleCopy}
                disabled={!targetText}
                className="text-on-surface-variant hover:text-primary transition-colors disabled:opacity-30"
                title="Copy to clipboard"
              >
                <span className="material-symbols-outlined">
                  {copySuccess ? "check" : "content_copy"}
                </span>
              </button>
            </div>
          </div>
          <div className="flex-1 text-xl text-on-surface leading-relaxed">
            {targetText ? (
              targetText
            ) : (
              <span className="italic text-on-surface-variant/30">
                Translation will appear here...
              </span>
            )}
          </div>
          <div className="mt-6 pt-4 border-t border-outline-variant/10 flex items-center justify-between">
            <div className="relative flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  targetText ? "bg-emerald-500" : "bg-slate-400"
                }`}
              />
              <button
                onClick={() => setShowEngineDropdown(!showEngineDropdown)}
                className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1"
              >
                {currentProvider?.name || engine}
                <span className="material-symbols-outlined text-[14px]">expand_more</span>
              </button>
              {showEngineDropdown && (
                <div className="absolute bottom-full mb-2 left-0 bg-white/95 backdrop-blur-xl rounded-xl shadow-[0_12px_40px_rgba(0,88,190,0.08)] border border-outline-variant/10 py-2 min-w-[220px] z-50 max-h-[300px] overflow-y-auto">
                  {availableEngines.map((p) => (
                    <button
                      key={p.key}
                      onClick={() => {
                        setEngine(p.key);
                        setShowEngineDropdown(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-sm font-medium transition-colors flex items-center gap-3 ${
                        engine === p.key
                          ? "text-primary bg-primary/5"
                          : "text-on-surface hover:bg-surface-container-high"
                      }`}
                    >
                      <span className="material-symbols-outlined text-lg">
                        {p.icon}
                      </span>
                      <span className="flex-1">{p.name}</span>
                      {engine === p.key && (
                        <span className="material-symbols-outlined text-primary text-base">check</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={handleStar}
              disabled={!targetText}
              className={`transition-colors disabled:opacity-30 ${
                starred
                  ? "text-amber-500"
                  : "text-on-surface-variant hover:text-primary"
              }`}
              title={starred ? "Remove from favorites" : "Add to favorites"}
            >
              <span
                className="material-symbols-outlined"
                style={
                  starred
                    ? { fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" }
                    : undefined
                }
              >
                star
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* History Shelf */}
      <section className="shrink-0 bg-surface-container rounded-t-[32px] -mx-8 -mb-8 px-8 pt-6 pb-8 flex flex-col gap-3">
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-on-surface text-sm flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">update</span>
            Recent Translations
          </h3>
          <button
            onClick={() => navigate("/history")}
            className="text-[10px] font-bold uppercase tracking-widest text-primary hover:underline"
          >
            View Full History
          </button>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
          {history.length === 0 ? (
            <div className="text-sm text-on-surface-variant/50 italic py-4">
              No translations yet
            </div>
          ) : (
            history.slice(0, 10).map((item) => (
              <div
                key={item.id}
                onClick={() => fillFromHistory(item)}
                className="flex-shrink-0 w-64 bg-surface-container-lowest p-3 rounded-lg shadow-sm hover:bg-surface-container-highest transition-colors cursor-pointer"
              >
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-[8px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full uppercase leading-none">
                    {getProvider(item.engine)?.name || item.engine}
                  </span>
                  <span className="text-[8px] font-bold text-on-surface-variant opacity-40">
                    {formatTime(item.timestamp)}
                  </span>
                </div>
                <p className="text-[11px] font-bold text-on-surface line-clamp-1 leading-tight">
                  {item.sourceText}
                </p>
                <p className="text-[11px] text-on-surface-variant line-clamp-1 leading-tight mt-0.5">
                  {item.targetText}
                </p>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
