import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type {
  ArtifactEdit,
  ClientMessage
} from "../../domain/chat/sessionModel";
import { selectArtifactEditVersion } from "./artifactEditOperationModel";

const originalRaw =
  "<chat>Original</chat><streamui><main>Original artifact</main></streamui>";
const editedRaw =
  "<chat>Edited</chat><streamui><main>Edited artifact</main></streamui>";

function completeEdit(
  id: string,
  rawStream: string,
  parentId?: string
): ArtifactEdit {
  return {
    id,
    parentId,
    createdAt: 1,
    prompt: `Edit ${id}`,
    references: [],
    activeVariantId: `${id}-variant`,
    variants: [
      {
        id: `${id}-variant`,
        createdAt: 1,
        status: "complete",
        rawStream
      }
    ],
    status: "complete"
  };
}

function assistant(overrides: Partial<ClientMessage> = {}): ClientMessage {
  return {
    id: "assistant-1",
    role: "assistant",
    content: "Edited",
    rawStream: editedRaw,
    artifactEditBaseRawStream: originalRaw,
    artifactEdits: [completeEdit("edit-1", editedRaw)],
    activeArtifactEditId: "edit-1",
    status: "complete",
    ...overrides
  };
}

describe("artifact edit version selection", () => {
  it("rebuilds original and completed edit projections", () => {
    const original = selectArtifactEditVersion(assistant(), undefined, "day");
    assert.equal(original.selected, true);
    assert.equal(original.message.rawStream, originalRaw);
    assert.equal(original.message.content, "Original");
    assert.equal(original.message.activeArtifactEditId, undefined);
    assert.equal(original.message.snapshot?.raw, "<main>Original artifact</main>");
    assert.match(original.message.snapshot?.iframeDocument ?? "", /data-page-theme="day"/);

    const edited = selectArtifactEditVersion(
      original.message,
      "edit-1",
      "night"
    );
    assert.equal(edited.selected, true);
    assert.equal(edited.message.rawStream, editedRaw);
    assert.equal(edited.message.content, "Edited");
    assert.equal(edited.message.activeArtifactEditId, "edit-1");
    assert.match(edited.message.snapshot?.iframeDocument ?? "", /data-page-theme="night"/);
  });

  it("shows a failed edit's parent source while retaining its retry identity", () => {
    const parent = completeEdit("parent", editedRaw);
    const failed: ArtifactEdit = {
      id: "failed",
      parentId: parent.id,
      createdAt: 2,
      prompt: "Broken edit",
      references: [],
      activeVariantId: "failed-variant",
      variants: [
        {
          id: "failed-variant",
          createdAt: 2,
          status: "error",
          error: "failed"
        }
      ],
      status: "error",
      error: "failed"
    };
    const result = selectArtifactEditVersion(
      assistant({ artifactEdits: [parent, failed] }),
      failed.id,
      "night"
    );

    assert.equal(result.selected, true);
    assert.equal(result.message.rawStream, editedRaw);
    assert.equal(result.message.activeArtifactEditId, failed.id);
  });

  it("does not select missing, pending, or user versions", () => {
    const current = assistant();
    const missing = selectArtifactEditVersion(current, "missing", "night");
    assert.equal(missing.selected, false);
    assert.equal(missing.message, current);

    const pendingEdit: ArtifactEdit = {
      id: "pending",
      createdAt: 2,
      prompt: "Pending edit",
      references: [],
      activeVariantId: "pending-variant",
      variants: [
        {
          id: "pending-variant",
          createdAt: 2,
          status: "pending"
        }
      ],
      status: "pending"
    };
    const pendingMessage = assistant({ artifactEdits: [pendingEdit] });
    const pending = selectArtifactEditVersion(
      pendingMessage,
      pendingEdit.id,
      "night"
    );
    assert.equal(pending.selected, false);
    assert.equal(pending.message, pendingMessage);

    const user: ClientMessage = {
      id: "user-1",
      role: "user",
      content: "hello"
    };
    const userResult = selectArtifactEditVersion(user, undefined, "night");
    assert.equal(userResult.selected, false);
    assert.equal(userResult.message, user);
  });

  it("clears stale artifact projection fields for a text-only version", () => {
    const current = assistant({
      artifactEditBaseRawStream: "<chat>Text-only original</chat>",
      snapshot: {
        raw: "<main>stale</main>",
        completedHtml: "<main>stale</main>",
        iframeDocument: "stale",
        errors: [],
        status: "complete"
      },
      artifactContext: {
        id: "stale",
        sourceHash: "stale",
        textSummary: "stale",
        sourceChars: 5,
        styleSummary: "stale",
        structureSummary: "stale",
        editableSummary: "stale"
      }
    });
    const result = selectArtifactEditVersion(current, undefined, "night");

    assert.equal(result.selected, true);
    assert.equal(result.message.content, "Text-only original");
    assert.equal(result.message.hasStreamUi, false);
    assert.equal(result.message.snapshot, undefined);
    assert.equal(result.message.artifactContext, undefined);
  });
});
