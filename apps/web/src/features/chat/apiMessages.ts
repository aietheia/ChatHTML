import type { ClientMessage } from "../../domain/chat/sessionModel";
import { extractStreamUiParts } from "../../runtime/streamui/protocol";

function decodeHtmlEntities(value: string): string {
  if (typeof document === "undefined") {
    return value;
  }

  const textarea = document.createElement("textarea");
  textarea.innerHTML = value;
  return textarea.value;
}

export function htmlToTranscriptText(html: string): string {
  return decodeHtmlEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  );
}

export function getApiMessageContent(message: ClientMessage): string {
  const visibleContent = message.content.trim();
  if (visibleContent) {
    return visibleContent;
  }

  if (message.role !== "assistant" || !message.rawStream) {
    return message.content;
  }

  const parts = extractStreamUiParts(message.rawStream);
  const artifactText = htmlToTranscriptText(parts.streamui || parts.fallbackText);
  if (!artifactText) {
    return "[Assistant produced a StreamUI artifact for this turn.]";
  }

  return `[Assistant produced a StreamUI artifact for this turn. Text summary: ${artifactText.slice(
    0,
    4_000
  )}]`;
}

export function toApiMessages(messages: ClientMessage[]) {
  return messages
    .filter((message) => message.id !== "welcome")
    .filter(
      (message) =>
        message.role === "user" ||
        getApiMessageContent(message).trim() ||
        (message.attachments?.length ?? 0) > 0
    )
    .map((message) => ({
      role: message.role,
      content: getApiMessageContent(message),
      images: message.attachments?.map((attachment) => ({
        name: attachment.name,
        mimeType: attachment.mimeType,
        size: attachment.size,
        dataUrl: attachment.dataUrl
      }))
    }));
}
