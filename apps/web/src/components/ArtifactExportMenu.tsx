import {
  Check,
  Code2,
  Ellipsis,
  FileDown,
  ImageDown
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  copySnapshotSourceCode,
  createArtifactFilename,
  downloadSnapshotAsPng,
  downloadSnapshotAsSvg
} from "../core/artifactExport";
import type { PageThemeMode, RenderSnapshot } from "../core/types";

type ArtifactExportAction = "copy-code" | "download-png" | "download-svg";

type ArtifactExportMenuProps = {
  filenameBase: string;
  getExportWidth(): number;
  snapshot: RenderSnapshot;
  themeMode: PageThemeMode;
};

type ExportStatus = {
  action: ArtifactExportAction;
  kind: "success" | "error";
  message: string;
};

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Export failed.";
}

export function ArtifactExportMenu({
  filenameBase,
  getExportWidth,
  snapshot,
  themeMode
}: ArtifactExportMenuProps) {
  const [activeAction, setActiveAction] = useState<ArtifactExportAction | null>(
    null
  );
  const [isHovered, setIsHovered] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [status, setStatus] = useState<ExportStatus | null>(null);

  const filenames = useMemo(
    () => ({
      png: createArtifactFilename(filenameBase, "png"),
      svg: createArtifactFilename(filenameBase, "svg")
    }),
    [filenameBase]
  );
  const isOpen = isHovered || isPinned;

  useEffect(() => {
    if (!status || status.kind === "error") {
      return undefined;
    }

    const timeout = window.setTimeout(() => setStatus(null), 2_000);
    return () => window.clearTimeout(timeout);
  }, [status]);

  useEffect(() => {
    if (!isPinned) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsPinned(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPinned]);

  const runAction = async (action: ArtifactExportAction) => {
    if (activeAction) {
      return;
    }

    setActiveAction(action);
    setStatus(null);

    try {
      const width = getExportWidth();
      if (action === "copy-code") {
        await copySnapshotSourceCode(snapshot);
        setStatus({
          action,
          kind: "success",
          message: "已复制"
        });
        return;
      }

      if (action === "download-png") {
        await downloadSnapshotAsPng(snapshot, {
          filename: filenames.png,
          themeMode,
          width
        });
        setStatus({
          action,
          kind: "success",
          message: "PNG 已下载"
        });
        return;
      }

      await downloadSnapshotAsSvg(snapshot, {
        filename: filenames.svg,
        themeMode,
        width
      });
      setStatus({
        action,
        kind: "success",
        message: "SVG 已下载"
      });
    } catch (error) {
      setStatus({
        action,
        kind: "error",
        message: getErrorMessage(error)
      });
    } finally {
      setActiveAction(null);
    }
  };

  const isBusy = activeAction !== null;
  const isInteractive = isOpen;

  return (
    <div
      className={`artifact-export-menu ${isOpen ? "is-open" : ""} ${
        isPinned ? "is-pinned" : ""
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onPointerEnter={() => setIsHovered(true)}
      onPointerLeave={() => setIsHovered(false)}
    >
      <div
        className="artifact-export-popover"
        role="menu"
        aria-hidden={!isInteractive}
      >
        <button
          className="artifact-export-menu-item"
          type="button"
          role="menuitem"
          disabled={isBusy}
          tabIndex={isInteractive ? 0 : -1}
          onClick={() => {
            void runAction("copy-code");
          }}
        >
          <Code2 size={14} strokeWidth={2} aria-hidden="true" />
          <span>复制代码</span>
        </button>
        <button
          className="artifact-export-menu-item"
          type="button"
          role="menuitem"
          disabled={isBusy}
          tabIndex={isInteractive ? 0 : -1}
          onClick={() => {
            void runAction("download-png");
          }}
        >
          <ImageDown size={14} strokeWidth={2} aria-hidden="true" />
          <span>下载 PNG</span>
        </button>
        <button
          className="artifact-export-menu-item"
          type="button"
          role="menuitem"
          disabled={isBusy}
          tabIndex={isInteractive ? 0 : -1}
          onClick={() => {
            void runAction("download-svg");
          }}
        >
          <FileDown size={14} strokeWidth={2} aria-hidden="true" />
          <span>下载 SVG</span>
        </button>
        {status ? (
          <span
            className={`artifact-export-status is-${status.kind}`}
            role={status.kind === "error" ? "alert" : "status"}
          >
            {status.kind === "success" ? (
              <Check size={12} strokeWidth={2.2} aria-hidden="true" />
            ) : null}
            <span>{status.message}</span>
          </span>
        ) : null}
      </div>
      <button
        className="artifact-export-trigger"
        type="button"
        aria-expanded={isOpen}
        aria-label="更多导出操作"
        title="更多导出操作"
        onClick={() => setIsPinned((current) => !current)}
      >
        <Ellipsis size={16} strokeWidth={2.2} aria-hidden="true" />
      </button>
    </div>
  );
}
