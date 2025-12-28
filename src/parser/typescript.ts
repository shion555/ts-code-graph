import { Project, SyntaxKind, SourceFile, Node } from "ts-morph";
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
    edges.push(...extractCalls(func, nodeId));
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
      edges.push(...extractCalls(initializer, nodeId));
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
 */
function extractCalls(node: Node, fromNodeId: string): CodeEdge[] {
  const edges: CodeEdge[] = [];

  const calls = node.getDescendantsOfKind(SyntaxKind.CallExpression);

  for (const call of calls) {
    const callsName = call.getExpression().getText();

    edges.push({
      fromNodeId,
      toNodeId: callsName,
      type: "calls",
    });
  }

  return edges;
}
