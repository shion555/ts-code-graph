import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { parseProject } from "../parser/typescript.js";
import { createDatabase, CodeGraphRepository } from "../db/index.js";
import path from "path";

const server = new McpServer({
  name: "ts-code-graph",
  version: "0.0.1",
});

// Tool: index_codebase
server.tool(
  "index_codebase",
  "Index a TypeScript project to analyze code structure",
  {
    directory: z.string().describe("Path to the TypeScript project directory"),
  },
  async ({ directory }) => {
    try {
      const absolutePath = path.resolve(directory);
      const { nodes, edges } = parseProject(absolutePath);

      const db = createDatabase(absolutePath);
      const repository = new CodeGraphRepository(db);

      repository.clear();
      repository.insertNodes(nodes);
      repository.insertEdges(edges);

      const stats = {
        nodes: repository.countNodes(),
        edges: repository.countEdges(),
      };

      repository.close();

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              { success: true, directory: absolutePath, stats },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ success: false, error: message }, null, 2),
          },
        ],
        isError: true,
      };
    }
  }
);

// Tool: search_code
server.tool(
  "search_code",
  "Search for functions or classes by name",
  {
    name: z.string().describe("Name of the function or class to search for"),
    directory: z
      .string()
      .optional()
      .describe("Project directory (default: current directory)"),
  },
  async ({ name, directory }) => {
    try {
      const absolutePath = path.resolve(directory || ".");
      const db = createDatabase(absolutePath);
      const repository = new CodeGraphRepository(db);

      const nodes = repository.findNodesByName(name);

      repository.close();

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ matches: nodes }, null, 2),
          },
        ],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ success: false, error: message }, null, 2),
          },
        ],
        isError: true,
      };
    }
  }
);

// Tool: get_call_graph
server.tool(
  "get_call_graph",
  "Get callers and callees of a function or class",
  {
    name: z.string().describe("Name of the function or class"),
    directory: z
      .string()
      .optional()
      .describe("Project directory (default: current directory)"),
  },
  async ({ name, directory }) => {
    try {
      const absolutePath = path.resolve(directory || ".");
      const db = createDatabase(absolutePath);
      const repository = new CodeGraphRepository(db);

      const nodes = repository.findNodesByName(name);

      const results = nodes.map((node) => ({
        node,
        callers: repository.findCallers(node.id),
        callees: repository.findCallees(node.id),
      }));

      repository.close();

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ results }, null, 2),
          },
        ],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ success: false, error: message }, null, 2),
          },
        ],
        isError: true,
      };
    }
  }
);

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
