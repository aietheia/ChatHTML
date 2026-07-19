import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode
} from "react";
import type {
  ArtifactSelection,
  ArtifactSelectionPayload
} from "../core/artifactSelection";
import type {
  PageThemeMode,
  RenderError,
  RenderSnapshot,
  StreamUiAction
} from "../core/types";
import { ArtifactExportMenu } from "./ArtifactExportMenu";
import { ErrorPanel } from "./ErrorPanel";
import { PreviewFrame } from "./PreviewFrame";

type AssistantPreviewBubbleProps = {
  id: string;
  snapshot: RenderSnapshot;
  themeMode: PageThemeMode;
  actions?: ReactNode;
  selectionModeActive?: boolean;
  selections?: ArtifactSelection[];
  busySelections?: Array<
    Pick<ArtifactSelectionPayload, "key" | "kind" | "selector">
  >;
  onRuntimeError(id: string, error: RenderError): void;
  onArtifactAction(id: string, action: StreamUiAction): void;
  onArtifactSelection(id: string, selection: ArtifactSelectionPayload): void;
  onSelectionModeChange(id: string, enabled: boolean): void;
};

const FLOATING_ACTION_SIDE_GAP = 18;
const FLOATING_ACTION_SAFE_GAP = 32;
const FLOATING_ACTION_COLUMN_GAP = 8;
const FLOATING_ACTION_VIEWPORT_MARGIN = 12;

type SideActionsPosition = {
  left: number;
  top: number;
};

function getFloatingActionItems(actionsNode: HTMLElement): HTMLElement[] {
  const turnActions = actionsNode.querySelector<HTMLElement>(
    ":scope > .assistant-turn-actions"
  );
  const turnItems = turnActions
    ? Array.from(turnActions.children).filter(
        (child): child is HTMLElement => child instanceof HTMLElement
      )
    : [];
  const exportMenu = actionsNode.querySelector<HTMLElement>(
    ":scope > .artifact-export-menu"
  );

  return [...turnItems, ...(exportMenu ? [exportMenu] : [])].filter(
    (item) => item.getClientRects().length > 0
  );
}

export function AssistantPreviewBubble({
  id,
  snapshot,
  themeMode,
  actions,
  selectionModeActive = false,
  selections = [],
  busySelections = [],
  onRuntimeError,
  onArtifactAction,
  onArtifactSelection,
  onSelectionModeChange
}: AssistantPreviewBubbleProps) {
  const artifactBlockRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLElement | null>(null);
  const actionsSlotRef = useRef<HTMLDivElement | null>(null);
  const bottomActionsRef = useRef<HTMLDivElement | null>(null);
  const sideActionsRef = useRef<HTMLDivElement | null>(null);
  const [bottomActionsSuppressed, setBottomActionsSuppressed] = useState(false);
  const [sideActionsPosition, setSideActionsPosition] =
    useState<SideActionsPosition | null>(null);
  const getExportWidth = () => containerRef.current?.clientWidth ?? 900;
  const updateSideActions = useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }

    const artifactBlock = artifactBlockRef.current;
    const actionsSlot = actionsSlotRef.current;
    const sideActionsNode = sideActionsRef.current;

    if (!artifactBlock || !actionsSlot || !sideActionsNode) {
      setBottomActionsSuppressed(false);
      setSideActionsPosition(null);
      return;
    }

    const actionItems = getFloatingActionItems(sideActionsNode);
    if (!actionItems.length) {
      setBottomActionsSuppressed(false);
      setSideActionsPosition(null);
      return;
    }

    const viewportHeight =
      window.innerHeight || document.documentElement.clientHeight;
    const viewportWidth =
      window.innerWidth || document.documentElement.clientWidth;
    const blockRect = artifactBlock.getBoundingClientRect();
    const slotRect = actionsSlot.getBoundingClientRect();
    const itemMetrics = actionItems.map((item) => {
      const itemRect = item.getBoundingClientRect();
      return {
        width: itemRect.width || item.offsetWidth || 24,
        height: itemRect.height || item.offsetHeight || 24
      };
    });
    const columnWidth = Math.max(...itemMetrics.map((metric) => metric.width));
    const columnHeight =
      itemMetrics.reduce((sum, metric) => sum + metric.height, 0) +
      Math.max(0, itemMetrics.length - 1) * FLOATING_ACTION_COLUMN_GAP;
    const inputRect =
      document
        .querySelector<HTMLElement>(".chat-input-bar")
        ?.getBoundingClientRect() ?? null;
    const composerRect =
      document
        .querySelector<HTMLElement>(".composer-footer.has-messages")
        ?.getBoundingClientRect() ?? null;
    const safeTop =
      (inputRect?.top ?? composerRect?.top ?? viewportHeight) -
      FLOATING_ACTION_SAFE_GAP;
    const bottomOverlapsSafeArea = slotRect.bottom > safeTop;
    const blockVisible =
      blockRect.bottom > FLOATING_ACTION_VIEWPORT_MARGIN &&
      blockRect.top < viewportHeight - FLOATING_ACTION_VIEWPORT_MARGIN;
    const railFitsWithinBlock = blockRect.bottom - blockRect.top >= columnHeight;
    const hasRightSideRoom =
      viewportWidth - blockRect.right >=
      columnWidth +
        FLOATING_ACTION_SIDE_GAP +
        FLOATING_ACTION_VIEWPORT_MARGIN;
    const sideTop = safeTop - columnHeight;
    const topHasReachedSideThreshold = blockRect.top > sideTop;

    setBottomActionsSuppressed(bottomOverlapsSafeArea);

    if (
      !bottomOverlapsSafeArea ||
      !blockVisible ||
      !railFitsWithinBlock ||
      !hasRightSideRoom ||
      topHasReachedSideThreshold
    ) {
      setSideActionsPosition(null);
      return;
    }

    const nextPosition = {
      left: Math.round(blockRect.right + FLOATING_ACTION_SIDE_GAP),
      top: Math.round(sideTop)
    };
    setSideActionsPosition((current) => {
      if (
        current &&
        current.left === nextPosition.left &&
        current.top === nextPosition.top
      ) {
        return current;
      }

      return nextPosition;
    });
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    let animationFrameId = 0;
    const scheduleUpdate = () => {
      if (animationFrameId) {
        return;
      }

      animationFrameId = window.requestAnimationFrame(() => {
        animationFrameId = 0;
        updateSideActions();
      });
    };

    updateSideActions();
    document.addEventListener("scroll", scheduleUpdate, true);
    window.addEventListener("resize", scheduleUpdate);

    const resizeObserver =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(scheduleUpdate);
    if (resizeObserver) {
      if (artifactBlockRef.current) {
        resizeObserver.observe(artifactBlockRef.current);
      }
      if (actionsSlotRef.current) {
        resizeObserver.observe(actionsSlotRef.current);
      }
    }

    return () => {
      if (animationFrameId) {
        window.cancelAnimationFrame(animationFrameId);
      }
      document.removeEventListener("scroll", scheduleUpdate, true);
      window.removeEventListener("resize", scheduleUpdate);
      resizeObserver?.disconnect();
    };
  }, [updateSideActions]);

  useEffect(() => {
    updateSideActions();
  }, [actions, selectionModeActive, snapshot.status, updateSideActions]);

  useLayoutEffect(() => {
    bottomActionsRef.current?.toggleAttribute("inert", bottomActionsSuppressed);
  }, [bottomActionsSuppressed]);

  useLayoutEffect(() => {
    sideActionsRef.current?.toggleAttribute("inert", !sideActionsPosition);
  }, [sideActionsPosition]);

  return (
    <div
      ref={artifactBlockRef}
      className="assistant-artifact-block"
    >
      <section
        ref={containerRef}
        className={`assistant-canvas ${snapshot.status}`}
      >
        <div className="assistant-preview-shell">
          <PreviewFrame
            snapshot={snapshot}
            themeMode={themeMode}
            selectionModeActive={selectionModeActive}
            selectedSelections={selections}
            busySelections={busySelections}
            onRuntimeError={(error) => onRuntimeError(id, error)}
            onArtifactAction={(action) => onArtifactAction(id, action)}
            onArtifactSelection={(selection) => onArtifactSelection(id, selection)}
            onSelectionModeChange={(enabled) => onSelectionModeChange(id, enabled)}
          />
        </div>
        <ErrorPanel errors={snapshot.errors} />
      </section>
      <div
        ref={actionsSlotRef}
        className="assistant-artifact-actions-slot"
      >
        <div
          ref={bottomActionsRef}
          className={`assistant-artifact-actions ${
            bottomActionsSuppressed ? "is-suppressed" : ""
          }`}
          aria-label="Artifact actions"
          aria-hidden={bottomActionsSuppressed}
        >
          {actions}
          <ArtifactExportMenu
            filenameBase={id}
            getExportWidth={getExportWidth}
            snapshot={snapshot}
            themeMode={themeMode}
          />
        </div>
      </div>
      <div
        ref={sideActionsRef}
        className={`assistant-artifact-side-actions ${
          sideActionsPosition ? "is-visible" : ""
        }`}
        aria-label="Artifact actions"
        aria-hidden={!sideActionsPosition}
        style={
          sideActionsPosition
            ? ({
                left: sideActionsPosition.left,
                top: sideActionsPosition.top
              } satisfies CSSProperties)
            : undefined
        }
      >
        {actions}
        <ArtifactExportMenu
          filenameBase={id}
          getExportWidth={getExportWidth}
          snapshot={snapshot}
          themeMode={themeMode}
        />
      </div>
    </div>
  );
}
