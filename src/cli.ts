import { Command } from "commander";

const program = new Command();

program
  .name("ts-code-graph")
  .description("Analyze TypeScript codebase and visualize call relationships")
  .version("0.0.1");

program
  .command("index <directory>")
  .description("Index a TypeScript project")
  .action(async (directory: string) => {
    console.log(`Indexing: ${directory}`);
    // TODO: 実装
  });

program
  .command("query <name>")
  .description("Query function/class relationships")
  .action(async (name: string) => {
    console.log(`Querying: ${name}`);
    // TODO: 実装
  });

program.parse();
