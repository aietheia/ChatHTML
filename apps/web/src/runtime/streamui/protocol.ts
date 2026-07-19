import type { ExtractedStreamUiParts } from "./types";

function extractBetween(
  raw: string,
  tagName: "sessiontitle" | "chat" | "streamui"
): { content: string; hasOpen: boolean; hasClose: boolean } {
  const openPattern = new RegExp(`<${tagName}\\b[^>]*>`, "i");
  const openMatch = openPattern.exec(raw);

  if (!openMatch || openMatch.index === undefined) {
    return { content: "", hasOpen: false, hasClose: false };
  }

  const contentStart = openMatch.index + openMatch[0].length;
  const closePattern = new RegExp(`</${tagName}>`, "i");
  const closeMatch = closePattern.exec(raw.slice(contentStart));

  if (!closeMatch) {
    return {
      content: raw.slice(contentStart),
      hasOpen: true,
      hasClose: false
    };
  }

  return {
    content: raw.slice(contentStart, contentStart + closeMatch.index),
    hasOpen: true,
    hasClose: true
  };
}

function extractStreamUi(raw: string): {
  content: string;
  hasOpen: boolean;
  hasClose: boolean;
} {
  const lower = raw.toLowerCase();
  const closeTag = "</streamui>";
  const openPattern = /<streamui\b[^>]*>/i;
  const openMatch = openPattern.exec(raw);

  if (!openMatch || openMatch.index === undefined) {
    return { content: "", hasOpen: false, hasClose: false };
  }

  const contentStart = openMatch.index + openMatch[0].length;
  const contentTail = raw.slice(contentStart);
  const lowerTail = lower.slice(contentStart);

  return {
    content: contentTail
      .replace(/<\/?streamui>/gi, "")
      .replace(/<streamui\b[^>]*>/gi, "")
      .replace(/<sessiontitle>[\s\S]*?<\/sessiontitle>/gi, "")
      .replace(/<sessiontitle\b[^>]*>[\s\S]*?<\/sessiontitle>/gi, "")
      .replace(/<sessiontitle\b[^>]*>[\s\S]*$/gi, "")
      .replace(/<\/?chat[^>]*>/gi, ""),
    hasOpen: true,
    hasClose: lowerTail.includes(closeTag)
  };
}

function removeProtocolTags(raw: string): string {
  return raw
    .replace(/<sessiontitle>[\s\S]*?<\/sessiontitle>/gi, "")
    .replace(/<sessiontitle\b[^>]*>[\s\S]*?<\/sessiontitle>/gi, "")
    .replace(/<sessiontitle\b[^>]*>[\s\S]*$/gi, "")
    .replace(/<\/?chat[^>]*>/gi, "")
    .replace(/<streamui\b[^>]*>[\s\S]*?<\/streamui>/gi, "")
    .replace(/<streamui\b[^>]*>[\s\S]*$/gi, "")
    .trim();
}

function extractStandaloneHtml(raw: string): {
  content: string;
  complete: boolean;
} | null {
  const withoutChatBlock = raw.replace(
    /<chat\b[^>]*>[\s\S]*?<\/chat>/gi,
    ""
  );
  let candidate = removeProtocolTags(withoutChatBlock).trim();
  let closingFence = false;
  const openingFence = /^```(?:html)?[\t ]*(?:\r?\n|$)/i.exec(candidate);

  if (openingFence) {
    candidate = candidate.slice(openingFence[0].length);
    const closingFenceMatch = /(?:\r?\n)?```[\t ]*$/.exec(candidate);
    if (closingFenceMatch?.index !== undefined) {
      closingFence = true;
      candidate = candidate.slice(0, closingFenceMatch.index);
    }
    candidate = candidate.trim();
  }

  if (
    !/^(?:<!doctype\s+html\b[^>]*>\s*)?<(?:html|head|body)\b/i.test(
      candidate
    )
  ) {
    return null;
  }

  return {
    content: candidate,
    complete: closingFence || /<\/html\s*>\s*$/i.test(candidate)
  };
}

export function extractStreamUiParts(raw: string): ExtractedStreamUiParts {
  const sessionTitle = extractBetween(raw, "sessiontitle");
  const chat = extractBetween(raw, "chat");
  const protocolStreamUi = extractStreamUi(raw);
  const recoveredHtml = protocolStreamUi.hasOpen
    ? null
    : extractStandaloneHtml(raw);
  const streamui = recoveredHtml
    ? {
        content: recoveredHtml.content,
        hasOpen: true,
        hasClose: recoveredHtml.complete
      }
    : protocolStreamUi;
  const fallbackText = streamui.hasOpen
    ? chat.content.trim()
    : chat.hasOpen
      ? chat.content.trim()
      : removeProtocolTags(raw);

  return {
    sessionTitle: sessionTitle.content.trim(),
    chat: chat.content.trim(),
    streamui: streamui.content,
    hasSessionTitle: sessionTitle.hasOpen,
    sessionTitleComplete: sessionTitle.hasClose,
    hasChat: chat.hasOpen,
    hasStreamUi: streamui.hasOpen,
    streamUiComplete: streamui.hasClose,
    recoveredStandaloneHtml: Boolean(recoveredHtml),
    fallbackText
  };
}
