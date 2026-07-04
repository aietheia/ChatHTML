import { MessagePrimitive } from "@assistant-ui/react";
import { useMemo } from "react";
import { createStreamingRenderer } from "../core/createStreamingRenderer";
import { extractStreamUiParts } from "../core/extractStreamUiParts";
import type { PageThemeMode, RenderError, RenderSnapshot } from "../core/types";
import { AssistantPreviewBubble } from "./AssistantPreviewBubble";
import { AssistantTextBubble } from "./AssistantTextBubble";
import { RawStreamPanel } from "./RawStreamPanel";
import { ReasoningPanel } from "./ReasoningPanel";

type AssistantMessageProps = {
  id: string;
  content: string;
  reasoning?: string;
  rawStream?: string;
  hasStreamUi?: boolean;
  snapshot?: RenderSnapshot;
  themeMode: PageThemeMode;
  status?: "streaming" | "complete" | "error";
  error?: string;
  onRuntimeError(id: string, error: RenderError): void;
};

export function AssistantMessage({
  id,
  content,
  reasoning,
  rawStream,
  hasStreamUi,
  snapshot,
  themeMode,
  status,
  error,
  onRuntimeError
}: AssistantMessageProps) {
  const resolvedSnapshot = useMemo(() => {
    if (!hasStreamUi || !rawStream) {
      return snapshot;
    }

    const parts = extractStreamUiParts(rawStream);
    if (!parts.hasStreamUi || !parts.streamui.trim()) {
      return snapshot;
    }

    const renderer = createStreamingRenderer(themeMode);
    renderer.replace(parts.streamui);
    if (status === "complete" || parts.streamUiComplete) {
      renderer.complete();
    }
    return renderer.getSnapshot();
  }, [hasStreamUi, rawStream, snapshot, status, themeMode]);

  return (
    <MessagePrimitive.Root className="chat-row assistant">
      <div className="avatar" aria-hidden="true">
        S
      </div>
      <div className="assistant-stack">
        <ReasoningPanel
          reasoning={reasoning}
          isStreaming={status === "streaming"}
        />
        <AssistantTextBubble
          content={content}
          error={error}
        />
        {hasStreamUi && resolvedSnapshot ? (
          <AssistantPreviewBubble
            id={id}
            snapshot={resolvedSnapshot}
            themeMode={themeMode}
            onRuntimeError={onRuntimeError}
          />
        ) : null}
        <RawStreamPanel raw={rawStream} />
      </div>
    </MessagePrimitive.Root>
  );
}
