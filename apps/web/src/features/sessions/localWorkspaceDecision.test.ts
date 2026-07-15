import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  clearKeptLocalWorkspace,
  hasKeptLocalWorkspace,
  rememberKeptLocalWorkspace
} from "./localWorkspaceDecision";

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => void values.set(key, value),
    removeItem: (key: string) => void values.delete(key)
  };
}

describe("local workspace merge decision", () => {
  it("remembers a declined workspace version per account", () => {
    const storage = memoryStorage();
    rememberKeptLocalWorkspace("user-a", "version-1", storage);

    assert.equal(hasKeptLocalWorkspace("user-a", "version-1", storage), true);
    assert.equal(hasKeptLocalWorkspace("user-a", "version-2", storage), false);
    assert.equal(hasKeptLocalWorkspace("user-b", "version-1", storage), false);

    clearKeptLocalWorkspace("user-a", storage);
    assert.equal(hasKeptLocalWorkspace("user-a", "version-1", storage), false);
  });
});
