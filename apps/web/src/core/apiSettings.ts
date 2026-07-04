export type ApiProviderId = "openrouter" | "openai" | "local" | "custom";

export type ReasoningEffort =
  | "none"
  | "minimal"
  | "low"
  | "medium"
  | "high"
  | "xhigh";

export type ApiKeySource = "environment" | "manual";

export type ApiSettings = {
  providerId: ApiProviderId;
  providerName: string;
  baseUrl: string;
  apiKeySource: ApiKeySource;
  apiKey: string;
  model: string;
  reasoningEffort: ReasoningEffort;
};

export type ApiProviderPreset = {
  id: ApiProviderId;
  label: string;
  baseUrl: string;
  model: string;
  reasoningEffort: ReasoningEffort;
};

export const API_SETTINGS_STORAGE_KEY = "streamui.apiSettings.v1";

export const API_PROVIDER_PRESETS: ApiProviderPreset[] = [
  {
    id: "openrouter",
    label: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    model: "google/gemini-3.1-pro-preview",
    reasoningEffort: "low"
  },
  {
    id: "openai",
    label: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-4.1",
    reasoningEffort: "none"
  },
  {
    id: "local",
    label: "Local",
    baseUrl: "http://127.0.0.1:11434/v1",
    model: "llama3.1",
    reasoningEffort: "none"
  },
  {
    id: "custom",
    label: "Custom",
    baseUrl: "",
    model: "",
    reasoningEffort: "none"
  }
];

export const REASONING_EFFORT_OPTIONS: Array<{
  value: ReasoningEffort;
  label: string;
}> = [
  { value: "none", label: "None" },
  { value: "minimal", label: "Minimal" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "xhigh", label: "XHigh" }
];

export const API_KEY_SOURCE_OPTIONS: Array<{
  value: ApiKeySource;
  label: string;
}> = [
  { value: "environment", label: "Environment" },
  { value: "manual", label: "Manual" }
];

const DEFAULT_PRESET = API_PROVIDER_PRESETS[0];

export const DEFAULT_API_SETTINGS: ApiSettings = {
  providerId: DEFAULT_PRESET.id,
  providerName: DEFAULT_PRESET.label,
  baseUrl: DEFAULT_PRESET.baseUrl,
  apiKeySource: "environment",
  apiKey: "",
  model: DEFAULT_PRESET.model,
  reasoningEffort: DEFAULT_PRESET.reasoningEffort
};

function isProviderId(value: unknown): value is ApiProviderId {
  return API_PROVIDER_PRESETS.some((preset) => preset.id === value);
}

function isReasoningEffort(value: unknown): value is ReasoningEffort {
  return REASONING_EFFORT_OPTIONS.some((option) => option.value === value);
}

function isApiKeySource(value: unknown): value is ApiKeySource {
  return API_KEY_SOURCE_OPTIONS.some((option) => option.value === value);
}

export function getProviderPreset(id: ApiProviderId): ApiProviderPreset {
  return (
    API_PROVIDER_PRESETS.find((preset) => preset.id === id) ?? DEFAULT_PRESET
  );
}

export function normalizeApiSettings(input: unknown): ApiSettings {
  const object =
    typeof input === "object" && input !== null
      ? (input as Partial<ApiSettings>)
      : {};
  const providerId = isProviderId(object.providerId)
    ? object.providerId
    : DEFAULT_API_SETTINGS.providerId;
  const preset = getProviderPreset(providerId);
  const providerName =
    typeof object.providerName === "string" && object.providerName.trim()
      ? object.providerName.trim()
      : preset.label;

  return {
    providerId,
    providerName,
    baseUrl:
      typeof object.baseUrl === "string" ? object.baseUrl.trim() : preset.baseUrl,
    apiKeySource: isApiKeySource(object.apiKeySource)
      ? object.apiKeySource
      : DEFAULT_API_SETTINGS.apiKeySource,
    apiKey: typeof object.apiKey === "string" ? object.apiKey.trim() : "",
    model: typeof object.model === "string" ? object.model.trim() : preset.model,
    reasoningEffort: isReasoningEffort(object.reasoningEffort)
      ? object.reasoningEffort
      : preset.reasoningEffort
  };
}

export function loadApiSettings(): ApiSettings {
  if (typeof window === "undefined") {
    return DEFAULT_API_SETTINGS;
  }

  try {
    return normalizeApiSettings(
      JSON.parse(window.localStorage.getItem(API_SETTINGS_STORAGE_KEY) ?? "null")
    );
  } catch {
    return DEFAULT_API_SETTINGS;
  }
}

export function saveApiSettings(settings: ApiSettings): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    API_SETTINGS_STORAGE_KEY,
    JSON.stringify(normalizeApiSettings(settings))
  );
}

export function serializeApiSettings(settings: ApiSettings): ApiSettings {
  const normalized = normalizeApiSettings(settings);
  return {
    ...normalized,
    apiKey: normalized.apiKeySource === "manual" ? normalized.apiKey : ""
  };
}

export function hasCompleteApiSettings(settings: ApiSettings): boolean {
  const normalized = normalizeApiSettings(settings);
  return Boolean(
    (normalized.apiKeySource === "environment" || normalized.apiKey.trim()) &&
      normalized.baseUrl.trim() &&
      normalized.model.trim()
  );
}

export function getApiKeyEnvironmentName(settings: ApiSettings): string {
  const normalized = normalizeApiSettings(settings);

  if (normalized.providerId === "openrouter") {
    return "OPENROUTER_API_KEY";
  }
  if (normalized.providerId === "openai") {
    return "OPENAI_API_KEY";
  }

  return "STREAMUI_API_KEY";
}
