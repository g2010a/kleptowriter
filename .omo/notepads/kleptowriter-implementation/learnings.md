# Learnings - Kleptowriter Implementation

## Project Conventions
- Harness-agnostic TypeScript library
- Monorepo: `packages/kleptowriter-core/` + 4 adapter packages
- Test: Bun test + `bun:test`
- No external deps in core beyond bun-types
- Strict TypeScript mode
