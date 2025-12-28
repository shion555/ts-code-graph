import {
  Project,
  SyntaxKind,
  SourceFile,
  Node,
  Identifier,
  CallExpression,
} from "ts-morph";
import path from "path";
import { CodeNode, CodeEdge, ParseResult } from "../types.js";

/**
 * TypeScriptプロジェクトを解析し、コードノードと呼び出し関係を抽出する
 *
 * @param projectPath - プロジェクトのルートディレクトリ
 * @return 抽出されたCodeNode、CodeEdgeの配列
 */
export function parseProject(projectPath: string): ParseResult {
  const absoluteProjectPath = path.resolve(projectPath);

  const project = new Project({
    tsConfigFilePath: `${absoluteProjectPath}/tsconfig.json`,
  });

  const nodes: CodeNode[] = [];
  const edges: CodeEdge[] = [];

  for (const sourceFile of project.getSourceFiles()) {
    // 各ファイルからノードを抽出
    const result = extractNodesAndEdges(sourceFile, absoluteProjectPath);
    nodes.push(...result.nodes);
    edges.push(...result.edges);
  }

  return { nodes, edges };
}
/**
 * ノード、エッジを抽出する
 * @param sourceFile - 対象ファイル
 * @param basePath - 基準パス
 * @return 抽出されたCodeNodeの配列
 */
function extractNodesAndEdges(
  sourceFile: SourceFile,
  basePath: string,
): ParseResult {
  const nodes: CodeNode[] = [];
  const edges: CodeEdge[] = [];

  const filePath = path.relative(basePath, sourceFile.getFilePath());

  // 関数定義を抽出
  for (const func of sourceFile.getFunctions()) {
    const name = func.getName() || "(anonymous)";
    const nodeId = `${filePath}:${name}`;

    nodes.push(
      createNode(name, "function", filePath, func.getStartLineNumber()),
    );
    edges.push(...extractCalls(func, nodeId, basePath));
  }

  // アロー関数を抽出
  for (const variable of sourceFile.getVariableDeclarations()) {
    const initializer = variable.getInitializer();
    if (initializer?.getKind() === SyntaxKind.ArrowFunction) {
      const name = variable.getName();
      const nodeId = `${filePath}:${name}`;

      nodes.push(
        createNode(name, "function", filePath, variable.getStartLineNumber()),
      );
      edges.push(...extractCalls(initializer, nodeId, basePath));
    }
  }

  // クラスを抽出
  for (const cls of sourceFile.getClasses()) {
    const name = cls.getName() || "(anonymous)";

    nodes.push(createNode(name, "class", filePath, cls.getStartLineNumber()));
  }

  return { nodes, edges };
}

/**
 * ノード作成
 *
 * @param name 名前
 * @param type タイプ
 * @param filePath ファイルパス
 * @param lineNumber 行番号
 * @returns
 */
function createNode(
  name: string,
  type: CodeNode["type"],
  filePath: string,
  lineNumber: number,
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
 * 関数/アロー関数内の呼び出しを抽出
 *
 * @param node ノード
 * @param fromNodeId 呼び出しノード
 * @param basePath 基準パス
 */
function extractCalls(
  node: Node,
  fromNodeId: string,
  basePath: string,
): CodeEdge[] {
  return node.getDescendantsOfKind(SyntaxKind.CallExpression).map((call) => ({
    fromNodeId,
    toNodeId: resolveCallTarget(call, basePath),
    type: "calls" as const,
  }));
}

/**
 * CallExpressionからIdentifierを取得
 *
 * @param call
 * @returns
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
 * @param call
 * @param basePath
 * @returns
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
