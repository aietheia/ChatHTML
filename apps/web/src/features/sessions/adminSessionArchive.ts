import {
  normalizeStoredSession,
  sortSessions,
  type ChatSession,
  type SessionState
} from "../../domain/chat/sessionModel";

const ACCOUNT_LABEL_LENGTH = 8;

function accountIdFrom(input: unknown): string {
  if (typeof input !== "string") {
    return "";
  }
  return input.trim().slice(0, 180);
}

function archivedSessionId(accountId: string, sessionId: string): string {
  return `admin:${encodeURIComponent(accountId)}:${sessionId}`;
}

function accountLabel(accountId: string): string {
  return `Account ${accountId.slice(0, ACCOUNT_LABEL_LENGTH)}`;
}

export function normalizeAdminSessionArchive(
  input: unknown,
  now = Date.now()
): SessionState {
  if (!input || typeof input !== "object") {
    return { sessions: [], activeSessionId: "" };
  }

  const accounts = (input as { accounts?: unknown }).accounts;
  if (!Array.isArray(accounts)) {
    return { sessions: [], activeSessionId: "" };
  }

  const sessions: ChatSession[] = [];
  for (const value of accounts) {
    if (!value || typeof value !== "object") {
      continue;
    }
    const account = value as { accountId?: unknown; sessions?: unknown };
    const accountId = accountIdFrom(account.accountId);
    if (!accountId || !Array.isArray(account.sessions)) {
      continue;
    }

    for (const storedSession of account.sessions) {
      const session = normalizeStoredSession(storedSession, now, {
        rebuildSnapshots: false,
        interruptPendingArtifactEdits: false
      });
      if (!session) {
        continue;
      }
      sessions.push({
        ...session,
        id: archivedSessionId(accountId, session.id),
        title: `${accountLabel(accountId)} · ${session.title}`
      });
    }
  }

  const sorted = sortSessions(sessions);
  return {
    sessions: sorted,
    activeSessionId: sorted[0]?.id ?? ""
  };
}
