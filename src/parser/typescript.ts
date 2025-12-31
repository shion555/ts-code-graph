import { Project } from "ts-morph";
import path from "path";
import fs from "fs";
import { CodeNode, CodeEdge, ExternalCall, ParseResult } from "../types.js";
import { extractNodesAndEdges } from "./core/nodeExtractor.js";

/**
 * TypeScriptプロジェクトを解析し、コードノードと呼び出し関係を抽出する
 *
 * @param projectPath - プロジェクトのルートディレクトリ
 * @returns 抽出されたCodeNodeとCodeEdgeを含むParseResult
 */
export function parseProject(projectPath: string): ParseResult {
  const absoluteProjectPath = path.resolve(projectPath);
  const tsConfigPath = path.join(absoluteProjectPath, "tsconfig.json");

  if (!fs.existsSync(tsConfigPath)) {
    throw new Error(`tsconfig.jsonが見つかりません: ${tsConfigPath}`);
  }

  const project = new Project({
    tsConfigFilePath: tsConfigPath,
  });

  const nodes: CodeNode[] = [];
  const edges: CodeEdge[] = [];
  const externalCalls: ExternalCall[] = [];

  for (const sourceFile of project.getSourceFiles()) {
    if (sourceFile.isFromExternalLibrary()) continue;
    // 各ファイルからノードを抽出
    const result = extractNodesAndEdges(sourceFile, absoluteProjectPath);
    nodes.push(...result.nodes);
    edges.push(...result.edges);
    externalCalls.push(...result.externalCalls);
  }

  // 存在しないノードへの参照をexternalCallsに移動
  const nodeIds = new Set(nodes.map((n) => n.id));
  const validEdges: CodeEdge[] = [];

  for (const edge of edges) {
    if (nodeIds.has(edge.toNodeId)) {
      validEdges.push(edge);
    } else {
      externalCalls.push({
        fromNodeId: edge.fromNodeId,
        callName: edge.toNodeId,
        callText: edge.toNodeId,
      });
    }
  }

  return { nodes, edges: validEdges, externalCalls };
}
