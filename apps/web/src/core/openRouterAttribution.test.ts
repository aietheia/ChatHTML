import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  OPENROUTER_APP_TITLE,
  OPENROUTER_APP_URL,
  createOpenRouterAttributionHeaders,
  isOpenRouterProvider
} from "./openRouterAttribution";

describe("OpenRouter app attribution", () => {
  it("uses one stable ChatHTML identity for OpenRouter requests", () => {
    assert.deepEqual(
      createOpenRouterAttributionHeaders({ providerId: "openrouter" }),
      {
        "HTTP-Referer": "https://chat.aietheia.com",
        "X-OpenRouter-Title": "ChatHTML"
      }
    );
    assert.equal(OPENROUTER_APP_URL, "https://chat.aietheia.com");
    assert.equal(OPENROUTER_APP_TITLE, "ChatHTML");
  });

  it("recognizes OpenRouter by preset, name, or API host", () => {
    assert.equal(isOpenRouterProvider({ providerId: "openrouter" }), true);
    assert.equal(isOpenRouterProvider({ providerName: "OpenRouter Proxy" }), true);
    assert.equal(
      isOpenRouterProvider({ baseUrl: "https://openrouter.ai/api/v1" }),
      true
    );
  });

  it("does not send ChatHTML attribution to unrelated providers", () => {
    assert.deepEqual(
      createOpenRouterAttributionHeaders({
        providerId: "custom",
        providerName: "Local provider",
        baseUrl: "http://127.0.0.1:11434/v1"
      }),
      {}
    );
  });
});
