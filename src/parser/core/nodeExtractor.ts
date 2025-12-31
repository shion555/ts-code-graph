import { SourceFile, Node, SyntaxKind } from "ts-morph";
import path from "path";
import { CodeNode, ParseResult } from "../../types.js";
import { generateNodeId } from "./idGenerator.js";
import { extractCalls } from "../analyzers/callExtractor.js";

/**
 * ノード、エッジを抽出する
 *
 * @param sourceFile - 対象ファイル
 * @param basePath - 基準パス
 * @returns 抽出されたCodeNodeとCodeEdgeを含むParseResult
 */
export function extractNodesAndEdges(
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
    mergeParseResult(result, partialResult);
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
      mergeParseResult(result, partialResult);
    }
  }

  // クラスを抽出
  for (const cls of sourceFile.getClasses()) {
    const className = cls.getName() || "(anonymous)";
    result.nodes.push(
      createNode(className, "class", filePath, cls.getStartLineNumber())
    );

    // クラスメソッドを抽出
    for (const method of cls.getMethods()) {
      const methodName = method.getName();
      const partialResult = addNodeWithCalls(
        methodName,
        "method",
        filePath,
        method.getStartLineNumber(),
        method,
        basePath
      );
      mergeParseResult(result, partialResult);
    }
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
    id: generateNodeId(name, filePath, lineNumber),
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
 * ParseResultを別のParseResultにマージする
 *
 * @param target - マージ先のParseResult
 * @param source - マージ元のParseResult
 */
function mergeParseResult(target: ParseResult, source: ParseResult): void {
  target.nodes.push(...source.nodes);
  target.edges.push(...source.edges);
  target.externalCalls.push(...source.externalCalls);
}
