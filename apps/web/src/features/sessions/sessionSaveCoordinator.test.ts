import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type {
  ChatSession,
  SessionState
} from "../../domain/chat/sessionModel";
import {
  createSessionSaveCoordinator,
  type SessionSaveCoordinator,
  type SessionSaveDependencies,
  type SessionSaveScheduler
} from "./sessionSaveCoordinator";

function session(id: string, content = id): ChatSession {
  return {
    id,
    title: content,
    createdAt: 1,
    updatedAt: 1,
    messages: [{ id: `message-${id}`, role: "user", content }],
    files: []
  };
}

function state(id: string): SessionState {
  return { activeSessionId: id, sessions: [session(id)] };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((next, fail) => {
    resolve = next;
    reject = fail;
  });
  return { promise, resolve, reject };
}

type ScheduledTask = {
  delayMs: number;
  task: () => Promise<void>;
  cancelled: boolean;
};

function fakeScheduler(tasks: ScheduledTask[]): SessionSaveScheduler {
  return {
    schedule: (delayMs, task) => {
      const scheduled = { delayMs, task, cancelled: false };
      tasks.push(scheduled);
      return () => {
        scheduled.cancelled = true;
      };
    }
  };
}

function serialized(
  value: SessionState,
  clientId: string,
  deletedSessionIds: string[]
): string {
  return JSON.stringify({
    activeSessionId: value.activeSessionId,
    clientId,
    deletedSessionIds
  });
}

function createHarness(options: {
  persist?: SessionSaveDependencies["persist"];
  flush?: SessionSaveDependencies["flush"];
}) {
  let loaded = true;
  let current = state("session-a");
  let clientId = "client-1";
  const deletedIds = new Set<string>();
  const tasks: ScheduledTask[] = [];
  const persistCalls: Array<{
    payload: string;
    clientId: string;
    signal?: AbortSignal;
  }> = [];
  const flushCalls: Array<{ payload: string; clientId: string }> = [];
  const warnings: unknown[] = [];
  const controllers: AbortController[] = [];
  let clearLegacyCount = 0;

  const persist: SessionSaveDependencies["persist"] = async (
    payload,
    requestedClientId,
    signal
  ) => {
    persistCalls.push({ payload, clientId: requestedClientId, signal });
    return options.persist
      ? options.persist(payload, requestedClientId, signal)
      : new Response(null, { status: 204 });
  };
  const flush: SessionSaveDependencies["flush"] = (
    payload,
    requestedClientId
  ) => {
    flushCalls.push({ payload, clientId: requestedClientId });
    options.flush?.(payload, requestedClientId);
  };

  const coordinator = createSessionSaveCoordinator(
    {
      isLoaded: () => loaded,
      getLatestState: () => current,
      getClientId: () => clientId,
      getDeletedSessionIds: () => deletedIds
    },
    350,
    {
      serialize: serialized,
      persist,
      flush,
      clearLegacy: () => {
        clearLegacyCount += 1;
      },
      warn: (error) => warnings.push(error),
      scheduler: fakeScheduler(tasks),
      createAbortController: () => {
        const controller = new AbortController();
        controllers.push(controller);
        return controller;
      }
    }
  );

  return {
    coordinator,
    tasks,
    persistCalls,
    flushCalls,
    warnings,
    controllers,
    deletedIds,
    setLoaded: (value: boolean) => {
      loaded = value;
    },
    setState: (value: SessionState) => {
      current = value;
    },
    setClientId: (value: string) => {
      clientId = value;
    },
    getClearLegacyCount: () => clearLegacyCount
  };
}

describe("session save coordinator", () => {
  it("skips autosave, saveNow, and exit flush while sessions are unloaded", async () => {
    const harness = createHarness({});
    harness.setLoaded(false);

    harness.coordinator.scheduleAutosave(state("render"), false)();

    assert.equal(await harness.coordinator.saveNow(), "skipped");
    assert.equal(harness.coordinator.flushPageExit(), "skipped");
    assert.equal(harness.tasks.length, 0);
    assert.equal(harness.persistCalls.length, 0);
    assert.equal(harness.flushCalls.length, 0);
  });

  it("debounces a captured render snapshot while saveNow reads the latest refs", async () => {
    const harness = createHarness({});
    const renderState = state("render-a");

    harness.coordinator.scheduleAutosave(renderState, true);
    assert.equal(harness.tasks.length, 1);
    assert.equal(harness.tasks[0].delayMs, 350);
    assert.equal(harness.persistCalls.length, 0);

    harness.setState(state("latest-b"));
    harness.deletedIds.add("deleted-after-render");
    await harness.tasks[0].task();

    assert.deepEqual(JSON.parse(harness.persistCalls[0].payload), {
      activeSessionId: "render-a",
      clientId: "client-1",
      deletedSessionIds: []
    });
    assert.ok(harness.persistCalls[0].signal instanceof AbortSignal);
    assert.equal(harness.getClearLegacyCount(), 1);

    assert.equal(await harness.coordinator.saveNow(), "saved");
    assert.deepEqual(JSON.parse(harness.persistCalls[1].payload), {
      activeSessionId: "latest-b",
      clientId: "client-1",
      deletedSessionIds: ["deleted-after-render"]
    });
    assert.equal(harness.persistCalls[1].signal, undefined);
    assert.equal(harness.getClearLegacyCount(), 2);
  });

  it("cancels the previous timer and aborts an in-flight autosave", async () => {
    const pending = deferred<Response>();
    const harness = createHarness({ persist: async () => pending.promise });
    const cleanup = harness.coordinator.scheduleAutosave(state("first"), true);
    const saving = harness.tasks[0].task();

    assert.equal(harness.controllers[0].signal.aborted, false);
    cleanup();
    assert.equal(harness.tasks[0].cancelled, true);
    assert.equal(harness.controllers[0].signal.aborted, true);

    const abortError = new Error("aborted");
    abortError.name = "AbortError";
    pending.reject(abortError);
    await saving;
    assert.equal(harness.warnings.length, 0);

    harness.coordinator.scheduleAutosave(state("second"), true);
    harness.coordinator.scheduleAutosave(state("third"), true);
    assert.equal(harness.tasks[1].cancelled, true);
    assert.equal(harness.controllers[1].signal.aborted, true);
    assert.equal(harness.tasks.length, 3);
  });

  it("aborts the previous autosave before skipping a duplicate payload", async () => {
    const harness = createHarness({});
    const snapshot = state("same");
    harness.coordinator.scheduleAutosave(snapshot, true);
    await harness.tasks[0].task();

    assert.equal(harness.controllers[0].signal.aborted, false);
    harness.coordinator.scheduleAutosave(snapshot, true);

    assert.equal(harness.controllers[0].signal.aborted, true);
    assert.equal(harness.controllers.length, 2);
    assert.equal(harness.tasks.length, 1);
  });

  it("warns for autosave failures without acknowledging or clearing legacy", async () => {
    const harness = createHarness({
      persist: async () => new Response(null, { status: 500 })
    });
    harness.coordinator.scheduleAutosave(state("failed"), true);

    await harness.tasks[0].task();

    assert.equal(harness.warnings.length, 1);
    assert.match(String(harness.warnings[0]), /Session save failed with HTTP 500/);
    assert.equal(harness.getClearLegacyCount(), 0);
    assert.equal(
      harness.coordinator.getDebugState().lastSavedPayload,
      null
    );
  });

  it("keeps current last-completion-wins behavior for concurrent saveNow calls", async () => {
    const first = deferred<Response>();
    const second = deferred<Response>();
    const responses = [first, second];
    let requestIndex = 0;
    const harness = createHarness({
      persist: async () => responses[requestIndex++].promise
    });

    harness.setState(state("older"));
    const olderSave = harness.coordinator.saveNow();
    harness.setState(state("newer"));
    const newerSave = harness.coordinator.saveNow();
    assert.equal(harness.persistCalls.length, 2);

    second.resolve(new Response(null, { status: 204 }));
    assert.equal(await newerSave, "saved");
    first.resolve(new Response(null, { status: 204 }));
    assert.equal(await olderSave, "saved");

    assert.deepEqual(
      JSON.parse(harness.coordinator.getDebugState().lastSavedPayload ?? "{}"),
      {
        activeSessionId: "older",
        clientId: "client-1",
        deletedSessionIds: []
      }
    );
  });

  it("marks exit payloads before transport and deduplicates consecutive events", () => {
    let coordinator!: SessionSaveCoordinator;
    let markerSeenByTransport: string | null = null;
    const harness = createHarness({
      flush: () => {
        markerSeenByTransport = coordinator.getDebugState().lastSavedPayload;
      }
    });
    coordinator = harness.coordinator;
    harness.setState(state("exit"));
    harness.setClientId("client-exit");

    assert.equal(coordinator.flushPageExit(), "flushed");
    assert.equal(markerSeenByTransport, harness.flushCalls[0].payload);
    assert.equal(coordinator.flushPageExit(), "skipped");
    assert.equal(harness.flushCalls.length, 1);
    assert.equal(harness.getClearLegacyCount(), 0);
  });

  it("dispose clears a pending timer and aborts its controller", () => {
    const harness = createHarness({});
    harness.coordinator.scheduleAutosave(state("pending"), true);

    harness.coordinator.dispose();

    assert.equal(harness.tasks[0].cancelled, true);
    assert.equal(harness.controllers[0].signal.aborted, true);
    assert.equal(harness.coordinator.getDebugState().hasAutosave, false);
  });
});
