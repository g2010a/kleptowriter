import { expect, test } from "bun:test";
import { parseStandaloneCommand, StandaloneAdapter } from "./index.js";

test("adapter lifecycle", async () => {
  const adapter = new StandaloneAdapter();

  expect(adapter.isRunning()).toBe(false);

  await adapter.start();
  expect(adapter.isRunning()).toBe(true);

  await adapter.stop();
  expect(adapter.isRunning()).toBe(false);
});

test("parses standalone commands", () => {
  expect(parseStandaloneCommand(["bun", "kleptowriter", "init"])).toBe("init");
  expect(parseStandaloneCommand(["bun", "kleptowriter", "run"])).toBe("run");
  expect(parseStandaloneCommand(["bun", "kleptowriter", "status"])).toBe("status");
  expect(parseStandaloneCommand(["bun", "kleptowriter", "nope"])).toBeUndefined();
});
