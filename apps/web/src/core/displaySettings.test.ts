import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEFAULT_DISPLAY_SETTINGS,
  normalizeDisplaySettings
} from "./displaySettings";

describe("displaySettings", () => {
  it("hides raw stream by default", () => {
    assert.equal(DEFAULT_DISPLAY_SETTINGS.showRawStream, false);
    assert.equal(normalizeDisplaySettings(null).showRawStream, false);
  });

  it("preserves the raw stream visibility toggle", () => {
    assert.equal(
      normalizeDisplaySettings({ showRawStream: true }).showRawStream,
      true
    );
  });
});
