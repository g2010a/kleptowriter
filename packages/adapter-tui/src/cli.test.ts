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

const mockListProjects = mock(async () => [] as any[]);
const mockCreateProject = mock(async (name: string, path: string) => ({
  name,
  path,
  created: "2024-01-01T00:00:00Z",
  lastOpened: "2024-01-01T00:00:00Z",
}));
const mockTouchProject = mock(async () => {});

mock.module("./project-manager.js", () => ({
  listProjects: mockListProjects,
  createProject: mockCreateProject,
  touchProject: mockTouchProject,
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

  mockListProjects.mockClear();
  mockCreateProject.mockClear();
  mockTouchProject.mockClear();
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
  it("empty project list → prompts for name/path and creates project", async () => {
    mockListProjects.mockResolvedValue([]);

    const mainDone = main();
    await Bun.sleep(10);

    simulateInput("My Novel");
    await Bun.sleep(10);

    simulateInput("/tmp/my-novel");
    await Bun.sleep(10);

    await mainDone;

    expect(mockCreateProject).toHaveBeenCalledWith("My Novel", "/tmp/my-novel");
    expect(mockTouchProject).toHaveBeenCalledWith("My Novel");
  });

  it("existing projects → shows list and user selects", async () => {
    mockListProjects.mockResolvedValue([
      {
        name: "Project A",
        path: "/a",
        created: "2024-01-01",
        lastOpened: "2024-01-01",
      },
      {
        name: "Project B",
        path: "/b",
        created: "2024-01-01",
        lastOpened: "2024-01-01",
      },
    ]);

    const mainDone = main();
    await Bun.sleep(10);

    simulateInput("1");
    await Bun.sleep(10);

    await mainDone;

    expect(mockTouchProject).toHaveBeenCalledWith("Project A");
    expect(mockCreateTuiSession).toHaveBeenCalledWith(
      expect.objectContaining({ cwd: "/a" }),
    );
  });

  it("existing projects → user selects create new", async () => {
    mockListProjects.mockResolvedValue([
      {
        name: "Project A",
        path: "/a",
        created: "2024-01-01",
        lastOpened: "2024-01-01",
      },
    ]);

    const mainDone = main();
    await Bun.sleep(10);

    simulateInput("2");
    await Bun.sleep(10);

    simulateInput("New Project");
    await Bun.sleep(10);

    simulateInput("/tmp/new-project");
    await Bun.sleep(10);

    await mainDone;

    expect(mockCreateProject).toHaveBeenCalledWith(
      "New Project",
      "/tmp/new-project",
    );
    expect(mockTouchProject).toHaveBeenCalledWith("New Project");
  });

  it("creates session with correct cwd and extension", async () => {
    mockListProjects.mockResolvedValue([
      {
        name: "Test",
        path: "/test",
        created: "2024-01-01",
        lastOpened: "2024-01-01",
      },
    ]);

    const mainDone = main();
    await Bun.sleep(10);

    simulateInput("1");
    await Bun.sleep(10);

    await mainDone;

    expect(mockCreateWelcomeComponent).toHaveBeenCalled();
    expect(mockCreateKleptowriterExtension).toHaveBeenCalledWith(mockWelcome);
    expect(mockCreateTuiSession).toHaveBeenCalledWith(
      expect.objectContaining({
        cwd: "/test",
        extensionFactories: [mockExtensionFactory],
      }),
    );
  });

  it("sets up SIGINT handler", async () => {
    mockListProjects.mockResolvedValue([
      {
        name: "Test",
        path: "/test",
        created: "2024-01-01",
        lastOpened: "2024-01-01",
      },
    ]);

    const mainDone = main();
    await Bun.sleep(10);

    simulateInput("1");
    await Bun.sleep(10);

    await mainDone;

    expect(sigintHandler).not.toBeNull();
  });

  it("SIGINT calls session.stop() and exit()", async () => {
    mockListProjects.mockResolvedValue([
      {
        name: "Test",
        path: "/test",
        created: "2024-01-01",
        lastOpened: "2024-01-01",
      },
    ]);

    const mainDone = main();
    await Bun.sleep(10);

    simulateInput("1");
    await Bun.sleep(10);

    await mainDone;

    sigintHandler!();

    expect(mockSession.stop).toHaveBeenCalled();
    expect(mockExit).toHaveBeenCalledWith(0);
  });

  it("calls session.run()", async () => {
    mockListProjects.mockResolvedValue([
      {
        name: "Test",
        path: "/test",
        created: "2024-01-01",
        lastOpened: "2024-01-01",
      },
    ]);

    const mainDone = main();
    await Bun.sleep(10);

    simulateInput("1");
    await Bun.sleep(10);

    await mainDone;

    expect(mockSession.run).toHaveBeenCalled();
  });
});
