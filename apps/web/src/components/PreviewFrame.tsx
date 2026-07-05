import { useCallback, useEffect, useRef, useState } from "react";
import { isIgnoredRuntimeError } from "../core/ignoredRuntimeErrors";
import {
  applyIframeTheme,
  buildIframeBodyHtml,
  buildIframeDocument
} from "../runtime/streamui/sandboxDocument";
import type {
  PageThemeMode,
  RenderError,
  RenderSnapshot,
  StreamUiAction
} from "../runtime/streamui/types";

type PreviewFrameProps = {
  snapshot: RenderSnapshot;
  themeMode: PageThemeMode;
  onRuntimeError(error: RenderError): void;
  onArtifactAction(action: StreamUiAction): void;
};

export function PreviewFrame({
  snapshot,
  themeMode,
  onRuntimeError,
  onArtifactAction
}: PreviewFrameProps) {
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const initialSrcDocRef = useRef<string | null>(null);
  const lastAppliedBodyHtmlRef = useRef("");
  const lastExecutedScriptHtmlRef = useRef("");
  const [height, setHeight] = useState(96);

  if (initialSrcDocRef.current === null) {
    initialSrcDocRef.current = buildIframeDocument("", themeMode);
  }

  const applySnapshotToFrame = useCallback(() => {
    const document = frameRef.current?.contentDocument;
    if (!document?.body) {
      return;
    }

    applyIframeTheme(document, themeMode);

    const bodyHtml = buildIframeBodyHtml(snapshot.completedHtml);
    if (lastAppliedBodyHtmlRef.current !== bodyHtml) {
      document.body.innerHTML = bodyHtml;
      lastAppliedBodyHtmlRef.current = bodyHtml;

      if (snapshot.status !== "complete") {
        lastExecutedScriptHtmlRef.current = "";
      }
    }

    if (
      snapshot.status === "complete" &&
      lastExecutedScriptHtmlRef.current !== snapshot.completedHtml
    ) {
      document.body.querySelectorAll("script").forEach((script) => {
        const executableScript = document.createElement("script");

        executableScript.async = false;
        Array.from(script.attributes).forEach((attribute) => {
          executableScript.setAttribute(attribute.name, attribute.value);
        });
        executableScript.text = script.textContent ?? "";
        script.replaceWith(executableScript);
      });
      lastExecutedScriptHtmlRef.current = snapshot.completedHtml;
    }

    window.requestAnimationFrame(() => {
      const nextHeight = Math.max(32, Math.ceil(document.body.scrollHeight));
      setHeight((currentHeight) =>
        Math.abs(nextHeight - currentHeight) > 1 ? nextHeight : currentHeight
      );
    });
  }, [snapshot.completedHtml, snapshot.status, themeMode]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.source !== frameRef.current?.contentWindow) {
        return;
      }

      const data = event.data as {
        source?: string;
        kind?: RenderError["kind"] | "resize" | "action";
        actionType?: string;
        prompt?: string;
        label?: string;
        message?: string;
        filename?: string;
        height?: number;
      };

      if (data?.source !== "streamui-runtime") {
        return;
      }

      if (data.kind === "action" && data.actionType === "prompt") {
        const prompt = String(data.prompt || data.message || "").trim();
        const label = String(data.label || "").trim();
        if (prompt) {
          onArtifactAction({
            type: "prompt",
            prompt: prompt.slice(0, 2000),
            ...(label ? { label: label.slice(0, 200) } : {})
          });
        }
        return;
      }

      if (data.kind === "resize" && typeof data.height === "number") {
        setHeight((currentHeight) => {
          const nextHeight = Math.max(32, Math.ceil(data.height ?? 0));

          return Math.abs(nextHeight - currentHeight) > 1
            ? nextHeight
            : currentHeight;
        });
        return;
      }

      const kind: RenderError["kind"] =
        data.kind === "console" ? "console" : "runtime";
      const runtimeError = {
        kind,
        message: data.message || "Unknown iframe runtime event.",
        filename: data.filename,
        timestamp: Date.now()
      };

      if (isIgnoredRuntimeError(runtimeError)) {
        return;
      }

      onRuntimeError(runtimeError);
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [onArtifactAction, onRuntimeError]);

  useEffect(() => {
    applySnapshotToFrame();
  }, [applySnapshotToFrame]);

  return (
    <iframe
      ref={frameRef}
      className="preview-frame"
      title="StreamUI artifact preview"
      sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
      srcDoc={initialSrcDocRef.current}
      onLoad={() => {
        lastAppliedBodyHtmlRef.current = "";
        lastExecutedScriptHtmlRef.current = "";
        applySnapshotToFrame();
      }}
      style={{ height }}
    />
  );
}
