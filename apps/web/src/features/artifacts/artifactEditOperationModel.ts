import type { ClientMessage } from "../../domain/chat/sessionModel";
import type { PageThemeMode } from "../../runtime/streamui/types";
import { getArtifactEditDisplayRawStream } from "./artifactEditModel";
import { buildCompletedAssistantPatchFromRawStream } from "./artifactMessageProjection";

export type SelectArtifactEditVersionResult = {
  message: ClientMessage;
  selected: boolean;
};

export function selectArtifactEditVersion(
  message: ClientMessage,
  editId: string | undefined,
  themeMode: PageThemeMode
): SelectArtifactEditVersionResult {
  if (message.role !== "assistant") {
    return { message, selected: false };
  }

  const rawStream = getArtifactEditDisplayRawStream(message, editId);
  if (!rawStream) {
    return { message, selected: false };
  }

  return {
    message: {
      ...message,
      ...buildCompletedAssistantPatchFromRawStream(rawStream, themeMode),
      activeArtifactEditId: editId
    },
    selected: true
  };
}
