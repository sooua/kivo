import { invoke } from "@tauri-apps/api/core";
import { useStore } from "./store";
import { getProvider } from "./providers";

export function useTranslate() {
  const {
    sourceText,
    sourceLang,
    targetLang,
    engine,
    apiKeys,
    llmConfigs,
    setTargetText,
    setIsLoading,
    setError,
    addHistory,
  } = useStore();

  const translate = async () => {
    if (!sourceText.trim()) return;

    setIsLoading(true);
    setError(null);

    const provider = getProvider(engine);
    if (!provider) {
      setError(`Unknown engine: ${engine}`);
      setIsLoading(false);
      return;
    }

    const config = llmConfigs[engine];
    const apiKey =
      apiKeys[engine] || config?.apiKey || undefined;
    const baseUrl = config?.endpoint || provider.defaultEndpoint || undefined;
    const model = config?.model || provider.defaultModel || undefined;

    try {
      const result = await invoke<{ text: string; engine: string }>(
        "translate",
        {
          req: {
            text: sourceText,
            from: sourceLang,
            to: targetLang,
            engine,
            api_key: apiKey || null,
            base_url: baseUrl || null,
            model: model || null,
          },
        }
      );

      setTargetText(result.text);
      addHistory({
        sourceText,
        targetText: result.text,
        sourceLang,
        targetLang,
        engine,
      });
    } catch (err: unknown) {
      setError(typeof err === "string" ? err : String(err));
    } finally {
      setIsLoading(false);
    }
  };

  return { translate };
}
