import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Request, Response } from "express";
import { createChatRunCancellationHandler } from "./chatRunCancellationRoute.js";
import type { ChatRunTerminalResult } from "./chatRunTerminalCoordinator.js";

function deferred() {
  let resolve: () => void = () => {};
  let reject: (error: unknown) => void = () => {};
  const promise = new Promise<void>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function responseHarness() {
  const jsonBodies: unknown[] = [];
  const statuses: number[] = [];
  const response = {
    status(code: number) {
      statuses.push(code);
      return response;
    },
    json(body: unknown) {
      jsonBodies.push(body);
      return response;
    }
  } as unknown as Response;
  return { response, jsonBodies, statuses };
}

function request(runId: string): Request {
  return { params: { runId } } as unknown as Request;
}

function result(
  outcome: ChatRunTerminalResult["outcome"],
  transitioned: boolean,
  persistence: Promise<void>
): ChatRunTerminalResult {
  return { outcome, transitioned, persistence };
}

describe("chat run cancellation route", () => {
  it("returns 404 for a missing run", async () => {
    const harness = responseHarness();
    const handler = createChatRunCancellationHandler({
      findRun: () => undefined
    });

    await handler(request("missing"), harness.response);

    assert.deepEqual(harness.statuses, [404]);
    assert.deepEqual(harness.jsonBodies, [{ error: "Chat run not found." }]);
  });

  it("waits for persistence before returning the exact outcome", async () => {
    const pending = deferred();
    const harness = responseHarness();
    const handler = createChatRunCancellationHandler({
      findRun: (runId) => ({
        runId,
        requestId: "request-1",
        cancel: () => result("cancelled", true, pending.promise)
      })
    });
    const handling = handler(request(" run-1 "), harness.response);

    await Promise.resolve();
    assert.deepEqual(harness.jsonBodies, []);
    pending.resolve();
    await handling;

    assert.deepEqual(harness.statuses, []);
    assert.deepEqual(harness.jsonBodies, [
      { runId: "run-1", outcome: "cancelled", transitioned: true }
    ]);
  });

  it("returns an existing natural terminal without relabeling it", async () => {
    const harness = responseHarness();
    const handler = createChatRunCancellationHandler({
      findRun: (runId) => ({
        runId,
        requestId: "request-1",
        cancel: () => result("complete", false, Promise.resolve())
      })
    });

    await handler(request("run-1"), harness.response);

    assert.deepEqual(harness.jsonBodies, [
      { runId: "run-1", outcome: "complete", transitioned: false }
    ]);
  });

  it("returns 500 when terminal persistence fails", async () => {
    const failure = new Error("disk failed");
    const warnings: unknown[][] = [];
    const harness = responseHarness();
    const handler = createChatRunCancellationHandler({
      findRun: (runId) => ({
        runId,
        requestId: "request-1",
        cancel: () => result("cancelled", true, Promise.reject(failure))
      }),
      warn: (...args) => warnings.push(args)
    });

    await handler(request("run-1"), harness.response);

    assert.deepEqual(harness.statuses, [500]);
    assert.deepEqual(harness.jsonBodies, [
      { error: "Could not persist chat cancellation." }
    ]);
    assert.equal(warnings.length, 1);
    assert.equal(warnings[0][1], failure);
  });
});
