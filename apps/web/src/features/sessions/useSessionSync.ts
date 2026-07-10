import { useEffect } from "react";
import type { SessionState } from "../../domain/chat/sessionModel";
import {
  runInitialSessionLoad,
  runSessionPoll,
  type SessionStateUpdater,
  type SessionSyncDependencies
} from "./sessionSyncController";

type ValueRef<T> = { current: T };
type SizeLike = { readonly size: number };

export type UseSessionSyncInput = {
  sessionsLoaded: boolean;
  intervalMs: number;
  sessionClientIdRef: ValueRef<string>;
  sessionStateRef: ValueRef<SessionState>;
  sessionsLoadedRef: ValueRef<boolean>;
  deletedSessionIdsRef: ValueRef<ReadonlySet<string>>;
  transientEmptySessionIdRef: ValueRef<string | null>;
  runConnectionsRef: ValueRef<SizeLike>;
  cancelledRunIdsRef: ValueRef<SizeLike>;
  updateState: SessionStateUpdater;
  setSessionsLoaded(loaded: boolean): void;
  dependencies?: Partial<SessionSyncDependencies>;
};

export function useSessionSync({
  sessionsLoaded,
  intervalMs,
  sessionClientIdRef,
  sessionStateRef,
  sessionsLoadedRef,
  deletedSessionIdsRef,
  transientEmptySessionIdRef,
  runConnectionsRef,
  cancelledRunIdsRef,
  updateState,
  setSessionsLoaded,
  dependencies
}: UseSessionSyncInput): void {
  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    let cancelled = false;
    void runInitialSessionLoad(
      {
        clientId: sessionClientIdRef.current,
        isCancelled: () => cancelled,
        updateState,
        getDeletedSessionIds: () => deletedSessionIdsRef.current,
        getTransientEmptySessionId: () => transientEmptySessionIdRef.current
      },
      dependencies
    )
      .catch((error) => {
        if (!cancelled) {
          console.warn("Could not load ChatHTML sessions.", error);
        }
      })
      .finally(() => {
        if (!cancelled) {
          sessionsLoadedRef.current = true;
          setSessionsLoaded(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    deletedSessionIdsRef,
    dependencies,
    sessionClientIdRef,
    sessionsLoadedRef,
    setSessionsLoaded,
    transientEmptySessionIdRef,
    updateState
  ]);

  useEffect(() => {
    if (typeof window === "undefined" || !sessionsLoaded) {
      return undefined;
    }

    let cancelled = false;
    const syncSessions = () => {
      void runSessionPoll(
        {
          clientId: sessionClientIdRef.current,
          isCancelled: () => cancelled,
          getState: () => sessionStateRef.current,
          updateState,
          getDeletedSessionIds: () => deletedSessionIdsRef.current,
          getTransientEmptySessionId: () =>
            transientEmptySessionIdRef.current,
          hasActiveRuns: () => runConnectionsRef.current.size > 0,
          hasRecentCancellations: () =>
            cancelledRunIdsRef.current.size > 0
        },
        dependencies
      ).catch((error) => {
        if (!cancelled) {
          console.warn("Could not sync ChatHTML sessions.", error);
        }
      });
    };

    const intervalId = window.setInterval(syncSessions, intervalMs);
    syncSessions();

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [
    cancelledRunIdsRef,
    deletedSessionIdsRef,
    dependencies,
    intervalMs,
    runConnectionsRef,
    sessionClientIdRef,
    sessionStateRef,
    sessionsLoaded,
    transientEmptySessionIdRef,
    updateState
  ]);
}
