# Decisions

## 2026-07-09 Task: Context-gathering

### Execution plan
- Wave 1: Tasks 1, 2, 3 in parallel (no dependencies)
- Wave 2: Tasks 4, 5, 6 — Task 4 depends on 1, Task 5 depends on 2+3, Task 6 depends on 4+5
- Wave 3: Tasks 7, 8, 9 in parallel — all depend on 6
- Wave FINAL: F1-F4 in parallel

### Theme file approach
- Embed dark.json and light.json as TypeScript const objects in `themes.ts`
- Pi SDK path: `node_modules/.bun/@earendil-works+pi-coding-agent@0.80.3+c9e75ddbd11a69ea/node_modules/@earendil-works/pi-coding-agent/dist/modes/interactive/theme/`
- Use `as const` for literal types to preserve exact schema
