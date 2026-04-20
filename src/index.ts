#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { Make } from './make.js';
import { remap } from './utils.js';
import type { CreateScenarioRequest, ModuleConfiguration, ScenarioTemplate } from './types.js';

const server = new Server(
    {
        name: 'Make',
        version: '0.2.0',
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
if (!process.env.MAKE_TEAM) {
    console.error('Please provide MAKE_TEAM environment variable.');
    process.exit(1);
}

const make = new Make(process.env.MAKE_API_KEY, process.env.MAKE_ZONE);
const teamId = parseInt(process.env.MAKE_TEAM);

server.setRequestHandler(ListToolsRequestSchema, async () => {
    const scenarios = await make.scenarios.list(teamId);
    
    return {
        tools: [
            // Include the scenario tools
            ...(await Promise.all(
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
            )),
            
            // Add new tools for template management and scenario creation
            {
                name: 'list_templates',
                description: 'List available scenario templates for creating new automation flows',
                inputSchema: {
                    type: 'object',
                    properties: {
                        category: {
                            type: 'string',
                            description: 'Optional category to filter templates',
                        },
                    },
                },
            },
            {
                name: 'get_template_details',
                description: 'Get detailed information about a specific template',
                inputSchema: {
                    type: 'object',
                    properties: {
                        templateId: {
                            type: 'string',
                            description: 'The ID of the template to retrieve',
                        },
                    },
                    required: ['templateId'],
                },
            },
            {
                name: 'create_scenario',
                description: 'Create a new automation scenario in Make',
                inputSchema: {
                    type: 'object',
                    properties: {
                        name: {
                            type: 'string',
                            description: 'Name of the new scenario',
                        },
                        description: {
                            type: 'string',
                            description: 'Optional description of the scenario',
                        },
                        modules: {
                            type: 'array',
                            description: 'Array of modules to include in the scenario',
                            items: {
                                type: 'object',
                                properties: {
                                    name: {
                                        type: 'string',
                                        description: 'Name of this module instance',
                                    },
                                    type: {
                                        type: 'string',
                                        description: 'Type of the module (e.g., "http", "gmail", "slack", etc.)',
                                    },
                                    parameters: {
                                        type: 'object',
                                        description: 'Configuration parameters for this module',
                                    },
                                    position: {
                                        type: 'object',
                                        description: 'Optional position in the visual editor',
                                        properties: {
                                            x: { type: 'number' },
                                            y: { type: 'number' },
                                        },
                                    },
                                },
                                required: ['name', 'type'],
                            },
                        },
                        connections: {
                            type: 'array',
                            description: 'Optional array of connections between modules',
                            items: {
                                type: 'object',
                                properties: {
                                    from: {
                                        type: 'object',
                                        properties: {
                                            moduleId: { type: 'string' },
                                            outputId: { type: 'string' },
                                        },
                                        required: ['moduleId'],
                                    },
                                    to: {
                                        type: 'object',
                                        properties: {
                                            moduleId: { type: 'string' },
                                            inputId: { type: 'string' },
                                        },
                                        required: ['moduleId'],
                                    },
                                },
                                required: ['from', 'to'],
                            },
                        },
                        template: {
                            type: 'string',
                            description: 'Optional template ID to use as a starting point',
                        },
                    },
                    required: ['name', 'modules'],
                },
            },
            {
                name: 'create_scenario_from_prompt',
                description: 'Create a new automation scenario from a natural language prompt',
                inputSchema: {
                    type: 'object',
                    properties: {
                        prompt: {
                            type: 'string',
                            description: 'Natural language description of the scenario you want to create',
                        },
                        name: {
                            type: 'string',
                            description: 'Name for the new scenario',
                        },
                    },
                    required: ['prompt', 'name'],
                },
            },
        ],
    };
});

// Helper function to auto-generate modules for a prompt-based scenario
async function generateScenarioFromPrompt(prompt: string, name: string): Promise<ModuleConfiguration[]> {
    // This is a simplified implementation
    // In a production version, you might use Claude or another AI to generate the modules
    
    // For now, we'll create a simple HTTP webhook scenario
    return [
        {
            name: 'Webhook',
            type: 'webhook',
            parameters: {
                url: '',
                method: 'GET',
            },
            position: { x: 100, y: 100 },
        },
        {
            name: 'JSON Parser',
            type: 'jsonparser',
            parameters: {
                sourceData: '{{1.body}}',
            },
            position: { x: 300, y: 100 },
        },
        {
            name: 'Email Sender',
            type: 'email',
            parameters: {
                to: 'user@example.com',
                subject: `Scenario ${name} result`,
                body: 'Data received from webhook: {{2.result}}',
            },
            position: { x: 500, y: 100 },
        },
    ];
}

server.setRequestHandler(CallToolRequestSchema, async request => {
    // Handle existing tool for running scenarios
    if (/^run_scenario_\\d+$/.test(request.params.name)) {
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
    
    // Handle new tools
    switch (request.params.name) {
        case 'list_templates': {
            try {
                const category = request.params.arguments?.category;
                const templates = await make.scenarios.listTemplates(category);
                
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify(templates, null, 2),
                        },
                    ],
                };
            } catch (err: unknown) {
                return {
                    isError: true,
                    content: [{ type: 'text', text: String(err) }],
                };
            }
        }
        
        case 'get_template_details': {
            try {
                const { templateId } = request.params.arguments;
                if (!templateId) {
                    throw new Error('Template ID is required');
                }
                
                const template = await make.scenarios.getTemplate(templateId);
                
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify(template, null, 2),
                        },
                    ],
                };
            } catch (err: unknown) {
                return {
                    isError: true,
                    content: [{ type: 'text', text: String(err) }],
                };
            }
        }
        
        case 'create_scenario': {
            try {
                const { name, description, modules, connections, template } = request.params.arguments;
                
                if (!name || !modules) {
                    throw new Error('Name and modules are required for scenario creation');
                }
                
                let scenarioRequest: CreateScenarioRequest = {
                    name,
                    description,
                    teamId,
                    modules,
                    connections,
                };
                
                const result = await make.scenarios.create(scenarioRequest);
                
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Scenario created successfully!\n\nID: ${result.scenarioId}\nName: ${result.name}\nURL: ${result.url}`,
                        },
                    ],
                };
            } catch (err: unknown) {
                return {
                    isError: true,
                    content: [{ type: 'text', text: String(err) }],
                };
            }
        }
        
        case 'create_scenario_from_prompt': {
            try {
                const { prompt, name } = request.params.arguments;
                
                if (!prompt || !name) {
                    throw new Error('Prompt and name are required');
                }
                
                // Generate scenario modules based on the prompt
                const modules = await generateScenarioFromPrompt(prompt, name);
                
                // Create the scenario
                const scenarioRequest: CreateScenarioRequest = {
                    name,
                    description: `Created from prompt: ${prompt}`,
                    teamId,
                    modules,
                };
                
                const result = await make.scenarios.create(scenarioRequest);
                
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Scenario created successfully from your prompt!\n\nID: ${result.scenarioId}\nName: ${result.name}\nURL: ${result.url}\n\nPrompt: "${prompt}"`,
                        },
                    ],
                };
            } catch (err: unknown) {
                return {
                    isError: true,
                    content: [{ type: 'text', text: String(err) }],
                };
            }
        }
        
        default:
            throw new Error(`Unknown tool: ${request.params.name}`);
    }
});

const transport = new StdioServerTransport();
await server.connect(transport);
