import { expect, test } from "bun:test";
import { CodexAdapter } from "./index.js";

test("adapter lifecycle", async () => {
  const adapter = new CodexAdapter();

  expect(adapter.isRunning()).toBe(false);

  await adapter.start();
  expect(adapter.isRunning()).toBe(true);

  await adapter.stop();
  expect(adapter.isRunning()).toBe(false);
});
