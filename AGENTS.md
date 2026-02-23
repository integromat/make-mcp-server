# make-mcp-server

TypeScript MCP (Model Context Protocol) server that exposes Make.com on-demand scenarios as callable tools for AI assistants. Uses stdio transport (no HTTP server).

## Stack

- TypeScript, ESNext modules, compiled to `build/`
- MCP SDK: `@modelcontextprotocol/sdk`
- Testing: Jest + `jest-fetch-mock` (run with `npm test`)
- Build: `npm run build` (tsc + chmod 755 on entry point)
- Inspector: `npm run inspector` — launches MCP inspector UI against `build/index.js`

## Source layout

4 source files in `src/`:
- `index.ts` — server init, MCP handler registration, env var validation
- `make.ts` — Make API client (`Make` class + `Scenarios` class)
- `utils.ts` — `remap()` schema converter, `MakeError`, `createMakeError`
- `types.ts` — TypeScript interfaces for API shapes

Tests in `test/server.spec.ts`. Fixtures in `test/mocks/` (4 JSON files).

## Required environment variables

All three must be set or process exits with code 1 on startup:
- `MAKE_API_KEY` — used as `Token <key>` (not Bearer)
- `MAKE_ZONE` — API base hostname (e.g. `eu2.make.com`)
- `MAKE_TEAM` — integer team ID (parsed via `parseInt`, no validation)

## Key architectural patterns

### Dynamic tool list
There is no static tool registry. On every `tools/list` MCP request, the server queries Make API for scenarios, filters to `scheduling.type === 'on-demand'`, fetches each scenario's input interface in parallel, and converts them to MCP tools. Tool names are `run_scenario_{id}`.

### Make API client (`src/make.ts`)
- URL assembly: paths starting with `/` get `https://${MAKE_ZONE}/api/v2` prepended; `//`-prefixed paths get `https:` prepended; absolute URLs pass through unchanged
- Every request gets `user-agent: MakeMCPServer/0.1.0` and `authorization: Token <key>` headers
- Run calls use `{ data: <arguments>, responsive: true }` — `responsive: true` causes synchronous/awaited execution
- `listOrganization()` is defined but never called from `index.ts`

### Schema conversion — `remap()` (`src/utils.ts`)
Recursively converts Make `Input[]` → JSON Schema. Always called with a synthetic wrapper `{ type: 'collection', spec: Input[] }`, so top-level `inputSchema` is always `type: object`. Make types map to: `text/date/json` → `string`, `number` → `number`, `boolean` → `boolean`, `collection` → `object`, `array` → `array`, `select` → `string` with `enum`. Field `help` maps to `description` (via `noEmpty()` — returns `undefined` for falsy). `default` included only when not `''` and not `null`.

### Error handling asymmetry
- `CallToolRequest` handler wraps `run()` in try/catch — MakeErrors surface as MCP `isError: true` responses
- `ListToolsRequest` handler has **no try/catch** — API errors propagate unhandled to the MCP SDK
- HTTP status >= 400 → `createMakeError()` tries JSON parse for `detail`/`message`/`suberrors`; falls back to `res.statusText`

## Testing

- `jest.config.ts`: `moduleNameMapper` strips `.js` extensions (ESM compat), `ts-jest` transform
- All HTTP mocked via `jest-fetch-mock` — `enableFetchMocks()` at module level, `fetchMock.resetMocks()` in `beforeEach`
- Mock pattern: `fetchMock.mockResponse(req => { if (req.url !== expectedUrl) throw ...; return Promise.resolve({ body, headers }) })`
- Error test pattern: try/catch with `instanceof MakeError` guard, then field-by-field assertions

## Distribution

- Published as `@makehq/mcp-server`, bin entry `mcp-server-make`
- MCP registry configs: `smithery.yaml`, `glama.json`
- `Dockerfile` present for containerized deployment

## When in Plan Mode
- Make the plan extremely concise. Sacrifice grammar for the sake of concision.
- Interview user in detail (for Claude: use the AskUserQuestionTool) about literally anything: technical implementation, UI & UX, concerns, tradeoffs, etc. but make sure the questions are not obvious. Be very in-depth and continue interviewing the user continually until it's complete. Use the answers to create a detailed spec.
- Make assumptions explicit: When you must proceed under uncertainty, list assumptions up front and continue.
