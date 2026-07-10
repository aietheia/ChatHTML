import { useCallback, useEffect, useRef } from "react";
import type { SessionState } from "../../domain/chat/sessionModel";
import {
  createSessionSaveCoordinator,
  type SessionSaveCoordinator,
  type SessionSaveDependencies
} from "./sessionSaveCoordinator";

type ValueRef<T> = { current: T };

export type UseSessionSaveInput = {
  sessionState: SessionState;
  sessionsLoaded: boolean;
  debounceMs: number;
  sessionStateRef: ValueRef<SessionState>;
  sessionsLoadedRef: ValueRef<boolean>;
  sessionClientIdRef: ValueRef<string>;
  deletedSessionIdsRef: ValueRef<ReadonlySet<string>>;
  dependencies?: Partial<SessionSaveDependencies>;
};

export function useSessionSave({
  sessionState,
  sessionsLoaded,
  debounceMs,
  sessionStateRef,
  sessionsLoadedRef,
  sessionClientIdRef,
  deletedSessionIdsRef,
  dependencies
}: UseSessionSaveInput): () => void {
  const coordinatorRef = useRef<SessionSaveCoordinator | null>(null);
  if (!coordinatorRef.current) {
    coordinatorRef.current = createSessionSaveCoordinator(
      {
        isLoaded: () => sessionsLoadedRef.current,
        getLatestState: () => sessionStateRef.current,
        getClientId: () => sessionClientIdRef.current,
        getDeletedSessionIds: () => deletedSessionIdsRef.current
      },
      debounceMs,
      dependencies
    );
  }
  const coordinator = coordinatorRef.current;

  useEffect(() => {
    if (typeof window === "undefined" || !sessionsLoaded) {
      return undefined;
    }

    return coordinator.scheduleAutosave(sessionState, sessionsLoaded);
  }, [coordinator, sessionState, sessionsLoaded]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const flushSessions = () => {
      coordinator.flushPageExit();
    };
    const flushWhenHidden = () => {
      if (document.visibilityState === "hidden") {
        flushSessions();
      }
    };

    window.addEventListener("pagehide", flushSessions);
    window.addEventListener("beforeunload", flushSessions);
    document.addEventListener("visibilitychange", flushWhenHidden);

    return () => {
      window.removeEventListener("pagehide", flushSessions);
      window.removeEventListener("beforeunload", flushSessions);
      document.removeEventListener("visibilitychange", flushWhenHidden);
      coordinator.dispose();
    };
  }, [coordinator]);

  return useCallback(() => {
    void coordinator.saveNow();
  }, [coordinator]);
}
