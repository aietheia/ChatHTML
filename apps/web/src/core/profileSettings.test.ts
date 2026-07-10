import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEFAULT_PROFILE_SETTINGS,
  normalizeProfileSettings
} from "./profileSettings";

describe("profileSettings", () => {
  it("defaults to a neutral avatar placeholder", () => {
    assert.deepEqual(normalizeProfileSettings(null), DEFAULT_PROFILE_SETTINGS);
  });

  it("keeps raster image data URLs and rejects other values", () => {
    const avatarDataUrl = "data:image/png;base64,ZmFrZQ==";

    assert.equal(normalizeProfileSettings({ avatarDataUrl }).avatarDataUrl, avatarDataUrl);
    assert.equal(
      normalizeProfileSettings({
        avatarDataUrl: "data:image/svg+xml;base64,PHN2Zy8+"
      }).avatarDataUrl,
      ""
    );
  });
});
