import { listProjects, createProject, touchProject } from "./project-manager.js";
import { createTuiSession } from "./session.js";
import { createKleptowriterExtension } from "./extension.js";
import { createWelcomeComponent } from "./welcome.js";
import type { ProjectInfo } from "./project-manager.js";

// ── Pre-TUI prompts ─────────────────────────────────────────────────────────

function promptLine(question: string): Promise<string> {
  return new Promise((resolve) => {
    process.stdout.write(`${question} `);
    let data = "";
    const onChunk = (chunk: Buffer) => {
      data += chunk.toString();
      if (data.includes("\n")) {
        process.stdin.removeListener("data", onChunk);
        process.stdin.pause();
        resolve(data.trim());
      }
    };
    process.stdin.setEncoding("utf-8");
    process.stdin.resume();
    process.stdin.on("data", onChunk);
  });
}

// ── Project selection ────────────────────────────────────────────────────────

export async function selectProject(): Promise<ProjectInfo> {
  const projects = await listProjects();

  if (projects.length === 0) {
    console.log("\nNo projects found. Let's create one!\n");
    const name = await promptLine("Project name:");
    const path = await promptLine("Project path:");
    return createProject(name, path);
  }

  console.log("\nYour projects:\n");
  for (let i = 0; i < projects.length; i++) {
    console.log(`  ${i + 1}. ${projects[i]!.name} (${projects[i]!.path})`);
  }
  console.log(`  ${projects.length + 1}. Create new project\n`);

  const choice = await promptLine("Select project:");
  const idx = parseInt(choice, 10) - 1;

  if (idx >= 0 && idx < projects.length) {
    return projects[idx]!;
  }

  const name = await promptLine("Project name:");
  const path = await promptLine("Project path:");
  return createProject(name, path);
}

// ── Main entry point ─────────────────────────────────────────────────────────

export async function main() {
  const project = await selectProject();
  await touchProject(project.name);

  const welcome = createWelcomeComponent();
  const session = await createTuiSession({
    cwd: project.path,
    extensionFactories: [createKleptowriterExtension(welcome)],
  });

  process.on("SIGINT", () => {
    session.stop();
    process.exit(0);
  });

  await session.run();
}

if (import.meta.main) {
  main().catch(console.error);
}
