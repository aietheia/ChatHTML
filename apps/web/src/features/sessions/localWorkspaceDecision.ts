import type { WorkspaceStorage } from "./browserLocalWorkspace";

const LOCAL_WORKSPACE_DECISION_PREFIX =
  "chathtml.localWorkspaceDecision.v1:";

function browserStorage(): WorkspaceStorage | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

function decisionKey(userId: string): string {
  return `${LOCAL_WORKSPACE_DECISION_PREFIX}${userId}`;
}

export function hasKeptLocalWorkspace(
  userId: string,
  signature: string,
  storage: WorkspaceStorage | undefined = browserStorage()
): boolean {
  try {
    return storage?.getItem(decisionKey(userId)) === signature;
  } catch {
    return false;
  }
}

export function rememberKeptLocalWorkspace(
  userId: string,
  signature: string,
  storage: WorkspaceStorage | undefined = browserStorage()
): void {
  try {
    storage?.setItem(decisionKey(userId), signature);
  } catch {
    // The decision can safely be asked again if browser storage is unavailable.
  }
}

export function clearKeptLocalWorkspace(
  userId: string,
  storage: WorkspaceStorage | undefined = browserStorage()
): void {
  try {
    storage?.removeItem(decisionKey(userId));
  } catch {
    // The local workspace itself remains the source of truth.
  }
}
