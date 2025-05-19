# Make MCP Server with Claude Integration

A Model Context Protocol server that enables Make scenarios to be utilized as tools by AI assistants and allows Claude to help create new automation scenarios. This integration allows AI systems like Claude to trigger and interact with your Make automation workflows, as well as help you design and create new workflows from natural language prompts.

## How It Works

The enhanced MCP server:

-   Connects to your Make account and identifies all scenarios configured with "On-Demand" scheduling
-   Parses and resolves input parameters for each scenario, providing AI assistants with meaningful parameter descriptions
-   Allows AI assistants to invoke scenarios with appropriate parameters
-   Returns scenario output as structured JSON, enabling AI assistants to properly interpret the results
-   **NEW**: Allows Claude to help create new automation scenarios from templates or natural language prompts
-   **NEW**: Provides access to Make templates to jumpstart your automation creation

## Benefits

-   Turn your Make scenarios into callable tools for AI assistants
-   Maintain complex automation logic in Make while exposing functionality to AI systems
-   Create bidirectional communication between your AI assistants and your existing automation workflows
-   **NEW**: Leverage Claude's intelligence to help design and build new automation scenarios
-   **NEW**: Quickly create automation flows from natural language descriptions

## Usage with Claude

### Prerequisites

-   NodeJS
-   MCP Client (like Claude Desktop App)
-   Make API Key with `scenarios:read`, `scenarios:run`, and `scenarios:write` scopes

### Installation

To use this server with the Claude Desktop app, add the following configuration to the "mcpServers" section of your `claude_desktop_config.json`:

```json
{
    "mcpServers": {
        "make": {
            "command": "npx",
            "args": ["-y", "github:hdbookie/make-mcp-server#claude-automation-helper"],
            "env": {
                "MAKE_API_KEY": "<your-api-key>",
                "MAKE_ZONE": "<your-zone>",
                "MAKE_TEAM": "<your-team-id>"
            }
        }
    }
}
```

-   `MAKE_API_KEY` - You can generate an API key in your Make profile. Make sure it has scenarios:write permission.
-   `MAKE_ZONE` - The zone your organization is hosted in (e.g., `eu2.make.com`).
-   `MAKE_TEAM` - You can find the ID in the URL of the Team page.

## New Features

This fork adds the following capabilities to the original Make MCP Server:

### 1. List Templates
Get available scenario templates from Make that can be used as starting points for new automation flows.

### 2. Get Template Details
Retrieve detailed information about a specific template, including its modules and connections.

### 3. Create Scenario
Create a new scenario from scratch by specifying the modules and their connections.

### 4. Create Scenario from Prompt
Create a new scenario directly from a natural language description, letting Claude help design the appropriate modules and connections.

## Example Usage with Claude

Once you have the MCP server running, you can ask Claude to help you create automation flows:

1. "Please help me create a scenario that sends an email when a new file is uploaded to Google Drive."
2. "Can you show me what templates are available in Make for social media automation?"
3. "Create a workflow that posts new WordPress blog entries to Twitter and LinkedIn."
4. "Design an automation that monitors a website for changes and notifies me via Slack."

Claude will be able to use the new tools to help you design and build these automation flows directly in your Make account.
