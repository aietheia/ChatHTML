export type PlaceholderTopUpResponse = {
  ok: true;
  amountMicros: number;
  amountUsd: string;
  balanceMicros: number;
  balanceUsd: string;
};

async function readJson<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => ({}))) as {
    error?: unknown;
  };
  if (!response.ok) {
    throw new Error(
      typeof payload.error === "string"
        ? payload.error
        : `Billing request failed with HTTP ${response.status}.`
    );
  }

  return payload as T;
}

export async function topUpBalance(
  amountUsd: string
): Promise<PlaceholderTopUpResponse> {
  const response = await fetch("/api/billing/top-up", {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ amountUsd })
  });

  return readJson<PlaceholderTopUpResponse>(response);
}
