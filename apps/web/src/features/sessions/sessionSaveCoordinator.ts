import type { SessionState } from "../../domain/chat/sessionModel";
import {
  saveSerializedSessionState,
  saveSessionStateOnPageExit
} from "./sessionApi";
import {
  clearLegacyLocalSessions,
  serializeSessionStateForSave
} from "./sessionPersistence";

export type SessionSaveSnapshot = {
  clientId: string;
  serializedState: string;
};

export type SessionSaveSource = {
  isLoaded(): boolean;
  getLatestState(): SessionState;
  getClientId(): string;
  getDeletedSessionIds(): Iterable<string>;
};

export type SessionSaveScheduler = {
  schedule(delayMs: number, task: () => Promise<void>): () => void;
};

export type SessionSaveDependencies = {
  serialize(
    state: SessionState,
    clientId: string,
    deletedSessionIds: string[]
  ): string;
  persist(
    serializedState: string,
    clientId: string,
    signal?: AbortSignal
  ): Promise<Response>;
  flush(serializedState: string, clientId: string): void;
  clearLegacy(): void;
  warn(error: unknown): void;
  scheduler: SessionSaveScheduler;
  createAbortController(): AbortController;
};

export type SessionSaveOutcome = "saved" | "failed" | "skipped";
export type SessionFlushOutcome = "flushed" | "skipped";

export type SessionSaveCoordinator = {
  scheduleAutosave(stateSnapshot: SessionState, loaded: boolean): () => void;
  cancelAutosave(): void;
  saveNow(): Promise<SessionSaveOutcome>;
  flushPageExit(): SessionFlushOutcome;
  dispose(): void;
  getDebugState(): {
    lastSavedPayload: string | null;
    hasAutosave: boolean;
  };
};

const defaultDependencies: SessionSaveDependencies = {
  serialize: serializeSessionStateForSave,
  persist: saveSerializedSessionState,
  flush: saveSessionStateOnPageExit,
  clearLegacy: clearLegacyLocalSessions,
  warn: (error) => console.warn("Could not save ChatHTML sessions.", error),
  scheduler: {
    schedule: (delayMs, task) => {
      const timeoutId = window.setTimeout(() => void task(), delayMs);
      return () => window.clearTimeout(timeoutId);
    }
  },
  createAbortController: () => new AbortController()
};

function isAbortError(error: unknown): boolean {
  return (error as { name?: unknown })?.name === "AbortError";
}

export function createSessionSaveCoordinator(
  source: SessionSaveSource,
  debounceMs: number,
  dependencyOverrides?: Partial<SessionSaveDependencies>
): SessionSaveCoordinator {
  const dependencies: SessionSaveDependencies = {
    ...defaultDependencies,
    ...dependencyOverrides
  };
  let lastSavedPayload: string | null = null;
  let autosaveController: AbortController | null = null;
  let cancelAutosaveTimer: (() => void) | null = null;

  const createSnapshot = (state: SessionState): SessionSaveSnapshot => {
    const clientId = source.getClientId();
    return {
      clientId,
      serializedState: dependencies.serialize(
        state,
        clientId,
        Array.from(source.getDeletedSessionIds())
      )
    };
  };

  const latestSnapshot = (): SessionSaveSnapshot | null =>
    source.isLoaded() ? createSnapshot(source.getLatestState()) : null;

  const cancelAutosave = () => {
    cancelAutosaveTimer?.();
    cancelAutosaveTimer = null;
    autosaveController?.abort();
    autosaveController = null;
  };

  const persist = async (
    snapshot: SessionSaveSnapshot,
    signal: AbortSignal | undefined,
    suppressAbortWarning: boolean
  ): Promise<SessionSaveOutcome> => {
    try {
      const response = await dependencies.persist(
        snapshot.serializedState,
        snapshot.clientId,
        signal
      );
      if (!response.ok) {
        throw new Error(`Session save failed with HTTP ${response.status}.`);
      }

      lastSavedPayload = snapshot.serializedState;
      dependencies.clearLegacy();
      return "saved";
    } catch (error) {
      if (!suppressAbortWarning || !isAbortError(error)) {
        dependencies.warn(error);
      }
      return "failed";
    }
  };

  const scheduleAutosave = (
    stateSnapshot: SessionState,
    loaded: boolean
  ): (() => void) => {
    if (!loaded) {
      return () => undefined;
    }

    const controller = dependencies.createAbortController();
    autosaveController?.abort();
    autosaveController = controller;
    cancelAutosaveTimer?.();
    cancelAutosaveTimer = null;

    const snapshot = createSnapshot(stateSnapshot);
    if (snapshot.serializedState === lastSavedPayload) {
      return () => undefined;
    }

    const cancelTimer = dependencies.scheduler.schedule(debounceMs, () =>
      persist(snapshot, controller.signal, true).then(() => undefined)
    );
    cancelAutosaveTimer = cancelTimer;

    return () => {
      cancelTimer();
      controller.abort();
      if (cancelAutosaveTimer === cancelTimer) {
        cancelAutosaveTimer = null;
      }
      if (autosaveController === controller) {
        autosaveController = null;
      }
    };
  };

  const saveNow = async (): Promise<SessionSaveOutcome> => {
    const snapshot = latestSnapshot();
    if (!snapshot || snapshot.serializedState === lastSavedPayload) {
      return "skipped";
    }

    return persist(snapshot, undefined, false);
  };

  const flushPageExit = (): SessionFlushOutcome => {
    const snapshot = latestSnapshot();
    if (!snapshot || snapshot.serializedState === lastSavedPayload) {
      return "skipped";
    }

    lastSavedPayload = snapshot.serializedState;
    dependencies.flush(snapshot.serializedState, snapshot.clientId);
    return "flushed";
  };

  return {
    scheduleAutosave,
    cancelAutosave,
    saveNow,
    flushPageExit,
    dispose: cancelAutosave,
    getDebugState: () => ({
      lastSavedPayload,
      hasAutosave:
        autosaveController !== null || cancelAutosaveTimer !== null
    })
  };
}
