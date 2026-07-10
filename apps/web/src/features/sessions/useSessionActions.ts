import { useMemo } from "react";
import {
  createEmptySession,
  type ChatSession,
  type SessionState
} from "../../domain/chat/sessionModel";
import type { ReasoningEffort } from "../../core/apiSettings";
import {
  createSessionActionsController,
  type SessionActionsController
} from "./sessionActionsController";

type ValueRef<T> = { current: T };

export type UseSessionActionsInput = {
  sessionStateRef: ValueRef<SessionState>;
  isNewOrDeleteBlockedRef: ValueRef<boolean>;
  transientEmptySessionIdRef: ValueRef<string | null>;
  deletedSessionIdsRef: ValueRef<Set<string>>;
  replaceState(state: SessionState): void;
  saveNow(): void;
  defaultModel: string;
  defaultReasoningEffort: ReasoningEffort;
  defaultUiComplexity: number;
  createSession?: () => ChatSession;
};

export function useSessionActions({
  sessionStateRef,
  isNewOrDeleteBlockedRef,
  transientEmptySessionIdRef,
  deletedSessionIdsRef,
  replaceState,
  saveNow,
  defaultModel,
  defaultReasoningEffort,
  defaultUiComplexity,
  createSession
}: UseSessionActionsInput): SessionActionsController {
  return useMemo(
    () =>
      createSessionActionsController({
        isNewOrDeleteBlocked: () => isNewOrDeleteBlockedRef.current,
        getState: () => sessionStateRef.current,
        replaceState,
        getTransientEmptySessionId: () =>
          transientEmptySessionIdRef.current,
        setTransientEmptySessionId: (sessionId) => {
          transientEmptySessionIdRef.current = sessionId;
        },
        markSessionDeleted: (sessionId) => {
          deletedSessionIdsRef.current.add(sessionId);
        },
        createSession:
          createSession ??
          (() =>
            createEmptySession(
              undefined,
              undefined,
              defaultModel,
              defaultReasoningEffort,
              defaultUiComplexity
            )),
        saveNow
      }),
    [
      createSession,
      defaultModel,
      defaultReasoningEffort,
      defaultUiComplexity,
      deletedSessionIdsRef,
      isNewOrDeleteBlockedRef,
      replaceState,
      saveNow,
      sessionStateRef,
      transientEmptySessionIdRef
    ]
  );
}
