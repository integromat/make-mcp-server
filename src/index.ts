#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { Make } from './make.js';
import { remap } from './utils.js';

const server = new Server(
    {
        name: 'Make',
        version: '1.0.0',
    },
    {
        capabilities: {
            resources: {},
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
if (!process.env.MAKE_TEAM) {
    console.error('Please provide MAKE_TEAM environment variable.');
    process.exit(1);
}

const make = new Make(process.env.MAKE_API_KEY, process.env.MAKE_ZONE);
const teamId = parseInt(process.env.MAKE_TEAM);

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
        const output = (await make.scenarios.run(parseInt(request.params.name.substring(13)), request.params.arguments))
            .outputs;

        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(output, null, 2),
                },
            ],
        };
    }
    throw new Error(`Unknown tool: ${request.params.name}`);
});

const transport = new StdioServerTransport();
await server.connect(transport);
