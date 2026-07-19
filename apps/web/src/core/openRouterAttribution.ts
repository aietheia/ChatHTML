export const OPENROUTER_APP_URL = "https://chat.aietheia.com";
export const OPENROUTER_APP_TITLE = "ChatHTML";

export type OpenRouterProviderDescriptor = {
  providerId?: unknown;
  providerName?: unknown;
  baseUrl?: unknown;
};

function normalizedString(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function isOpenRouterProvider(
  provider: OpenRouterProviderDescriptor
): boolean {
  return (
    normalizedString(provider.providerId) === "openrouter" ||
    normalizedString(provider.providerName).includes("openrouter") ||
    normalizedString(provider.baseUrl).includes("openrouter.ai")
  );
}

export function createOpenRouterAttributionHeaders(
  provider: OpenRouterProviderDescriptor
): Record<string, string> {
  if (!isOpenRouterProvider(provider)) {
    return {};
  }

  return {
    "HTTP-Referer": OPENROUTER_APP_URL,
    "X-OpenRouter-Title": OPENROUTER_APP_TITLE
  };
}
