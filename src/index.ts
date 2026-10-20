#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { Make } from './make.js';
import { resolveProjectId } from './project-id.js';
import { remap } from './utils.js';

const server = new Server(
    {
        name: 'Make',
        version: '0.1.0',
    },
    {
        capabilities: {
            tools: {},
        },
    },
);

if (!process.env.MAKE_API_KEY) {
    console.error('Please provide MAKE_API_KEY environment variable.');
    process.exit(1);
}
if (!process.env.MAKE_ZONE) {
    console.error('Please provide MAKE_ZONE environment variable.');
    process.exit(1);
}

const resolved = resolveProjectId(process.env);
if ('error' in resolved) {
    console.error(resolved.error);
    process.exit(1);
}

const make = new Make(process.env.MAKE_API_KEY, process.env.MAKE_ZONE);
// Make's public API still takes the project as `teamId` in its query string; only this server's own config is renamed.
const teamId = resolved.projectId;

server.setRequestHandler(ListToolsRequestSchema, async () => {
    const scenarios = await make.scenarios.list(teamId);
    return {
        tools: await Promise.all(
            scenarios
                .filter(scenario => scenario.scheduling.type === 'on-demand')
                .map(async scenario => {
                    const inputs = (await make.scenarios.interface(scenario.id)).input;
                    return {
                        name: `run_scenario_${scenario.id}`,
                        description: scenario.name + (scenario.description ? ` (${scenario.description})` : ''),
                        inputSchema: remap({
                            name: 'wrapper',
                            type: 'collection',
                            spec: inputs,
                        }),
                    };
                }),
        ),
    };
});

server.setRequestHandler(CallToolRequestSchema, async request => {
    if (/^run_scenario_\d+$/.test(request.params.name)) {
        try {
            const output = (
                await make.scenarios.run(parseInt(request.params.name.substring(13)), request.params.arguments)
            ).outputs;

            return {
                content: [
                    {
                        type: 'text',
                        text: output ? JSON.stringify(output, null, 2) : 'Scenario executed successfully.',
                    },
                ],
            };
        } catch (err: unknown) {
            return {
                isError: true,
                content: [
                    {
                        type: 'text',
                        text: String(err),
                    },
                ],
            };
        }
    }
    throw new Error(`Unknown tool: ${request.params.name}`);
});

const transport = new StdioServerTransport();
await server.connect(transport);
