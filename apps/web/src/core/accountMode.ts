export type AccountMode = "unselected" | "local";

export const ACCOUNT_MODE_STORAGE_KEY = "chathtml.accountMode.v1";
export const DEFAULT_ACCOUNT_MODE: AccountMode = "unselected";

export type AccountModeStorage = Pick<Storage, "getItem" | "setItem">;

function browserLocalStorage(): AccountModeStorage | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }

  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

export function normalizeAccountMode(value: unknown): AccountMode {
  return value === "local" ? "local" : DEFAULT_ACCOUNT_MODE;
}

export function loadAccountMode(
  storage: AccountModeStorage | undefined = browserLocalStorage()
): AccountMode {
  if (!storage) {
    return DEFAULT_ACCOUNT_MODE;
  }

  try {
    return normalizeAccountMode(storage.getItem(ACCOUNT_MODE_STORAGE_KEY));
  } catch {
    return DEFAULT_ACCOUNT_MODE;
  }
}

export function saveAccountMode(
  mode: AccountMode,
  storage: AccountModeStorage | undefined = browserLocalStorage()
): void {
  if (!storage) {
    return;
  }

  try {
    storage.setItem(ACCOUNT_MODE_STORAGE_KEY, normalizeAccountMode(mode));
  } catch {
    // Local mode should still work for the current page when storage is blocked.
  }
}
