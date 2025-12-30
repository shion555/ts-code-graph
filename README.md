# ts-code-graph

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

[日本語版はこちら](./README.ja.md)

A CLI tool for analyzing TypeScript/Next.js codebase structure and visualizing function call relationships.

## Features

- **AST Analysis**: Parse TypeScript code using ts-morph
- **Call Graph Detection**: Detect function and class call relationships
- **Data Persistence**: Store code structure in SQLite database
- **CLI Interface**: Simple index and query commands
- **MCP Server**: Model Context Protocol support for AI integration

## Installation

```bash
# Global installation
npm install -g ts-code-graph

# Or use via npx
npx ts-code-graph
```

## Usage

### Index a Project

Analyze a TypeScript project and store the code structure:

```bash
ts-code-graph index <directory>
```

Output example:
```json
{
  "success": true,
  "directory": "/path/to/project",
  "stats": {
    "nodes": 42,
    "edges": 156
  }
}
```

### Query Relationships

Search for functions/classes and display their call relationships:

```bash
ts-code-graph query <name> [-d, --directory <path>]
```

Output example:
```json
{
  "matches": [
    {
      "node": {
        "id": "src/parser/typescript.ts:parseProject",
        "name": "parseProject",
        "type": "function",
        "filePath": "src/parser/typescript.ts",
        "lineNumber": 19
      },
      "callers": [],
      "callees": []
    }
  ]
}
```

## MCP Server

ts-code-graph provides an MCP (Model Context Protocol) server for AI integration.

### Start MCP Server

```bash
npm run mcp
```

### Available Tools

| Tool | Description |
|------|-------------|
| `index_codebase` | Index a TypeScript project to analyze code structure |
| `search_code` | Search for functions or classes by name |
| `get_call_graph` | Get callers and callees of a function or class |

## Tech Stack

| Technology | Purpose |
|------------|---------|
| [ts-morph](https://ts-morph.com/) | TypeScript AST analysis |
| [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) | Data persistence |
| [commander](https://github.com/tj/commander.js) | CLI framework |
| [@modelcontextprotocol/sdk](https://github.com/modelcontextprotocol/sdk) | MCP server |

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run in development mode
npm run dev

# Run tests
npm test
```

## License

MIT
