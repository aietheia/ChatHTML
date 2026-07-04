import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createArtifactFilename,
  getSnapshotSourceCode,
  normalizeSvgMarkup
} from "./artifactExport";
import type { RenderSnapshot } from "../runtime/streamui/types";

function makeSnapshot(patch: Partial<RenderSnapshot>): RenderSnapshot {
  return {
    raw: "",
    completedHtml: "",
    iframeDocument: "<!doctype html>",
    errors: [],
    status: "complete",
    ...patch
  };
}

describe("artifactExport", () => {
  it("uses the raw artifact as copied source code when available", () => {
    const snapshot = makeSnapshot({
      raw: "<section><p>Raw source</p></section>",
      completedHtml: "<section><p>Completed source</p></section>"
    });

    assert.equal(
      getSnapshotSourceCode(snapshot),
      "<section><p>Raw source</p></section>\n"
    );
  });

  it("falls back to completed html for source code when raw is empty", () => {
    const snapshot = makeSnapshot({
      completedHtml: "<section><p>Completed source</p></section>"
    });

    assert.equal(
      getSnapshotSourceCode(snapshot),
      "<section><p>Completed source</p></section>\n"
    );
  });

  it("creates safe export filenames", () => {
    assert.equal(
      createArtifactFilename("assistant:one/two.svg", "png"),
      "assistant-one-two.png"
    );
    assert.equal(createArtifactFilename("   ", "svg"), "streamui-artifact.svg");
  });

  it("normalizes svg markup with a single xml declaration", () => {
    assert.equal(
      normalizeSvgMarkup("<svg></svg>"),
      '<?xml version="1.0" encoding="UTF-8"?>\n<svg></svg>\n'
    );
    assert.equal(
      normalizeSvgMarkup('<?xml version="1.0"?><svg></svg>'),
      '<?xml version="1.0"?><svg></svg>\n'
    );
  });
});
