import { describe, it, expect, mock, beforeEach, afterEach } from "bun:test";

// ── Capture stdin data handlers for prompt simulation ────────────────────────

let stdinDataHandler: ((chunk: Buffer) => void) | null = null;

const mockStdin = {
  encoding: "" as BufferEncoding,
  setEncoding: mock((enc: BufferEncoding) => {
    mockStdin.encoding = enc;
  }),
  resume: mock(() => {}),
  pause: mock(() => {}),
  on: mock((event: string, handler: any) => {
    if (event === "data") stdinDataHandler = handler;
    return mockStdin;
  }),
  removeListener: mock(() => {}),
};

const mockStdout = {
  write: mock(() => {}),
};

const originalStdin = process.stdin;
const originalStdout = process.stdout;
const originalOn = process.on;
const originalExit = process.exit;

let sigintHandler: (() => void) | null = null;
const mockExit = mock(() => {});

// ── Mock module exports ──────────────────────────────────────────────────────

const mockIsValidProject = mock(async (path: string) => false);
const mockIsEmptyDir = mock(async (path: string) => false);
const mockInitProject = mock(async (path: string, name: string) => {});
const mockReadProjectManifest = mock(async (path: string) => ({ name: "Test" }));

mock.module("./project-detect.js", () => ({
  isValidProject: mockIsValidProject,
  isEmptyDir: mockIsEmptyDir,
  initProject: mockInitProject,
  readProjectManifest: mockReadProjectManifest,
}));

const mockSession = {
  run: mock(async () => {}),
  stop: mock(() => {}),
};
const mockCreateTuiSession = mock(async () => mockSession);

mock.module("./session.js", () => ({
  createTuiSession: mockCreateTuiSession,
}));

const mockExtensionFactory = mock(() => (pi: any) => {});
const mockCreateKleptowriterExtension = mock(
  (welcome?: any) => mockExtensionFactory,
);

mock.module("./extension.js", () => ({
  createKleptowriterExtension: mockCreateKleptowriterExtension,
}));

const mockWelcome = {
  render: mock(() => ["Welcome!"]),
  handleInput: mock(() => true),
  dismissed: false,
};
const mockCreateWelcomeComponent = mock(() => mockWelcome);

mock.module("./welcome.js", () => ({
  createWelcomeComponent: mockCreateWelcomeComponent,
}));

import { main } from "./cli.js";

// ── Helpers ──────────────────────────────────────────────────────────────────

function simulateInput(text: string) {
  stdinDataHandler?.(Buffer.from(text + "\n"));
}

// ── Setup / teardown ─────────────────────────────────────────────────────────

beforeEach(() => {
  stdinDataHandler = null;

  Object.defineProperty(process, "stdin", {
    value: mockStdin,
    writable: true,
    configurable: true,
  });
  Object.defineProperty(process, "stdout", {
    value: mockStdout,
    writable: true,
    configurable: true,
  });
  process.on = mock((event: string, handler: any) => {
    if (event === "SIGINT") sigintHandler = handler;
    return process;
  }) as any;
  Object.defineProperty(process, "exit", {
    value: mockExit,
    writable: true,
    configurable: true,
  });

  mockIsValidProject.mockClear();
  mockIsEmptyDir.mockClear();
  mockInitProject.mockClear();
  mockReadProjectManifest.mockClear();
  mockCreateTuiSession.mockClear();
  mockCreateKleptowriterExtension.mockClear();
  mockCreateWelcomeComponent.mockClear();
  mockSession.run.mockClear();
  mockSession.stop.mockClear();
  mockExit.mockClear();
  sigintHandler = null;

  mockStdin.setEncoding.mockClear();
  mockStdin.resume.mockClear();
  mockStdin.pause.mockClear();
  mockStdin.on.mockClear();
  mockStdin.removeListener.mockClear();
  mockStdout.write.mockClear();
});

afterEach(() => {
  Object.defineProperty(process, "stdin", {
    value: originalStdin,
    writable: true,
    configurable: true,
  });
  Object.defineProperty(process, "stdout", {
    value: originalStdout,
    writable: true,
    configurable: true,
  });
  process.on = originalOn;
  Object.defineProperty(process, "exit", {
    value: originalExit,
    writable: true,
    configurable: true,
  });
});

// ── Tests ────────────────────────────────────────────────────────────────────

describe("cli main", () => {
  it("empty cwd → shows init prompt, creates project on yes", async () => {
    mockIsEmptyDir.mockResolvedValue(true);
    mockIsValidProject.mockResolvedValue(false);

    const mainDone = main();
    await Bun.sleep(10);

    simulateInput("y");
    await Bun.sleep(10);

    simulateInput("My Novel");
    await Bun.sleep(10);

    await mainDone;

    expect(mockInitProject).toHaveBeenCalledWith(process.cwd(), "My Novel");
  });

  it("empty cwd → exits on no", async () => {
    mockIsEmptyDir.mockResolvedValue(true);
    mockIsValidProject.mockResolvedValue(false);

    const mainDone = main();
    await Bun.sleep(10);

    simulateInput("n");
    await Bun.sleep(10);

    await mainDone;

    expect(mockExit).toHaveBeenCalled();
  });

  it("non-empty non-project cwd → shows error and exits", async () => {
    mockIsEmptyDir.mockResolvedValue(false);
    mockIsValidProject.mockResolvedValue(false);

    const mainDone = main();
    await Bun.sleep(10);

    await mainDone;

    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it("valid project cwd → opens TUI directly", async () => {
    mockIsValidProject.mockResolvedValue(true);

    const mainDone = main();
    await Bun.sleep(10);

    await mainDone;

    expect(mockCreateTuiSession).toHaveBeenCalledWith(
      expect.objectContaining({ cwd: process.cwd() }),
    );
  });

  it("sets up SIGINT handler", async () => {
    mockIsValidProject.mockResolvedValue(true);

    const mainDone = main();
    await Bun.sleep(10);

    await mainDone;

    expect(sigintHandler).not.toBeNull();
  });

  it("SIGINT cleans up and exits", async () => {
    mockIsValidProject.mockResolvedValue(true);

    const mainDone = main();
    await Bun.sleep(10);

    await mainDone;

    sigintHandler!();

    expect(mockSession.stop).toHaveBeenCalled();
    expect(mockExit).toHaveBeenCalledWith(0);
  });
});
