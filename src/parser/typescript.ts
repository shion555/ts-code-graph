import {
  Project,
  SyntaxKind,
  SourceFile,
  Node,
  Identifier,
  CallExpression,
} from "ts-morph";
import path from "path";
import fs from "fs";
import { CodeNode, CodeEdge, ExternalCall, ParseResult } from "../types.js";

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
/**
 * ノード、エッジを抽出する
 *
 * @param sourceFile - 対象ファイル
 * @param basePath - 基準パス
 * @returns 抽出されたCodeNodeとCodeEdgeを含むParseResult
 */
function extractNodesAndEdges(
  sourceFile: SourceFile,
  basePath: string
): ParseResult {
  const result: ParseResult = { nodes: [], edges: [], externalCalls: [] };
  const filePath = path.relative(basePath, sourceFile.getFilePath());

  // 関数定義を抽出
  for (const func of sourceFile.getFunctions()) {
    const name = func.getName() || "(anonymous)";
    const partialResult = addNodeWithCalls(
      name,
      "function",
      filePath,
      func.getStartLineNumber(),
      func,
      basePath
    );
    result.nodes.push(...partialResult.nodes);
    result.edges.push(...partialResult.edges);
    result.externalCalls.push(...partialResult.externalCalls);
  }

  // アロー関数を抽出
  for (const variable of sourceFile.getVariableDeclarations()) {
    const initializer = variable.getInitializer();
    if (initializer?.getKind() === SyntaxKind.ArrowFunction) {
      const name = variable.getName();
      const partialResult = addNodeWithCalls(
        name,
        "function",
        filePath,
        variable.getStartLineNumber(),
        initializer,
        basePath
      );
      result.nodes.push(...partialResult.nodes);
      result.edges.push(...partialResult.edges);
      result.externalCalls.push(...partialResult.externalCalls);
    }
  }

  // クラスを抽出
  for (const cls of sourceFile.getClasses()) {
    const name = cls.getName() || "(anonymous)";
    result.nodes.push(
      createNode(name, "class", filePath, cls.getStartLineNumber())
    );
  }

  return result;
}

/**
 * ノード作成
 *
 * @param name - 名前
 * @param type - タイプ
 * @param filePath - ファイルパス
 * @param lineNumber - 行番号
 * @returns 作成されたCodeNode
 */
function createNode(
  name: string,
  type: CodeNode["type"],
  filePath: string,
  lineNumber: number
): CodeNode {
  return {
    id: `${filePath}:${name}`,
    name,
    type,
    filePath,
    lineNumber,
  };
}

/**
 * ノード作成と呼び出し抽出を行う共通処理
 *
 * @param name - 名前
 * @param type - タイプ
 * @param filePath - ファイルパス
 * @param lineNumber - 行番号
 * @param body - 解析対象のノード
 * @param basePath - 基準パス
 * @returns 抽出されたCodeNode、CodeEdge、ExternalCallを含むParseResult
 */
function addNodeWithCalls(
  name: string,
  type: CodeNode["type"],
  filePath: string,
  lineNumber: number,
  body: Node,
  basePath: string
): ParseResult {
  const node = createNode(name, type, filePath, lineNumber);
  const callResult = extractCalls(body, node.id, basePath);

  return {
    nodes: [node],
    edges: callResult.edges,
    externalCalls: callResult.externalCalls,
  };
}

/**
 * 関数/アロー関数内の呼び出しを抽出
 *
 * @param node - 解析対象のノード
 * @param fromNodeId - 呼び出し元ノードID
 * @param basePath - 基準パス
 * @returns 抽出されたCodeEdgeとExternalCallの配列
 */
function extractCalls(
  node: Node,
  fromNodeId: string,
  basePath: string
): { edges: CodeEdge[]; externalCalls: ExternalCall[] } {
  const edges: CodeEdge[] = [];
  const externalCalls: ExternalCall[] = [];

  for (const call of node.getDescendantsOfKind(SyntaxKind.CallExpression)) {
    const callText = call.getExpression().getText();
    const resolved = resolveCallTarget(call, basePath);

    if (resolved.startsWith("@external:") || resolved.startsWith("@unknown:")) {
      const callName = resolved.startsWith("@external:")
        ? resolved.slice("@external:".length)
        : resolved.slice("@unknown:".length);

      externalCalls.push({
        fromNodeId,
        callName,
        callText,
      });
    } else {
      edges.push({
        fromNodeId,
        toNodeId: resolved,
        type: "calls" as const,
      });
    }
  }

  return { edges, externalCalls };
}

/**
 * CallExpressionからIdentifierを取得
 *
 * @param call - 呼び出し式
 * @returns 取得したIdentifier、取得できない場合はundefined
 */
function getCallIdentifier(call: CallExpression): Identifier | undefined {
  const expression = call.getExpression();

  if (Node.isIdentifier(expression)) {
    // 単純な関数呼び出し
    return expression;
  }

  if (Node.isPropertyAccessExpression(expression)) {
    // メソッド呼び出し
    return expression.getNameNode();
  }
  return undefined;
}

/**
 * 定義解決
 *
 * @param call - 呼び出し式
 * @param basePath - 基準パス
 * @returns 解決されたノードID
 */
function resolveCallTarget(call: CallExpression, basePath: string): string {
  const callText = call.getExpression().getText();
  const identifier = getCallIdentifier(call);

  if (!identifier) {
    return `@unknown:${callText}`;
  }

  const definitions = identifier.getDefinitions();
  if (definitions.length === 0) {
    return `@unknown:${callText}`;
  }

  const def = definitions[0];
  const defFilePath = def.getSourceFile().getFilePath();
  const relativePath = path.relative(basePath, defFilePath);

  if (relativePath.includes("node_modules")) {
    return `@external:${callText}`;
  }

  return `${relativePath}:${def.getName()}`;
}
