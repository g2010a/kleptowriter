const WELCOME_LINES = [
  "╔══════════════════════════════════════════════════╗",
  "║           Kleptowriter — Novel Writing Studio    ║",
  "╚══════════════════════════════════════════════════╝",
  "",
  "Welcome! Here's how to get started:",
  "",
  "  /interview   Start a new greenfield project interview",
  "  /ingest      Process existing materials into the bible",
  "  /write       Enter scene writing mode",
  "  /bible       View or edit the story bible",
  "  /scenes      List all scenes with word counts",
  "  /project     Create, open, or switch projects",
  "",
  "Type any message or command to begin.",
  "",
  "Press /hotkeys for all Pi shortcuts.",
];

export interface WelcomeComponent {
  render(width?: number): string[];
  handleInput(key: string): boolean;
  dismissed: boolean;
}

export function createWelcomeComponent(_options: Record<string, unknown> = {}): WelcomeComponent {
  let dismissed = false;

  return {
    get dismissed(): boolean {
      return dismissed;
    },

    render(_width?: number): string[] {
      if (dismissed) {
        return [];
      }
      return WELCOME_LINES;
    },

    handleInput(_key: string): boolean {
      if (!dismissed) {
        dismissed = true;
        return true;
      }
      return false;
    },
  };
}