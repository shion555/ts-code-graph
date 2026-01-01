#!/usr/bin/env node
import { Command } from "commander";
import { indexProject, queryCodeGraph } from "./services/codeGraphService.js";

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
      const result = indexProject(directory);
      console.error(`Indexing: ${result.directory}`);
      console.log(JSON.stringify({ success: true, ...result }, null, 2));
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
      const result = queryCodeGraph(name, options.directory);
      console.log(JSON.stringify({ matches: result.matches }, null, 2));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(JSON.stringify({ success: false, error: message }));
      process.exit(1);
    }
  });

program.parse();
