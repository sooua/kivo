import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface LlmConfig {
  apiKey: string;
  endpoint: string;
  model: string;
}

export interface HistoryItem {
  id: number;
  sourceText: string;
  targetText: string;
  sourceLang: string;
  targetLang: string;
  engine: string;
  timestamp: number;
}

export interface FavoriteItem {
  id: number;
  sourceText: string;
  targetText: string;
  sourceLang: string;
  targetLang: string;
  engine: string;
  timestamp: number;
}

interface TranslateStore {
  sourceText: string;
  targetText: string;
  sourceLang: string;
  targetLang: string;
  engine: string;
  isLoading: boolean;
  error: string | null;

  apiKeys: Record<string, string>;
  llmConfigs: Record<string, LlmConfig>;

  history: HistoryItem[];
  favorites: FavoriteItem[];
  verifiedEngines: Record<string, boolean>;

  setSourceText: (text: string) => void;
  setTargetText: (text: string) => void;
  setSourceLang: (lang: string) => void;
  setTargetLang: (lang: string) => void;
  setEngine: (engine: string) => void;
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  swapLanguages: () => void;
  setApiKey: (engine: string, key: string) => void;
  setLlmConfig: (engine: string, config: Partial<LlmConfig>) => void;
  addHistory: (item: Omit<HistoryItem, "id" | "timestamp">) => void;
  fillFromHistory: (item: HistoryItem) => void;
  toggleFavorite: (item: Omit<FavoriteItem, "id" | "timestamp">) => void;
  setVerified: (engine: string, verified: boolean) => void;
  clearVerified: (engine: string) => void;
  isFavorite: (sourceText: string, targetText: string) => boolean;
}

export const useStore = create<TranslateStore>()(
  persist(
    (set, get) => ({
      sourceText: "",
      targetText: "",
      sourceLang: "auto",
      targetLang: "zh",
      engine: "mymemory",
      isLoading: false,
      error: null,
      apiKeys: {},
      llmConfigs: {},
      history: [],
      favorites: [],
      verifiedEngines: { mymemory: true },

      setSourceText: (text) => set({ sourceText: text }),
      setTargetText: (text) => set({ targetText: text }),
      setSourceLang: (lang) => set({ sourceLang: lang }),
      setTargetLang: (lang) => set({ targetLang: lang }),
      setEngine: (engine) => set({ engine }),
      setIsLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),

      swapLanguages: () => {
        const { sourceLang, targetLang, sourceText, targetText } = get();
        if (sourceLang === "auto") {
          // When source is auto-detect, swap to target as source, default English as target
          set({
            sourceLang: targetLang,
            targetLang: "en",
            sourceText: targetText,
            targetText: sourceText,
          });
        } else {
          set({
            sourceLang: targetLang,
            targetLang: sourceLang,
            sourceText: targetText,
            targetText: sourceText,
          });
        }
      },

      setApiKey: (engine, key) =>
        set((state) => ({
          apiKeys: { ...state.apiKeys, [engine]: key },
        })),

      setLlmConfig: (engine, config) =>
        set((state) => ({
          llmConfigs: {
            ...state.llmConfigs,
            [engine]: {
              ...((state.llmConfigs[engine] as LlmConfig) || {
                apiKey: "",
                endpoint: "",
                model: "",
              }),
              ...config,
            },
          },
        })),

      addHistory: (item) =>
        set((state) => ({
          history: [
            {
              ...item,
              id: Date.now(),
              timestamp: Date.now(),
            },
            ...state.history,
          ].slice(0, 50),
        })),

      fillFromHistory: (item) =>
        set({
          sourceText: item.sourceText,
          targetText: item.targetText,
          sourceLang: item.sourceLang,
          targetLang: item.targetLang,
        }),

      toggleFavorite: (item) =>
        set((state) => {
          const exists = state.favorites.find(
            (f) => f.sourceText === item.sourceText && f.targetText === item.targetText
          );
          if (exists) {
            return {
              favorites: state.favorites.filter((f) => f.id !== exists.id),
            };
          }
          return {
            favorites: [
              { ...item, id: Date.now(), timestamp: Date.now() },
              ...state.favorites,
            ],
          };
        }),

      isFavorite: (sourceText, targetText) => {
        return get().favorites.some(
          (f) => f.sourceText === sourceText && f.targetText === targetText
        );
      },

      setVerified: (engine, verified) =>
        set((state) => ({
          verifiedEngines: { ...state.verifiedEngines, [engine]: verified },
        })),

      clearVerified: (engine) =>
        set((state) => {
          const next = { ...state.verifiedEngines };
          delete next[engine];
          return { verifiedEngines: next };
        }),
    }),
    {
      name: "kivo-store",
      partialize: (state) => ({
        apiKeys: state.apiKeys,
        llmConfigs: state.llmConfigs,
        history: state.history,
        favorites: state.favorites,
        verifiedEngines: state.verifiedEngines,
        engine: state.engine,
        sourceLang: state.sourceLang,
        targetLang: state.targetLang,
      }),
    }
  )
);
