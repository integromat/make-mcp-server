# make-mcp-server

TypeScript MCP server exposing Make.com on-demand scenarios as callable tools for AI assistants. Stdio transport, no HTTP.

## Project map

- `src/index.ts` — server init, MCP handler registration, env var validation
- `src/make.ts` — Make API client (`Make` + `Scenarios` classes)
- `src/utils.ts` — `remap()` schema converter, `MakeError`, `createMakeError`
- `src/types.ts` — TypeScript interfaces
- `test/server.spec.ts` — tests; fixtures in `test/mocks/`

## Stack

TypeScript, ESNext modules → `build/`. MCP SDK (`@modelcontextprotocol/sdk`). Jest + `jest-fetch-mock`.

<important if="you need to run commands to build, test, or inspect">

| Command | What it does |
|---|---|
| `npm run build` | tsc + chmod 755 on entry point |
| `npm test` | Run Jest tests |
| `npm run inspector` | Launch MCP inspector UI against `build/index.js` |
</important>

<important if="you are modifying environment variable handling or server startup">

Three required env vars (process exits 1 if missing):
- `MAKE_API_KEY` — used as `Token <key>` (not Bearer)
- `MAKE_ZONE` — API base hostname (e.g. `eu2.make.com`)
- `MAKE_TEAM` — integer team ID
</important>

<important if="you are modifying the tool list, MCP handlers, or how scenarios become tools">

No static tool registry. On every `tools/list` request the server queries Make API for scenarios, filters to `scheduling.type === 'on-demand'`, fetches input interfaces in parallel, converts via `remap()` to JSON Schema. Tool names: `run_scenario_{id}`.

Run calls use `{ data: <arguments>, responsive: true }` for synchronous execution.
</important>

<important if="you are modifying the Make API client or URL handling in src/make.ts">

URL assembly: `/`-prefixed → `https://${MAKE_ZONE}/api/v2` prepended; `//`-prefixed → `https:` prepended; absolute URLs pass through.

Every request gets `user-agent: MakeMCPServer/0.1.0` and `authorization: Token <key>` headers.
</important>

<important if="you are modifying schema conversion or the remap function">

`remap()` recursively converts Make `Input[]` → JSON Schema. Always called with synthetic wrapper `{ type: 'collection', spec: Input[] }`, so top-level is always `type: object`. See `src/utils.ts` for the type mapping.
</important>

<important if="you are modifying error handling or debugging failures">

Error handling asymmetry:
- `CallToolRequest` handler wraps `run()` in try/catch — MakeErrors → MCP `isError: true`
- `ListToolsRequest` handler has **no try/catch** — errors propagate unhandled
- HTTP status >= 400 → `createMakeError()` tries JSON parse for `detail`/`message`/`suberrors`; falls back to `statusText`
</important>

<important if="you are writing or modifying tests">

- All HTTP mocked via `jest-fetch-mock` — `enableFetchMocks()` at module level, `fetchMock.resetMocks()` in `beforeEach`
- Mock pattern: `fetchMock.mockResponse(req => { if (req.url !== expected) throw ...; return Promise.resolve({ body, headers }) })`
- Error tests: try/catch with `instanceof MakeError` guard, field-by-field assertions
- `jest.config.ts`: `moduleNameMapper` strips `.js` extensions (ESM compat)
</important>

<important if="you are modifying packaging, publishing, or deployment">

Published as `@makehq/mcp-server`, bin entry `mcp-server-make`. Registry configs: `smithery.yaml`, `glama.json`. `Dockerfile` for containerized deployment.
</important>

## Keeping AGENTS.md current

When your changes alter anything described in this file — project map, env vars, architectural patterns, API client behavior, error handling, test patterns, or packaging — notify the user that AGENTS.md should be updated and suggest the specific edit.
