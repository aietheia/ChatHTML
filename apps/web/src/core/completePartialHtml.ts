const VOID_TAGS = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr"
]);

type CompletionOptions = {
  allowScripts?: boolean;
  allowPartialStyles?: boolean;
};

function removeBrokenTrailingTag(input: string): string {
  const lastLt = input.lastIndexOf("<");
  const lastGt = input.lastIndexOf(">");

  if (lastLt > lastGt) {
    return input.slice(0, lastLt);
  }

  return input;
}

function stripScriptBlocks(input: string, allowScripts: boolean): string {
  const lower = input.toLowerCase();
  const lastOpen = lower.lastIndexOf("<script");
  const lastClose = lower.lastIndexOf("</script>");
  const stable =
    lastOpen > lastClose
      ? input.slice(0, lastOpen)
      : input;

  if (allowScripts) {
    return stable;
  }

  return stable.replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, "");
}

function stripUnsafeInlineAttributes(input: string): string {
  return input
    .replace(/\s+on[a-z]+\s*=\s*"[^"]*"/gi, "")
    .replace(/\s+on[a-z]+\s*=\s*'[^']*'/gi, "")
    .replace(/\s+on[a-z]+\s*=\s*[^\s>]+/gi, "")
    .replace(
      /\s+(href|src|xlink:href)\s*=\s*(["'])\s*javascript:[\s\S]*?\2/gi,
      " $1=\"#\""
    );
}

function stabilizeViewportHeightUnits(input: string): string {
  return input.replace(
    /\b(\d+(?:\.\d+)?)(dvh|svh|lvh|vh)\b/gi,
    (_match, rawValue: string, unit: string) => {
      const value = Number.parseFloat(rawValue);
      if (!Number.isFinite(value)) {
        return `${rawValue}${unit}`;
      }

      const px = Number((value * 7.2).toFixed(2));
      return `min(${rawValue}${unit}, ${px}px)`;
    }
  );
}

function neutralizeExpensiveCssDeclarations(css: string): string {
  return css
    .replace(
      /\bbackground-attachment\s*:\s*fixed\b/gi,
      "background-attachment: scroll"
    )
    .replace(
      /\b(background(?:-image)?\s*:[^;{}]*?)\bfixed\b/gi,
      "$1scroll"
    )
    .replace(/\s*-webkit-backdrop-filter\s*:[^;{}]+;?/gi, "")
    .replace(/\s*backdrop-filter\s*:[^;{}]+;?/gi, "")
    .replace(
      /\bfilter\s*:\s*[^;{}]*(?:blur|drop-shadow)\([^;{}]*;?/gi,
      "filter: none;"
    )
    .replace(/\bmix-blend-mode\s*:\s*(?!normal\b)[^;{}]+;?/gi, "mix-blend-mode: normal;");
}

function neutralizeExpensiveCss(input: string): string {
  return input
    .replace(
      /(<style\b[^>]*>)([\s\S]*?)(<\/style\s*>)/gi,
      (_match, openTag: string, css: string, closeTag: string) =>
        `${openTag}${neutralizeExpensiveCssDeclarations(css)}${closeTag}`
    )
    .replace(
      /\sstyle=(["'])([^"']*)\1/gi,
      (_match, quote: string, css: string) =>
        ` style=${quote}${neutralizeExpensiveCssDeclarations(css)}${quote}`
    );
}

function closeIncompleteStyleBlock(
  input: string,
  allowPartialStyles: boolean
): string {
  const lower = input.toLowerCase();
  const lastOpen = lower.lastIndexOf("<style");
  const lastClose = lower.lastIndexOf("</style>");

  if (lastOpen <= lastClose) {
    return input;
  }

  const openEnd = input.indexOf(">", lastOpen);
  if (openEnd === -1) {
    return input.slice(0, lastOpen);
  }

  if (!allowPartialStyles) {
    return input.slice(0, lastOpen);
  }

  return `${input}\n</style>`;
}

function appendMissingClosers(input: string): string {
  const stack: string[] = [];
  const tagPattern = /<\/?([a-zA-Z][\w:-]*)(?:\s[^<>]*)?>/g;
  const scanInput = input.replace(
    /<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,
    (_block, tagName: string) => `<${tagName}></${tagName}>`
  );
  let match: RegExpExecArray | null;

  while ((match = tagPattern.exec(scanInput)) !== null) {
    const fullTag = match[0];
    const tagName = match[1].toLowerCase();

    if (
      fullTag.startsWith("<!") ||
      fullTag.startsWith("<?") ||
      VOID_TAGS.has(tagName)
    ) {
      continue;
    }

    if (fullTag.startsWith("</")) {
      const index = stack.lastIndexOf(tagName);
      if (index !== -1) {
        stack.splice(index);
      }
      continue;
    }

    if (fullTag.endsWith("/>")) {
      continue;
    }

    stack.push(tagName);
  }

  if (stack.length === 0) {
    return input;
  }

  return `${input}${stack
    .reverse()
    .map((tagName) => `</${tagName}>`)
    .join("")}`;
}

export function completePartialHtml(
  input: string,
  options: CompletionOptions = {}
): string {
  const allowScripts = options.allowScripts ?? false;
  const allowPartialStyles = options.allowPartialStyles ?? false;
  const withoutBrokenTail = removeBrokenTrailingTag(input);
  const withoutScripts = stripScriptBlocks(withoutBrokenTail, allowScripts);
  const withoutUnsafeAttributes = stripUnsafeInlineAttributes(withoutScripts);
  const withStableViewportUnits = stabilizeViewportHeightUnits(
    withoutUnsafeAttributes
  );
  const withClosedStyle = closeIncompleteStyleBlock(
    withStableViewportUnits,
    allowPartialStyles
  );
  const withPerformanceSafeCss = neutralizeExpensiveCss(withClosedStyle);

  return appendMissingClosers(withPerformanceSafeCss);
}
