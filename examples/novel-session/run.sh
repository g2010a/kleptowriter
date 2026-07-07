#!/usr/bin/env bash
# Kleptowriter novel session — quick start.
# Usage: ./run.sh
#
# Expects ANTHROPIC_API_KEY or OPENAI_API_KEY in the environment or .env file.
set -euo pipefail

cd "$(dirname "$0")"

# Load .env if present
if [ -f .env ]; then
  set -a
  source .env
  set +a
fi

# Resolve monorepo root (assumes run.sh lives at examples/novel-session/run.sh)
MONOREPO="$(cd ../.. && pwd)"

# Invoke the CLI source directly so cwd stays at examples/novel-session.
# Using --filter would change cwd to the package root, making the workspace
# land at packages/adapter-pi/story instead of here.
exec bun run "$MONOREPO/packages/adapter-pi/src/cli.ts"
