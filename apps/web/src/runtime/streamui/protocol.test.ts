import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { extractStreamUiParts } from "./protocol";

describe("extractStreamUiParts", () => {
  it("separates title, chat, and streamui content", () => {
    const parts = extractStreamUiParts(
      "<sessiontitle>Demo</sessiontitle><chat>Hello</chat><streamui><p>Hi</p></streamui>"
    );

    assert.equal(parts.sessionTitle, "Demo");
    assert.equal(parts.chat, "Hello");
    assert.equal(parts.streamui, "<p>Hi</p>");
    assert.equal(parts.sessionTitleComplete, true);
    assert.equal(parts.hasChat, true);
    assert.equal(parts.hasStreamUi, true);
    assert.equal(parts.streamUiComplete, true);
  });

  it("keeps partial streamui content while streaming", () => {
    const parts = extractStreamUiParts(
      "<chat></chat><streamui><section><p>Loading"
    );

    assert.equal(parts.hasStreamUi, true);
    assert.equal(parts.streamUiComplete, false);
    assert.equal(parts.streamui, "<section><p>Loading");
  });

  it("accepts protocol tags with attributes", () => {
    const parts = extractStreamUiParts(
      '<sessiontitle data-x="1">Demo</sessiontitle><chat role="note"></chat><streamui data-kind="reply"><p>Hi</p></streamui>'
    );

    assert.equal(parts.sessionTitle, "Demo");
    assert.equal(parts.hasChat, true);
    assert.equal(parts.hasStreamUi, true);
    assert.equal(parts.streamUiComplete, true);
    assert.equal(parts.recoveredStandaloneHtml, false);
    assert.equal(parts.streamui, "<p>Hi</p>");
  });

  it("removes protocol tags accidentally emitted inside streamui", () => {
    const parts = extractStreamUiParts(
      "<streamui><chat>ignore</chat><p>Keep</p><sessiontitle>ignore</sessiontitle></streamui>"
    );

    assert.equal(parts.streamui, "ignore<p>Keep</p>");
  });

  it("uses plain fallback text when no streamui block exists", () => {
    const parts = extractStreamUiParts("Plain answer");

    assert.equal(parts.hasStreamUi, false);
    assert.equal(parts.fallbackText, "Plain answer");
  });

  it("recovers a standalone HTML document emitted without protocol tags", () => {
    const raw =
      "```html\n<!doctype html><html><body><h1>Recovered</h1></body></html>\n```";
    const parts = extractStreamUiParts(raw);

    assert.equal(parts.hasStreamUi, true);
    assert.equal(parts.streamUiComplete, true);
    assert.equal(parts.recoveredStandaloneHtml, true);
    assert.match(parts.streamui, /<h1>Recovered<\/h1>/);
    assert.equal(parts.fallbackText, "");
  });

  it("keeps chat copy while recovering HTML emitted beside the protocol", () => {
    const parts = extractStreamUiParts(
      "<sessiontitle>Demo</sessiontitle><chat>Summary</chat>" +
        "<!doctype html><html><body><h1>Recovered</h1></body></html>"
    );

    assert.equal(parts.chat, "Summary");
    assert.equal(parts.fallbackText, "Summary");
    assert.equal(parts.hasStreamUi, true);
    assert.equal(parts.recoveredStandaloneHtml, true);
  });

  it("does not reinterpret ordinary Markdown containing HTML as an artifact", () => {
    const parts = extractStreamUiParts(
      "Here is an example:\n```html\n<div>Example</div>\n```"
    );

    assert.equal(parts.hasStreamUi, false);
    assert.equal(parts.recoveredStandaloneHtml, false);
    assert.match(parts.fallbackText, /Here is an example/);
  });
});
