import { useStore } from "../store";
import { PROVIDERS } from "../providers";
import { useState, useRef, useEffect } from "react";

const traditionalEngines = PROVIDERS.filter((p) => p.type === "traditional");
const llmEngines = PROVIDERS.filter(
  (p) => p.type === "global-llm" || p.type === "domestic-llm" || p.type === "local"
);

export default function Header() {
  const { engine, setEngine } = useStore();
  const [showLlmDropdown, setShowLlmDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isLlm = llmEngines.some((e) => e.key === engine);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowLlmDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="fixed top-0 right-0 h-14 left-20 bg-white/80 backdrop-blur-xl flex justify-between items-center px-8 z-40">
      <div className="flex items-center gap-8">
        <h1 className="text-xl font-black text-slate-900 tracking-tighter">
          Kivo
        </h1>
        <nav className="hidden md:flex gap-1 items-center">
          {traditionalEngines.map((p) => (
            <button
              key={p.key}
              onClick={() => setEngine(p.key)}
              className={`px-4 py-1 font-bold text-sm tracking-tight rounded-full transition-all ${
                engine === p.key
                  ? "bg-blue-700 text-white shadow-lg shadow-blue-500/20"
                  : "text-slate-500 hover:text-blue-600"
              }`}
            >
              {p.name}
            </button>
          ))}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowLlmDropdown(!showLlmDropdown)}
              className={`px-4 py-1 font-bold text-sm tracking-tight rounded-full transition-all flex items-center gap-1 ${
                isLlm
                  ? "bg-blue-700 text-white shadow-lg shadow-blue-500/20"
                  : "text-slate-500 hover:text-blue-600"
              }`}
            >
              LLMs
              <span className="material-symbols-outlined text-[16px]">
                expand_more
              </span>
            </button>
            {showLlmDropdown && (
              <div className="absolute top-full mt-2 left-0 bg-white/90 backdrop-blur-xl rounded-xl shadow-[0_12px_40px_rgba(0,88,190,0.08)] border border-outline-variant/10 py-2 min-w-[200px] z-50">
                {llmEngines.map((p) => (
                  <button
                    key={p.key}
                    onClick={() => {
                      setEngine(p.key);
                      setShowLlmDropdown(false);
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
                    {p.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </nav>
      </div>
      <div className="flex items-center gap-4">
        <button className="text-slate-500 hover:text-blue-700 transition-colors">
          <span className="material-symbols-outlined">dark_mode</span>
        </button>
        <button className="text-slate-500 hover:text-blue-700 transition-colors">
          <span className="material-symbols-outlined">settings</span>
        </button>
      </div>
    </header>
  );
}
