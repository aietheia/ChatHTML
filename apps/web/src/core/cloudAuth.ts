export type AuthUser = {
  id: string;
  email: string;
  role: "admin" | "user";
  balanceUsd?: string;
  balanceMicros?: number;
};

export type AuthAvailability = {
  available: boolean;
  requiresInvite: boolean;
  firstUser: boolean;
};

export type AuthSummary = {
  user: AuthUser | null;
  auth: AuthAvailability;
};

type AuthPayload = {
  email?: string;
  password?: string;
  inviteCode?: string;
};

async function readJson<T>(
  response: Response,
  fallback: string
): Promise<T> {
  const payload = (await response.json().catch(() => ({}))) as {
    error?: unknown;
  };
  if (!response.ok) {
    throw new Error(
      typeof payload.error === "string"
        ? payload.error
        : `${fallback} failed with HTTP ${response.status}.`
    );
  }

  return payload as T;
}

export async function loadAuthSummary(): Promise<AuthSummary> {
  const response = await fetch("/api/auth/me", {
    credentials: "same-origin"
  });
  return readJson<AuthSummary>(response, "Authentication status load");
}

export async function login(payload: AuthPayload): Promise<AuthSummary> {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  return readJson<AuthSummary>(response, "Login");
}

export async function register(payload: AuthPayload): Promise<AuthSummary> {
  const response = await fetch("/api/auth/register", {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  return readJson<AuthSummary>(response, "Registration");
}

export async function logout(): Promise<AuthSummary> {
  const response = await fetch("/api/auth/logout", {
    method: "POST",
    credentials: "same-origin"
  });

  return readJson<AuthSummary>(response, "Logout");
}
