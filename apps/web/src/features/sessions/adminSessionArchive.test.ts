import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeAdminSessionArchive } from "./adminSessionArchive";

describe("admin session archive", () => {
  it("projects every account into unique read-only session list entries", () => {
    const archive = normalizeAdminSessionArchive(
      {
        accounts: [
          {
            accountId: "11111111-account-one",
            sessions: [
              {
                id: "shared-session-id",
                title: "First conversation",
                createdAt: 1,
                updatedAt: 10,
                messages: [
                  { id: "user-1", role: "user", content: "First prompt" },
                  {
                    id: "assistant-1",
                    role: "assistant",
                    content: "First response",
                    rawStream:
                      "<streamui><main>Rendered artifact</main></streamui>",
                    hasStreamUi: true,
                    streamUiComplete: true,
                    status: "complete"
                  }
                ],
                files: [
                  {
                    id: "file-1",
                    kind: "image",
                    name: "image.png",
                    mimeType: "image/png",
                    size: 12,
                    createdAt: 2,
                    storageKey: "uploads/file-1.png",
                    accessToken: "capability",
                    embedUrl: "/api/files/file-1/content?token=capability"
                  }
                ]
              }
            ]
          },
          {
            accountId: "22222222-account-two",
            sessions: [
              {
                id: "shared-session-id",
                title: "Second conversation",
                createdAt: 3,
                updatedAt: 20,
                messages: [
                  { id: "user-2", role: "user", content: "Second prompt" }
                ],
                files: []
              }
            ]
          }
        ]
      },
      100
    );

    assert.equal(archive.sessions.length, 2);
    assert.equal(archive.sessions[0].title, "Account 22222222 · Second prompt");
    assert.equal(archive.sessions[1].title, "Account 11111111 · First prompt");
    assert.notEqual(archive.sessions[0].id, archive.sessions[1].id);
    assert.equal(archive.activeSessionId, archive.sessions[0].id);
    assert.match(
      archive.sessions[1].messages[1]?.rawStream ?? "",
      /Rendered artifact/
    );
    assert.equal(
      archive.sessions[1].files[0]?.embedUrl,
      "/api/files/file-1/content?token=capability"
    );
  });

  it("returns an empty projection for malformed archives", () => {
    assert.deepEqual(normalizeAdminSessionArchive(null), {
      sessions: [],
      activeSessionId: ""
    });
    assert.deepEqual(normalizeAdminSessionArchive({ accounts: "invalid" }), {
      sessions: [],
      activeSessionId: ""
    });
  });
});
