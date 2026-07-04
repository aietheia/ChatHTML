import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getApiMessageContent,
  htmlToTranscriptText,
  toApiMessages
} from "./apiMessages";
import type { ClientMessage } from "../../domain/chat/sessionModel";

describe("chat apiMessages", () => {
  it("turns artifact html into transcript text", () => {
    assert.equal(
      htmlToTranscriptText("<style>.x{}</style><p>Hello <strong>world</strong></p><script>x()</script>"),
      "Hello world"
    );
  });

  it("prefers visible message content", () => {
    const message: ClientMessage = {
      id: "a1",
      role: "assistant",
      content: "Visible answer",
      rawStream: "<streamui><p>Artifact</p></streamui>"
    };

    assert.equal(getApiMessageContent(message), "Visible answer");
  });

  it("summarizes assistant streamui artifacts for future turns", () => {
    const message: ClientMessage = {
      id: "a1",
      role: "assistant",
      content: "",
      rawStream:
        "<chat></chat><streamui><section><p>Artifact text</p></section></streamui>"
    };

    assert.equal(
      getApiMessageContent(message),
      "[Assistant produced a StreamUI artifact for this turn. Text summary: Artifact text]"
    );
  });

  it("uses a placeholder for empty artifacts", () => {
    const message: ClientMessage = {
      id: "a1",
      role: "assistant",
      content: "",
      rawStream: "<chat></chat><streamui><div></div></streamui>"
    };

    assert.equal(
      getApiMessageContent(message),
      "[Assistant produced a StreamUI artifact for this turn.]"
    );
  });

  it("filters welcome messages and maps image attachments", () => {
    const messages: ClientMessage[] = [
      { id: "welcome", role: "assistant", content: "Welcome" },
      {
        id: "u1",
        role: "user",
        content: "Describe this",
        attachments: [
          {
            id: "img1",
            name: "photo.png",
            mimeType: "image/png",
            size: 12,
            dataUrl: "data:image/png;base64,aaaa"
          }
        ]
      }
    ];

    assert.deepEqual(toApiMessages(messages), [
      {
        role: "user",
        content: "Describe this",
        images: [
          {
            name: "photo.png",
            mimeType: "image/png",
            size: 12,
            dataUrl: "data:image/png;base64,aaaa"
          }
        ]
      }
    ]);
  });
});
