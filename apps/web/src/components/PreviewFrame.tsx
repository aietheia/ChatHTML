import { useEffect, useRef, useState } from "react";
import { isIgnoredRuntimeError } from "../core/ignoredRuntimeErrors";
import { applyIframeTheme } from "../runtime/streamui/sandboxDocument";
import type {
  PageThemeMode,
  RenderError,
  RenderSnapshot
} from "../runtime/streamui/types";

type PreviewFrameProps = {
  snapshot: RenderSnapshot;
  themeMode: PageThemeMode;
  onRuntimeError(error: RenderError): void;
};

export function PreviewFrame({
  snapshot,
  themeMode,
  onRuntimeError
}: PreviewFrameProps) {
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const [height, setHeight] = useState(96);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.source !== frameRef.current?.contentWindow) {
        return;
      }

      const data = event.data as {
        source?: string;
        kind?: RenderError["kind"] | "resize";
        message?: string;
        filename?: string;
        height?: number;
      };

      if (data?.source !== "streamui-runtime") {
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
  }, [onRuntimeError]);

  useEffect(() => {
    const document = frameRef.current?.contentDocument;
    if (!document?.body) {
      return;
    }

    applyIframeTheme(document, themeMode);
  }, [snapshot.iframeDocument, themeMode]);

  return (
    <iframe
      ref={frameRef}
      className="preview-frame"
      title="StreamUI artifact preview"
      sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
      srcDoc={snapshot.iframeDocument}
      onLoad={() => {
        const document = frameRef.current?.contentDocument;
        if (document?.body) {
          applyIframeTheme(document, themeMode);
        }
      }}
      style={{ height }}
    />
  );
}
