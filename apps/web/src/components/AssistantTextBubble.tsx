import { stripInternalArtifactContextText } from "../features/chat/internalArtifactContext";

type AssistantTextBubbleProps = {
  content: string;
  error?: string;
  placeholder?: string;
};

function compactErrorText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function stripHtmlErrorText(value: string): string {
  return compactErrorText(
    value
      .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]*>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&quot;/gi, "\"")
      .replace(/&#39;/gi, "'")
  );
}

function sanitizeErrorForDisplay(value: string | undefined): string {
  const raw = value?.trim() ?? "";
  if (!raw) {
    return "";
  }

  if (/<!doctype\s+html|<html\b|<head\b|<body\b|<\/?[a-z][\s\S]*>/i.test(raw)) {
    const title = /<title\b[^>]*>([\s\S]*?)<\/title>/i.exec(raw);
    return (title ? stripHtmlErrorText(title[1]) : stripHtmlErrorText(raw)).slice(
      0,
      180
    );
  }

  return compactErrorText(raw).slice(0, 500);
}

export function AssistantTextBubble({
  content,
  error,
  placeholder
}: AssistantTextBubbleProps) {
  const visibleContent = stripInternalArtifactContextText(content);
  const visibleError = sanitizeErrorForDisplay(error);

  if (!visibleContent && !visibleError && !placeholder) {
    return null;
  }

  return (
    <div
      className={`message-bubble assistant ${
        placeholder && !visibleContent && !visibleError ? "is-placeholder" : ""
      }`}
    >
      {visibleContent ? <p>{visibleContent}</p> : null}
      {!visibleContent && !visibleError && placeholder ? <p>{placeholder}</p> : null}
      {visibleError ? <pre className="inline-error">{visibleError}</pre> : null}
    </div>
  );
}
