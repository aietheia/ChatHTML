import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LocalSessionMergeDialogContent } from "./LocalSessionMergeDialog";

(globalThis as typeof globalThis & { React: typeof React }).React = React;

describe("local session merge dialog", () => {
  it("offers an explicit account merge or a local-only choice", () => {
    const markup = renderToStaticMarkup(
      <LocalSessionMergeDialogContent
        sessionCount={3}
        isMerging={false}
        error={null}
        onMerge={() => undefined}
        onKeepLocal={() => undefined}
      />
    );

    assert.match(markup, /Merge 3 local sessions/);
    assert.match(markup, /Keep only on this device/);
    assert.match(markup, /sessions and their files/);
    assert.match(markup, /unless the account upload finishes/);
  });
});
