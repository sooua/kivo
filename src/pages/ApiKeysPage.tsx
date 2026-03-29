import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useStore } from "../store";
import { PROVIDERS, EngineProvider, getProvider } from "../providers";

function PasswordInput({
  value,
  onChange,
  placeholder,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  label: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div>
      <label className="text-[10px] font-black uppercase text-on-surface-variant mb-1 block">
        {label}
      </label>
      <div className="relative">
        <input
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-surface-container-lowest border-none rounded-lg p-3 pr-10 text-sm focus:ring-2 focus:ring-primary/20"
        />
        <button
          type="button"
          onClick={() => setVisible(!visible)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant"
        >
          <span className="material-symbols-outlined text-lg">
            {visible ? "visibility_off" : "visibility"}
          </span>
        </button>
      </div>
    </div>
  );
}

function TraditionalCard({ provider }: { provider: EngineProvider }) {
  const { apiKeys, setApiKey, verifiedEngines, setVerified, clearVerified } = useStore();
  const key = apiKeys[provider.key] || "";
  const verified = !!verifiedEngines[provider.key];
  const [testing, setTesting] = useState(false);
  const [testMsg, setTestMsg] = useState("");

  const handleTest = async () => {
    if (!key) return;
    setTesting(true);
    setTestMsg("");
    try {
      const msg = await invoke<string>("test_connection", {
        req: {
          text: "hello",
          from: "en",
          to: "zh",
          engine: provider.key,
          api_key: key,
          base_url: null,
          model: null,
        },
      });
      setVerified(provider.key, true);
      setTestMsg(msg);
    } catch (err: unknown) {
      clearVerified(provider.key);
      setTestMsg(typeof err === "string" ? err : String(err));
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="bg-surface-container-low p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-xl font-black">{provider.name}</h3>
          <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
            {provider.subtitle}
          </span>
        </div>
        <span
          className={`text-[10px] font-black px-3 py-1 rounded-full flex items-center gap-1 uppercase tracking-wider ${
            verified
              ? "bg-emerald-100 text-emerald-700"
              : "bg-surface-container-highest text-on-surface-variant"
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${verified ? "bg-emerald-500" : "bg-slate-400"}`} />
          {verified ? "Connected" : "Disconnected"}
        </span>
      </div>
      <div className="space-y-4">
        <PasswordInput
          label="API Authentication Key"
          placeholder="Enter API Key"
          value={key}
          onChange={(v) => { setApiKey(provider.key, v); clearVerified(provider.key); }}
        />
        {testMsg && (
          <p className={`text-xs ${verified ? "text-emerald-600" : "text-error"}`}>{testMsg}</p>
        )}
        <button
          onClick={handleTest}
          disabled={!key || testing}
          className="w-full bg-primary text-on-primary font-bold py-3 rounded-lg hover:opacity-90 transition-opacity active:scale-[0.98] disabled:opacity-40"
        >
          {testing ? "Testing..." : "Test & Save"}
        </button>
      </div>
    </div>
  );
}

function LlmCard({ provider }: { provider: EngineProvider }) {
  const { llmConfigs, setLlmConfig, verifiedEngines, setVerified, clearVerified } = useStore();
  const config = llmConfigs[provider.key] || { apiKey: "", endpoint: "", model: "" };
  const verified = !!verifiedEngines[provider.key];
  const [testing, setTesting] = useState(false);
  const [testMsg, setTestMsg] = useState("");

  const handleTest = async () => {
    if (provider.needsApiKey && !config.apiKey) return;
    setTesting(true);
    setTestMsg("");
    try {
      const msg = await invoke<string>("test_connection", {
        req: {
          text: "hello",
          from: "en",
          to: "zh",
          engine: provider.key,
          api_key: config.apiKey || null,
          base_url: config.endpoint || provider.defaultEndpoint || null,
          model: config.model || provider.defaultModel || null,
        },
      });
      setVerified(provider.key, true);
      setTestMsg(msg);
    } catch (err: unknown) {
      clearVerified(provider.key);
      setTestMsg(typeof err === "string" ? err : String(err));
    } finally {
      setTesting(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setLlmConfig(provider.key, { [field]: value });
    clearVerified(provider.key);
    setTestMsg("");
  };

  return (
    <div className="bg-surface-container-low p-6 rounded-xl hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-5">
        <div>
          <h3 className="text-lg font-black">{provider.name}</h3>
          {provider.subtitle && (
            <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
              {provider.subtitle}
            </span>
          )}
        </div>
        <span
          className={`text-[8px] font-black px-2.5 py-1 rounded-full flex items-center gap-1 uppercase tracking-wider ${
            verified
              ? "bg-emerald-100 text-emerald-700"
              : "bg-surface-container-highest text-on-surface-variant"
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${verified ? "bg-emerald-500" : "bg-slate-400"}`} />
          {verified ? "Connected" : "Not Set"}
        </span>
      </div>
      <div className="space-y-3">
        {provider.needsApiKey && (
          <PasswordInput
            label="API Key"
            placeholder="Enter API Key"
            value={config.apiKey}
            onChange={(v) => handleChange("apiKey", v)}
          />
        )}
        <div>
          <label className="text-[10px] font-black uppercase text-on-surface-variant mb-1 block">
            Endpoint URL
          </label>
          <input
            type="text"
            value={config.endpoint}
            onChange={(e) => handleChange("endpoint", e.target.value)}
            placeholder={provider.defaultEndpoint}
            className="w-full bg-surface-container-lowest border-none rounded-lg p-3 text-sm focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div>
          <label className="text-[10px] font-black uppercase text-on-surface-variant mb-1 block">
            Model Name
          </label>
          <input
            type="text"
            value={config.model}
            onChange={(e) => handleChange("model", e.target.value)}
            placeholder={provider.defaultModel}
            className="w-full bg-surface-container-lowest border-none rounded-lg p-3 text-sm focus:ring-2 focus:ring-primary/20"
          />
        </div>
        {testMsg && (
          <p className={`text-xs ${verified ? "text-emerald-600" : "text-error"}`}>{testMsg}</p>
        )}
        <button
          onClick={handleTest}
          disabled={testing || (provider.needsApiKey && !config.apiKey)}
          className="w-full bg-primary text-on-primary font-bold py-2.5 rounded-lg hover:opacity-90 transition-opacity active:scale-[0.98] disabled:opacity-40 text-sm"
        >
          {testing ? "Testing..." : "Test & Save"}
        </button>
      </div>
    </div>
  );
}

function DomesticLlmPanel() {
  const domesticProviders = PROVIDERS.filter((p) => p.type === "domestic-llm");
  const [activeKey, setActiveKey] = useState(domesticProviders[0]?.key || "");
  const { llmConfigs, setLlmConfig, verifiedEngines, setVerified, clearVerified } = useStore();
  const [testing, setTesting] = useState(false);
  const [testMsg, setTestMsg] = useState("");

  const activeProvider = domesticProviders.find((p) => p.key === activeKey);
  const config = llmConfigs[activeKey] || { apiKey: "", endpoint: "", model: "" };

  const configuredCount = domesticProviders.filter(
    (p) => !!verifiedEngines[p.key]
  ).length;

  const handleTest = async () => {
    if (!activeProvider || !config.apiKey) return;
    setTesting(true);
    setTestMsg("");
    try {
      const msg = await invoke<string>("test_connection", {
        req: {
          text: "hello",
          from: "en",
          to: "zh",
          engine: activeKey,
          api_key: config.apiKey || null,
          base_url: config.endpoint || activeProvider.defaultEndpoint || null,
          model: config.model || activeProvider.defaultModel || null,
        },
      });
      setVerified(activeKey, true);
      setTestMsg(msg);
    } catch (err: unknown) {
      clearVerified(activeKey);
      setTestMsg(typeof err === "string" ? err : String(err));
    } finally {
      setTesting(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setLlmConfig(activeKey, { [field]: value });
    clearVerified(activeKey);
    setTestMsg("");
  };

  return (
    <div className="bg-surface-container p-8 rounded-xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-black">Domestic LLMs</h3>
          <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
            {configuredCount} of {domesticProviders.length} configured
          </span>
        </div>
      </div>

      {/* Provider tabs */}
      <div className="flex items-center gap-2 mb-8 flex-wrap">
        {domesticProviders.map((p) => {
          const isActive = activeKey === p.key;
          const hasKey = !!verifiedEngines[p.key];
          return (
            <button
              key={p.key}
              onClick={() => setActiveKey(p.key)}
              className={`px-4 py-2 rounded-full text-xs font-bold tracking-wider transition-all flex items-center gap-2 ${
                isActive
                  ? "bg-primary text-on-primary shadow-lg shadow-primary/20"
                  : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high"
              }`}
            >
              {hasKey && (
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isActive ? "bg-white" : "bg-emerald-500"
                  }`}
                />
              )}
              {p.name}
            </button>
          );
        })}
      </div>

      {/* Active provider config */}
      {activeProvider && (
        <div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <PasswordInput
              label="API Key"
              placeholder={`${activeProvider.name} API Key`}
              value={config.apiKey}
              onChange={(v) => handleChange("apiKey", v)}
            />
            <div>
              <label className="text-[10px] font-black uppercase text-on-surface-variant mb-1 block">
                Endpoint URL
              </label>
              <input
                type="text"
                value={config.endpoint}
                onChange={(e) => handleChange("endpoint", e.target.value)}
                placeholder={activeProvider.defaultEndpoint}
                className="w-full bg-surface-container-lowest border-none rounded-lg p-3 text-sm focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase text-on-surface-variant mb-1 block">
                Model Name
              </label>
              <input
                type="text"
                value={config.model}
                onChange={(e) => handleChange("model", e.target.value)}
                placeholder={activeProvider.defaultModel}
                className="w-full bg-surface-container-lowest border-none rounded-lg p-3 text-sm focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>
          {testMsg && (
            <p className={`text-xs mt-4 ${verifiedEngines[activeKey] ? "text-emerald-600" : "text-error"}`}>{testMsg}</p>
          )}
          <button
            onClick={handleTest}
            disabled={testing || !config.apiKey}
            className="mt-4 bg-primary text-on-primary font-bold py-2.5 px-8 rounded-lg hover:opacity-90 transition-opacity active:scale-[0.98] disabled:opacity-40 text-sm"
          >
            {testing ? "Testing..." : "Test & Save"}
          </button>
        </div>
      )}
    </div>
  );
}

function OllamaCard() {
  const provider = PROVIDERS.find((p) => p.key === "ollama")!;
  const { llmConfigs, setLlmConfig } = useStore();
  const config = llmConfigs["ollama"] || {
    apiKey: "",
    endpoint: "",
    model: "",
  };

  return (
    <div className="bg-slate-900 text-white p-10 rounded-xl relative overflow-hidden">
      <div className="absolute -right-20 -top-20 w-64 h-64 bg-primary/20 rounded-full blur-3xl" />
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        <div>
          <div className="flex items-center gap-4 mb-4">
            <span className="bg-primary p-3 rounded-lg">
              <span className="material-symbols-outlined text-white">dns</span>
            </span>
            <h3 className="text-3xl font-black">Ollama</h3>
          </div>
          <p className="text-slate-400 text-sm leading-relaxed mb-6">
            Run private Llama 3, Mistral, or Gemma models directly on your
            hardware. Zero latency, 100% data privacy.
          </p>
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-black uppercase text-slate-500 mb-1 block">
                Local Endpoint
              </label>
              <input
                type="text"
                value={config.endpoint}
                onChange={(e) =>
                  setLlmConfig("ollama", { endpoint: e.target.value })
                }
                placeholder={provider.defaultEndpoint}
                className="w-full bg-slate-800 border-none rounded-lg p-3 text-sm focus:ring-1 focus:ring-primary text-slate-200"
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase text-slate-500 mb-1 block">
                Model Name
              </label>
              <input
                type="text"
                value={config.model}
                onChange={(e) =>
                  setLlmConfig("ollama", { model: e.target.value })
                }
                placeholder={provider.defaultModel}
                className="w-full bg-slate-800 border-none rounded-lg p-3 text-sm text-slate-200 focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
        </div>
        <div className="bg-slate-800/50 backdrop-blur-md p-6 rounded-xl border border-white/5">
          <h4 className="text-sm font-bold mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-slate-400" />
            System Health
          </h4>
          <div className="space-y-4">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400">Connection Status</span>
              <span className="text-slate-400 font-bold">—</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400">Endpoint</span>
              <span className="text-white font-bold text-[10px]">
                {config.endpoint || provider.defaultEndpoint}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400">Active Model</span>
              <span className="text-white font-bold">
                {config.model || provider.defaultModel}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ApiKeysPage() {
  const traditionalEngines = PROVIDERS.filter(
    (p) => p.type === "traditional" && p.needsApiKey
  );
  const globalLlms = PROVIDERS.filter((p) => p.type === "global-llm");

  return (
    <div className="px-12 pt-8 pb-20 max-w-7xl mx-auto">
      {/* Header */}
      <section className="mb-16">
        <h1 className="text-4xl font-black tracking-tight text-on-surface mb-2">
          API Management
        </h1>
        <p className="text-on-surface-variant font-medium">
          Configure your translation engines and language models.
        </p>
      </section>

      {/* 1. Translation Engines */}
      <section className="mb-20">
        <div className="flex items-center gap-3 mb-8">
          <span className="material-symbols-outlined text-primary text-3xl">
            language
          </span>
          <h2 className="text-2xl font-black uppercase tracking-tight">
            Translation Engines
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {traditionalEngines.map((p) => (
            <TraditionalCard key={p.key} provider={p} />
          ))}
        </div>
      </section>

      {/* 2. Global LLMs */}
      <section className="mb-20">
        <div className="flex items-center gap-3 mb-8">
          <span className="material-symbols-outlined text-primary text-3xl">
            hub
          </span>
          <h2 className="text-2xl font-black uppercase tracking-tight">
            Global Language Models
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {globalLlms.map((p) => (
            <LlmCard key={p.key} provider={p} />
          ))}
        </div>
      </section>

      {/* 3. Domestic LLMs — shared config panel */}
      <section className="mb-20">
        <div className="flex items-center gap-3 mb-8">
          <span className="material-symbols-outlined text-primary text-3xl">
            public
          </span>
          <h2 className="text-2xl font-black uppercase tracking-tight">
            Domestic Language Models
          </h2>
        </div>
        <DomesticLlmPanel />
      </section>

      {/* 4. Local / Offline */}
      <section className="mb-20">
        <div className="flex items-center gap-3 mb-8">
          <span className="material-symbols-outlined text-primary text-3xl">
            computer
          </span>
          <h2 className="text-2xl font-black uppercase tracking-tight">
            Local / Offline Execution
          </h2>
        </div>
        <OllamaCard />
      </section>

      {/* Footer */}
      <footer className="mt-32 pt-12 border-t border-surface-container-highest">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
          <div className="space-y-2">
            <div className="text-xl font-black tracking-tighter">Kivo</div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
              Simple, Fast, Focused on Translation
            </p>
          </div>
          <nav className="flex flex-wrap gap-8 text-[11px] font-black uppercase tracking-widest text-on-surface-variant">
            <a href="https://kivo.sooua.net" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors flex items-center gap-2">
              <span className="material-symbols-outlined text-base">
                language
              </span>
              Website
            </a>
            <a href="https://github.com/sooua" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors flex items-center gap-2">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
              Author
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
