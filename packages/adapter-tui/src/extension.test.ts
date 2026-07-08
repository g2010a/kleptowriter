import { describe, it, expect, mock, beforeEach } from "bun:test";
import { createKleptowriterExtension } from "./extension.js";

// Minimal mock of ExtensionAPI — captures registerCommand calls
function createMockPi() {
  const registeredCommands = new Map<
    string,
    { description?: string; handler: (args: string, ctx: unknown) => Promise<void> }
  >();
  return {
    registeredCommands,
    registerCommand: mock(
      (name: string, opts: { description?: string; handler: (args: string, ctx: unknown) => Promise<void> }) => {
        registeredCommands.set(name, opts);
      },
    ),
    sendUserMessage: mock((_content: string) => {}),
    // Stubs for other ExtensionAPI methods the factory might touch
    on: mock(() => {}),
    registerTool: mock(() => {}),
    registerShortcut: mock(() => {}),
    registerFlag: mock(() => {}),
  };
}

let pi: ReturnType<typeof createMockPi>;

beforeEach(() => {
  pi = createMockPi();
  const factory = createKleptowriterExtension();
  factory(pi as never);
});

describe("createKleptowriterExtension", () => {
  const expectedNames = [
    "/interview",
    "/ingest",
    "/write",
    "/bible",
    "/scenes",
    "/project",
  ];

  it("registers all 6 command names", () => {
    for (const name of expectedNames) {
      expect(pi.registeredCommands.has(name)).toBe(true);
    }
    expect(pi.registeredCommands.size).toBe(6);
  });

  it("each handler calls sendUserMessage", async () => {
    for (const [name, cmd] of pi.registeredCommands) {
      pi.sendUserMessage.mockClear();
      await cmd.handler("", {});
      expect(pi.sendUserMessage).toHaveBeenCalledTimes(1);
      expect(typeof pi.sendUserMessage.mock.calls[0]![0]).toBe("string");
    }
  });

  it("includes custom arguments in the message", async () => {
    const cmd = pi.registeredCommands.get("/interview")!;
    await cmd.handler("mystery novel set in 1920s Cairo", {});
    const sent = pi.sendUserMessage.mock.calls[0]![0] as string;
    expect(sent).toContain("mystery novel set in 1920s Cairo");
    expect(sent).toContain("User context:");
  });

  it("omits user context line when no args provided", async () => {
    const cmd = pi.registeredCommands.get("/write")!;
    await cmd.handler("", {});
    const sent = pi.sendUserMessage.mock.calls[0]![0] as string;
    expect(sent).not.toContain("User context:");
  });
});
