import { useEffect, useState } from "react";
import { stripSyntheticReasoningStatus } from "../core/reasoningText";

type ReasoningPanelProps = {
  messageId: string;
  reasoning?: string;
  isStreaming: boolean;
  isActive?: boolean;
  onOpenActivity?(messageId: string): void;
};

export function ReasoningPanel({
  messageId,
  reasoning = "",
  isStreaming,
  isActive = false,
  onOpenActivity
}: ReasoningPanelProps) {
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const visibleReasoning = stripSyntheticReasoningStatus(reasoning);
  const hasReasoning = visibleReasoning.trim().length > 0;
  const showStatusOnly = isStreaming && !hasReasoning;
  const canOpenActivity = hasReasoning || isStreaming;

  useEffect(() => {
    if (isStreaming) {
      const start = Date.now();
      setStartedAt(start);
      setElapsedMs(0);
      const interval = window.setInterval(() => {
        setElapsedMs(Date.now() - start);
      }, 500);

      return () => window.clearInterval(interval);
    }
  }, [isStreaming]);

  useEffect(() => {
    if (isStreaming) {
      return;
    }

    if (startedAt) {
      setElapsedMs(Date.now() - startedAt);
    }
  }, [isStreaming, startedAt]);

  if (!hasReasoning && !showStatusOnly) {
    return null;
  }

  const durationSeconds =
    startedAt || elapsedMs > 0 ? Math.max(1, Math.round(elapsedMs / 1000)) : null;
  const label = showStatusOnly
    ? "Thinking"
    : isStreaming
      ? "Thinking"
    : durationSeconds
      ? `Thought for ${durationSeconds}s`
      : "Thought";

  return (
    <div
      className={`reasoning-panel ${isStreaming ? "is-streaming" : "is-complete"} ${
        showStatusOnly ? "is-status-only" : ""
      } ${isActive ? "is-active" : ""}`}
    >
      <button
        className="reasoning-trigger"
        type="button"
        aria-expanded={isActive}
        aria-label={canOpenActivity ? `${label}. Open thinking details` : label}
        disabled={!canOpenActivity}
        onClick={() => onOpenActivity?.(messageId)}
      >
        <span className="reasoning-label">{label}</span>
        {!showStatusOnly ? (
          <span className="reasoning-chevron" aria-hidden="true" />
        ) : null}
      </button>
    </div>
  );
}
