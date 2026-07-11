import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ACCOUNT_MODE_STORAGE_KEY,
  DEFAULT_ACCOUNT_MODE,
  loadAccountMode,
  normalizeAccountMode,
  saveAccountMode,
  type AccountModeStorage
} from "./accountMode";

function memoryStorage(initial?: string): AccountModeStorage & {
  value(): string | null;
} {
  let stored = initial ?? null;
  return {
    getItem(key) {
      return key === ACCOUNT_MODE_STORAGE_KEY ? stored : null;
    },
    setItem(key, value) {
      if (key === ACCOUNT_MODE_STORAGE_KEY) {
        stored = value;
      }
    },
    value() {
      return stored;
    }
  };
}

describe("account mode", () => {
  it("accepts only an explicit local choice", () => {
    assert.equal(normalizeAccountMode("local"), "local");
    assert.equal(normalizeAccountMode("cloud"), DEFAULT_ACCOUNT_MODE);
    assert.equal(normalizeAccountMode(null), DEFAULT_ACCOUNT_MODE);
  });

  it("persists and restores the local choice", () => {
    const storage = memoryStorage();

    assert.equal(loadAccountMode(storage), "unselected");
    saveAccountMode("local", storage);
    assert.equal(storage.value(), "local");
    assert.equal(loadAccountMode(storage), "local");
  });

  it("falls back safely when browser storage is unavailable", () => {
    const blockedStorage: AccountModeStorage = {
      getItem() {
        throw new Error("blocked");
      },
      setItem() {
        throw new Error("blocked");
      }
    };

    assert.equal(loadAccountMode(blockedStorage), "unselected");
    assert.doesNotThrow(() => saveAccountMode("local", blockedStorage));
  });
});
