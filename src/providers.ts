export interface EngineProvider {
  key: string;
  name: string;
  type: "traditional" | "global-llm" | "domestic-llm" | "local";
  icon: string;
  needsApiKey: boolean;
  defaultEndpoint?: string;
  defaultModel?: string;
  models?: string[];
  subtitle?: string;
}

export const LANGUAGES = [
  { code: "auto", name: "Auto Detect" },
  { code: "en", name: "English" },
  { code: "zh", name: "Chinese" },
  { code: "ja", name: "Japanese" },
  { code: "ko", name: "Korean" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
  { code: "es", name: "Spanish" },
  { code: "ru", name: "Russian" },
  { code: "ar", name: "Arabic" },
  { code: "pt", name: "Portuguese" },
];

export const PROVIDERS: EngineProvider[] = [
  // Traditional
  {
    key: "mymemory",
    name: "MyMemory",
    type: "traditional",
    icon: "translate",
    needsApiKey: false,
    subtitle: "Free Translation API",
  },
  {
    key: "deepl",
    name: "DeepL Pro",
    type: "traditional",
    icon: "neurology",
    needsApiKey: true,
    subtitle: "High Accuracy Translation",
  },
  {
    key: "google",
    name: "Google Cloud Translation",
    type: "traditional",
    icon: "google",
    needsApiKey: true,
    subtitle: "Multi-language Coverage",
  },
  // Global LLMs
  {
    key: "openai",
    name: "OpenAI",
    type: "global-llm",
    icon: "auto_awesome",
    needsApiKey: true,
    defaultEndpoint: "https://api.openai.com/v1/chat/completions",
    defaultModel: "gpt-4o",
    models: ["gpt-4o", "gpt-4-turbo", "gpt-3.5-turbo"],
    subtitle: "Enterprise-grade reasoning for complex semantic mapping.",
  },
  {
    key: "claude",
    name: "Anthropic Claude",
    type: "global-llm",
    icon: "psychology",
    needsApiKey: true,
    defaultEndpoint: "https://api.anthropic.com/v1/messages",
    defaultModel: "claude-sonnet-4-20250514",
    models: ["claude-sonnet-4-20250514", "claude-3-5-sonnet-latest", "claude-3-opus-latest"],
    subtitle: "Advanced reasoning and nuanced translation.",
  },
  {
    key: "nvidia",
    name: "NVIDIA NIM",
    type: "global-llm",
    icon: "memory",
    needsApiKey: true,
    defaultEndpoint: "https://integrate.api.nvidia.com/v1/chat/completions",
    defaultModel: "meta/llama-3.1-405b-instruct",
    models: ["meta/llama-3.1-405b-instruct", "meta/llama-3.1-70b-instruct"],
    subtitle: "GPU-accelerated inference at scale.",
  },
  // Domestic LLMs
  {
    key: "deepseek",
    name: "DeepSeek",
    type: "domestic-llm",
    icon: "model_training",
    needsApiKey: true,
    defaultEndpoint: "https://api.deepseek.com/v1/chat/completions",
    defaultModel: "deepseek-chat",
    models: ["deepseek-chat", "deepseek-coder"],
    subtitle: "Deep reasoning model.",
  },
  {
    key: "qwen",
    name: "Qwen",
    type: "domestic-llm",
    icon: "cloud",
    needsApiKey: true,
    defaultEndpoint: "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
    defaultModel: "qwen-plus",
    models: ["qwen-plus", "qwen-max", "qwen-turbo"],
    subtitle: "Alibaba Cloud LLM.",
  },
  {
    key: "zhipu",
    name: "Zhipu AI",
    type: "domestic-llm",
    icon: "hub",
    needsApiKey: true,
    defaultEndpoint: "https://open.bigmodel.cn/api/paas/v4/chat/completions",
    defaultModel: "glm-4-flash",
    models: ["glm-4-flash", "glm-4", "glm-3-turbo"],
    subtitle: "Zhipu GLM series.",
  },
  {
    key: "kimi",
    name: "Kimi",
    type: "domestic-llm",
    icon: "smart_toy",
    needsApiKey: true,
    defaultEndpoint: "https://api.moonshot.cn/v1/chat/completions",
    defaultModel: "moonshot-v1-8k",
    models: ["moonshot-v1-8k", "moonshot-v1-32k", "moonshot-v1-128k"],
    subtitle: "Moonshot AI.",
  },
  {
    key: "doubao",
    name: "Doubao (ByteDance)",
    type: "domestic-llm",
    icon: "volcano",
    needsApiKey: true,
    defaultEndpoint: "https://ark.cn-beijing.volces.com/api/v3/chat/completions",
    defaultModel: "doubao-pro-32k",
    models: ["doubao-pro-32k", "doubao-lite-32k"],
    subtitle: "ByteDance Volcano Engine.",
  },
  // Local
  {
    key: "ollama",
    name: "Ollama",
    type: "local",
    icon: "dns",
    needsApiKey: false,
    defaultEndpoint: "http://localhost:11434/v1/chat/completions",
    defaultModel: "llama3.1",
    models: ["llama3.1", "llama3:8b-instruct", "mistral:7b", "gemma:7b"],
    subtitle: "Run models locally with zero latency.",
  },
];

export const HEADER_ENGINES = PROVIDERS.filter(
  (p) => p.type === "traditional" || p.key === "ollama"
);

export function getProvider(key: string): EngineProvider | undefined {
  return PROVIDERS.find((p) => p.key === key);
}
