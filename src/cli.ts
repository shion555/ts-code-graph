import { Command } from "commander";
import { parseProject } from "./parser/typescript.js";
import { createDatabase, CodeGraphRepository } from "./db/index.js";

const program = new Command();

program
  .name("ts-code-graph")
  .description("Analyze TypeScript codebase and visualize call relationships")
  .version("0.0.1");

program
  .command("index <directory>")
  .description("Index a TypeScript project")
  .action(async (directory: string) => {
    try {
      console.error(`Indexing: ${directory}`);

      // プロジェクトを解析
      const { nodes, edges } = parseProject(directory);

      // DBに保存
      const db = createDatabase(directory);
      const repository = new CodeGraphRepository(db);

      repository.clear();
      repository.insertNodes(nodes);
      repository.insertEdges(edges);

      const result = {
        success: true,
        directory,
        stats: {
          nodes: repository.countNodes(),
          edges: repository.countEdges(),
        },
      };

      repository.close();

      console.log(JSON.stringify(result, null, 2));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(JSON.stringify({ success: false, error: message }));
      process.exit(1);
    }
  });

program
  .command("query <name>")
  .description("Query function/class relationships")
  .option("-d, --directory <path>", "Project directory", ".")
  .action(async (name: string, options: { directory: string }) => {
    try {
      const db = createDatabase(options.directory);
      const repository = new CodeGraphRepository(db);

      const nodes = repository.findNodesByName(name);

      const matches = nodes.map((node) => ({
        node,
        callers: repository.findCallers(node.id),
        callees: repository.findCallees(node.id),
      }));

      repository.close();

      console.log(JSON.stringify({ matches }, null, 2));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(JSON.stringify({ success: false, error: message }));
      process.exit(1);
    }
  });

program.parse();
