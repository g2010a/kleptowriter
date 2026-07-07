# Problems — Kleptowriter Pi SDK Harness

## Open Questions
- What exact version of Pi SDK is available on npm? Task 1 will resolve this.
- Does Pi SDK's `createAgentSession()` work in a Bun environment? Need smoke test.
- What's the exact TypeBox schema format Pi expects for custom tools? Need smoke test.
- Does `systemPromptOverride` on `DefaultResourceLoader` work as documented? Need smoke test.
- How does Pi SDK handle API key configuration (env vars vs explicit)? Need smoke test.
