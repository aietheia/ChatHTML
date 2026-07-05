import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  extractResponsesOutputText,
  summarizeHttpErrorBody
} from "../../server/openrouter.js";

describe("openrouter response stream helpers", () => {
  it("extracts final output text from a completed Responses payload", () => {
    const text = extractResponsesOutputText({
      output: [
        {
          type: "message",
          content: [
            { type: "output_text", text: "Hello" },
            { type: "output_text", text: " world" }
          ]
        }
      ]
    });

    assert.equal(text, "Hello world");
  });

  it("ignores tool calls while extracting final output text", () => {
    const text = extractResponsesOutputText({
      output: [
        {
          type: "function_call",
          name: "retrieve",
          call_id: "call-1",
          arguments: "{}"
        },
        {
          type: "message",
          content: [{ type: "output_text", text: "Final answer" }]
        }
      ]
    });

    assert.equal(text, "Final answer");
  });

  it("summarizes html error pages without leaking markup", () => {
    const message = summarizeHttpErrorBody(`<!DOCTYPE html>
      <html><head><title>aiz.ink | 502: Bad gateway</title></head>
      <body><h1>Bad gateway</h1><script>ignored()</script></body></html>`);

    assert.equal(message, "aiz.ink | 502: Bad gateway");
    assert.equal(message.includes("<html"), false);
  });

  it("prefers json error messages when summarizing response failures", () => {
    assert.equal(
      summarizeHttpErrorBody(
        JSON.stringify({ error: { message: "Provider overloaded" } })
      ),
      "Provider overloaded"
    );
  });
});
