import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEFAULT_API_SETTINGS,
  MAX_USER_PREFERENCE_LENGTH,
  normalizeApiSettings,
  serializeApiSettings
} from "./apiSettings";

describe("apiSettings", () => {
  it("defaults user preference to an empty optional prompt", () => {
    assert.equal(DEFAULT_API_SETTINGS.userPreference, "");
    assert.equal(normalizeApiSettings(null).userPreference, "");
  });

  it("preserves user preference while normalizing settings", () => {
    const normalized = normalizeApiSettings({
      providerId: "openrouter",
      userPreference: "  Always answer in concise Chinese.  "
    });

    assert.equal(
      normalized.userPreference,
      "  Always answer in concise Chinese.  "
    );
  });

  it("trims user preference only for request serialization", () => {
    const serialized = serializeApiSettings({
      ...DEFAULT_API_SETTINGS,
      userPreference: "  Prefer compact answers.  "
    });

    assert.equal(serialized.userPreference, "Prefer compact answers.");
  });

  it("caps user preference length", () => {
    const oversizedPreference = "x".repeat(MAX_USER_PREFERENCE_LENGTH + 1);
    const normalized = normalizeApiSettings({
      ...DEFAULT_API_SETTINGS,
      userPreference: oversizedPreference
    });

    assert.equal(normalized.userPreference.length, MAX_USER_PREFERENCE_LENGTH);
  });

  it("omits manual API key when environment key source is selected", () => {
    const serialized = serializeApiSettings({
      ...DEFAULT_API_SETTINGS,
      apiKeySource: "environment",
      apiKey: "secret",
      userPreference: "Use a warmer tone."
    });

    assert.equal(serialized.apiKey, "");
    assert.equal(serialized.userPreference, "Use a warmer tone.");
  });
});
