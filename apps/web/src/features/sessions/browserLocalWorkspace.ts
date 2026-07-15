import {
  createId,
  isSessionEmpty,
  normalizeStoredSessionState,
  type SessionFile,
  type SessionState
} from "../../domain/chat/sessionModel";
import type { SessionFileUploadInput } from "./sessionFileContracts";

export const BROWSER_LOCAL_WORKSPACE_STORAGE_KEY =
  "chathtml.browserWorkspace.v1";

export type WorkspaceStorage = Pick<
  Storage,
  "getItem" | "setItem" | "removeItem"
>;

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

function emptyWorkspacePayload(): string {
  return JSON.stringify({ sessions: [], activeSessionId: "" });
}

export function loadBrowserLocalWorkspace(
  storage: WorkspaceStorage | undefined = browserStorage()
): SessionState | null {
  if (!storage) {
    return null;
  }

  try {
    const parsed = JSON.parse(
      storage.getItem(BROWSER_LOCAL_WORKSPACE_STORAGE_KEY) ?? "null"
    ) as unknown;
    if (
      !parsed ||
      typeof parsed !== "object" ||
      !Array.isArray((parsed as { sessions?: unknown }).sessions)
    ) {
      return null;
    }

    const state = normalizeStoredSessionState(parsed);
    const sessions = state.sessions.filter((session) => !isSessionEmpty(session));
    if (!sessions.length) {
      return null;
    }

    return {
      sessions,
      activeSessionId: sessions.some(
        (session) => session.id === state.activeSessionId
      )
        ? state.activeSessionId
        : sessions[0].id
    };
  } catch {
    return null;
  }
}

export function clearBrowserLocalWorkspace(
  storage: WorkspaceStorage | undefined = browserStorage()
): void {
  try {
    storage?.removeItem(BROWSER_LOCAL_WORKSPACE_STORAGE_KEY);
  } catch {
    // Clearing a completed import is best-effort when storage is unavailable.
  }
}

export function browserLocalWorkspaceSignature(state: SessionState): string {
  return JSON.stringify(
    state.sessions
      .filter((session) => !isSessionEmpty(session))
      .map((session) => [session.id, session.updatedAt])
      .sort(([left], [right]) => String(left).localeCompare(String(right)))
  );
}

export function requestBrowserLocalWorkspace(
  storage: WorkspaceStorage | undefined = browserStorage()
): Promise<Response> {
  let payload = emptyWorkspacePayload();
  try {
    payload = storage?.getItem(BROWSER_LOCAL_WORKSPACE_STORAGE_KEY) || payload;
    JSON.parse(payload);
  } catch {
    payload = emptyWorkspacePayload();
  }
  return Promise.resolve(
    new Response(payload, {
      status: 200,
      headers: { "Content-Type": "application/json" }
    })
  );
}

export function saveBrowserLocalWorkspace(
  serializedState: string,
  storage: WorkspaceStorage | undefined = browserStorage()
): Promise<Response> {
  try {
    JSON.parse(serializedState);
    storage?.setItem(BROWSER_LOCAL_WORKSPACE_STORAGE_KEY, serializedState);
    const revision = (
      JSON.parse(serializedState) as { saveRevision?: unknown }
    ).saveRevision;
    return Promise.resolve(
      Response.json({
        applied: true,
        ...(typeof revision === "number"
          ? { currentSaveRevision: revision }
          : {})
      })
    );
  } catch (error) {
    return Promise.reject(
      new Error(
        error instanceof DOMException && error.name === "QuotaExceededError"
          ? "Browser storage is full. Remove large image sessions and try again."
          : "The local workspace could not be saved in this browser."
      )
    );
  }
}

export function flushBrowserLocalWorkspace(
  serializedState: string,
  storage: WorkspaceStorage | undefined = browserStorage()
): void {
  try {
    JSON.parse(serializedState);
    storage?.setItem(BROWSER_LOCAL_WORKSPACE_STORAGE_KEY, serializedState);
  } catch (error) {
    console.warn("Could not flush the browser-only ChatHTML workspace.", error);
  }
}

export function createBrowserLocalSessionFile(
  input: SessionFileUploadInput
): SessionFile {
  const content = input.dataUrl ?? input.text ?? "";
  return {
    id: createId("local-file"),
    kind: input.kind,
    name: input.name,
    mimeType: input.mimeType,
    size: new Blob([content]).size,
    createdAt: Date.now(),
    sourceMessageId: input.sourceMessageId,
    dataUrl: input.dataUrl,
    text: input.text,
    width: input.width,
    height: input.height,
    summary: input.summary
  };
}
