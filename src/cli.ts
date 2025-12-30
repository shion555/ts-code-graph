#!/usr/bin/env node
import { Command } from "commander";
import * as fs from "fs";
import * as path from "path";
import { parseProject } from "./parser/typescript.js";
import { createDatabase, CodeGraphRepository } from "./db/index.js";

/**
 * ディレクトリパスを検証し、絶対パスを返す
 */
function validateDirectory(directory: string): string {
  const absolutePath = path.resolve(directory);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`ディレクトリが存在しません: ${directory}`);
  }

  const stat = fs.statSync(absolutePath);
  if (!stat.isDirectory()) {
    throw new Error(`ディレクトリではありません: ${directory}`);
  }

  return absolutePath;
}

const program = new Command();

program
  .name("ts-code-graph")
  .description("Analyze TypeScript codebase and visualize call relationships")
  .version("0.0.1");

program
  .command("index <directory>")
  .description("Index a TypeScript project")
  .action(async (directory: string) => {
    let repository: CodeGraphRepository | null = null;
    try {
      const validatedDir = validateDirectory(directory);
      console.error(`Indexing: ${validatedDir}`);

      // プロジェクトを解析
      const { nodes, edges, externalCalls } = parseProject(validatedDir);

      // DBに保存
      const db = createDatabase(validatedDir);
      repository = new CodeGraphRepository(db);

      repository.clear();
      repository.insertNodes(nodes);
      repository.insertEdges(edges);
      repository.insertExternalCalls(externalCalls);

      const result = {
        success: true,
        directory: validatedDir,
        stats: {
          nodes: repository.countNodes(),
          edges: repository.countEdges(),
          externalCalls: repository.countExternalCalls(),
        },
      };

      console.log(JSON.stringify(result, null, 2));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(JSON.stringify({ success: false, error: message }));
      process.exit(1);
    } finally {
      repository?.close();
    }
  });

program
  .command("query <name>")
  .description("Query function/class relationships")
  .option("-d, --directory <path>", "Project directory", ".")
  .action(async (name: string, options: { directory: string }) => {
    let repository: CodeGraphRepository | null = null;
    try {
      const validatedDir = validateDirectory(options.directory);
      const db = createDatabase(validatedDir);
      repository = new CodeGraphRepository(db);

      const nodes = repository.findNodesByName(name);

      const matches = nodes.map((node) => ({
        node,
        callers: repository!.findCallers(node.id),
        callees: repository!.findCallees(node.id),
      }));

      console.log(JSON.stringify({ matches }, null, 2));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(JSON.stringify({ success: false, error: message }));
      process.exit(1);
    } finally {
      repository?.close();
    }
  });

program.parse();
