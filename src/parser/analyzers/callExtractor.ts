import { Node, CallExpression, Identifier, SyntaxKind } from "ts-morph";
import path from "path";
import { CodeEdge, ExternalCall } from "../../types.js";
import {
  EXTERNAL_PREFIX,
  UNKNOWN_PREFIX,
  isExternalOrUnknown,
  extractCallName,
} from "../utils/helpers.js";
import { extractDynamicImport } from "./importResolver.js";

/**
 * CallExpressionを処理してエッジまたは外部呼び出しを追加
 *
 * @param call - CallExpression
 * @param fromNodeId - 呼び出し元ノードID
 * @param basePath - 基準パス
 * @returns エッジまたは外部呼び出し
 */
function processCallExpression(
  call: CallExpression,
  fromNodeId: string,
  basePath: string
): { edge?: CodeEdge; externalCall?: ExternalCall } {
  const callText = call.getExpression().getText();
  const resolved = resolveCallTarget(call, basePath);

  if (isExternalOrUnknown(resolved)) {
    return {
      externalCall: {
        fromNodeId,
        callName: extractCallName(resolved),
        callText,
      },
    };
  }

  return {
    edge: {
      fromNodeId,
      toNodeId: resolved,
      type: "calls" as const,
    },
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
export function extractCalls(
  node: Node,
  fromNodeId: string,
  basePath: string
): { edges: CodeEdge[]; externalCalls: ExternalCall[] } {
  const edges: CodeEdge[] = [];
  const externalCalls: ExternalCall[] = [];

  for (const call of node.getDescendantsOfKind(SyntaxKind.CallExpression)) {
    const result = processCallExpression(call, fromNodeId, basePath);
    if (result.edge) edges.push(result.edge);
    if (result.externalCall) externalCalls.push(result.externalCall);
  }

  // 動的import処理
  for (const importKeyword of node.getDescendantsOfKind(
    SyntaxKind.ImportKeyword
  )) {
    const dynamicImportResult = extractDynamicImport(
      importKeyword,
      fromNodeId,
      basePath
    );
    edges.push(...dynamicImportResult.edges);
    externalCalls.push(...dynamicImportResult.externalCalls);
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
    return `${UNKNOWN_PREFIX}${callText}`;
  }

  const definitions = identifier.getDefinitions();
  if (definitions.length === 0) {
    return `${UNKNOWN_PREFIX}${callText}`;
  }

  const def = definitions[0];
  const defFilePath = def.getSourceFile().getFilePath();
  const relativePath = path.relative(basePath, defFilePath);

  if (def.getSourceFile().isFromExternalLibrary()) {
    return `${EXTERNAL_PREFIX}${callText}`;
  }

  const lineNumber = def.getNode()?.getStartLineNumber() ?? 0;
  return `${relativePath}:${lineNumber}:${def.getName()}`;
}
