import { SourceFile, Node, CallExpression, SyntaxKind } from "ts-morph";
import path from "path";
import { CodeEdge, ExternalCall } from "../../types.js";
import { generateNodeId } from "../core/idGenerator.js";

// 定数定義
const UNKNOWN_DYNAMIC_IMPORT = "@unknown:dynamic-import" as const;

/**
 * 動的import構文を抽出
 *
 * @param importKeyword - import() のキーワードノード
 * @param fromNodeId - 呼び出し元ノードID
 * @param basePath - 基準パス
 * @returns 抽出されたCodeEdgeとExternalCallの配列
 */
export function extractDynamicImport(
  importKeyword: Node,
  fromNodeId: string,
  basePath: string
): { edges: CodeEdge[]; externalCalls: ExternalCall[] } {
  const edges: CodeEdge[] = [];
  const externalCalls: ExternalCall[] = [];

  const parent = importKeyword.getParent();
  if (!Node.isCallExpression(parent)) {
    return { edges, externalCalls };
  }

  const args = parent.getArguments();
  if (args.length === 0) {
    return { edges, externalCalls };
  }

  const firstArg = args[0];

  // 文字列リテラルのみ処理（変数は解決不可）
  if (!Node.isStringLiteral(firstArg)) {
    externalCalls.push({
      fromNodeId,
      callName: UNKNOWN_DYNAMIC_IMPORT,
      callText: parent.getText(),
    });
    return { edges, externalCalls };
  }

  const modulePath = firstArg.getLiteralText();
  const resolved = resolveDynamicImportTarget(parent, modulePath, basePath);

  if (resolved.isExternal) {
    externalCalls.push({
      fromNodeId,
      callName: modulePath,
      callText: parent.getText(),
    });
  } else {
    // 内部モジュールの場合、exportされた全関数/クラスへのエッジを作成
    resolved.exportedNodes.forEach((nodeId) => {
      edges.push({
        fromNodeId,
        toNodeId: nodeId,
        type: "imports" as const,
      });
    });
  }

  return { edges, externalCalls };
}

/**
 * モジュールパスが外部パッケージかどうかを判定
 *
 * @param modulePath - モジュールパス
 * @returns 外部パッケージの場合はtrue
 */
export function isExternalModule(modulePath: string): boolean {
  return !modulePath.startsWith(".") && !modulePath.startsWith("/");
}

/**
 * 相対パスを絶対パスに解決し、.ts拡張子に変換
 *
 * @param currentFilePath - 現在のファイルパス
 * @param modulePath - モジュールパス
 * @returns 解決された絶対パス
 */
export function resolveModulePath(
  currentFilePath: string,
  modulePath: string
): string {
  const currentDir = path.dirname(currentFilePath);
  let resolvedPath = path.resolve(currentDir, modulePath);

  // .js 拡張子を .ts に変換
  if (resolvedPath.endsWith(".js")) {
    resolvedPath = resolvedPath.replace(/\.js$/, ".ts");
  } else if (!resolvedPath.endsWith(".ts")) {
    // 拡張子がない場合、.ts を追加
    resolvedPath += ".ts";
  }

  return resolvedPath;
}

/**
 * ソースファイルからexportされたノードIDを収集
 *
 * @param targetSourceFile - 対象のソースファイル
 * @param basePath - 基準パス
 * @returns exportされたノードIDの配列
 */
export function collectExportedNodeIds(
  targetSourceFile: SourceFile,
  basePath: string
): string[] {
  const exportedNodes: string[] = [];
  const exportedDeclarations = targetSourceFile.getExportedDeclarations();

  for (const [, declarations] of exportedDeclarations) {
    for (const declaration of declarations) {
      const nodeId = resolveExportedNodeId(declaration, basePath);
      if (nodeId) {
        exportedNodes.push(nodeId);
      }
    }
  }

  return exportedNodes;
}

/**
 * 動的importのターゲットモジュールを解決し、exportされたノードを取得
 *
 * @param call - CallExpression（動的import）
 * @param modulePath - モジュールパス
 * @param basePath - 基準パス
 * @returns 解決結果（外部モジュールかどうか、exportされたノードID一覧）
 */
export function resolveDynamicImportTarget(
  call: CallExpression,
  modulePath: string,
  basePath: string
): { isExternal: boolean; exportedNodes: string[] } {
  const sourceFile = call.getSourceFile();
  const project = sourceFile.getProject();

  try {
    // 外部パッケージの場合
    if (isExternalModule(modulePath)) {
      return { isExternal: true, exportedNodes: [] };
    }

    // 相対パスを絶対パスに解決
    const resolvedPath = resolveModulePath(
      sourceFile.getFilePath(),
      modulePath
    );

    // ソースファイルを取得
    const targetSourceFile = project.getSourceFile(resolvedPath);

    if (!targetSourceFile || targetSourceFile.isFromExternalLibrary()) {
      return { isExternal: true, exportedNodes: [] };
    }

    // exportされたノードを収集
    const exportedNodes = collectExportedNodeIds(targetSourceFile, basePath);
    return { isExternal: false, exportedNodes };
  } catch {
    return { isExternal: true, exportedNodes: [] };
  }
}

/**
 * 宣言からノード情報を抽出する共通処理
 *
 * @param declaration - 宣言ノード
 * @param basePath - 基準パス
 * @returns ノード情報、または対象外の場合はnull
 */
function extractNodeInfo(
  declaration: Node,
  basePath: string
): { name: string; lineNumber: number; filePath: string } | null {
  const name =
    Node.isFunctionDeclaration(declaration) ||
    Node.isClassDeclaration(declaration)
      ? declaration.getName() || "(anonymous)"
      : Node.isVariableDeclaration(declaration)
        ? declaration.getName()
        : null;

  if (!name) return null;

  const filePath = path.relative(
    basePath,
    declaration.getSourceFile().getFilePath()
  );
  const lineNumber = declaration.getStartLineNumber();

  return { name, lineNumber, filePath };
}

/**
 * exportされた宣言からノードIDを抽出
 * re-exportを透過的に解決し、最終定義元のノードIDを返す
 *
 * @param declaration - export宣言
 * @param basePath - 基準パス
 * @returns ノードID、または対象外の場合はnull
 */
export function resolveExportedNodeId(
  declaration: Node,
  basePath: string
): string | null {
  // アロー関数の特別処理
  if (Node.isVariableDeclaration(declaration)) {
    const initializer = declaration.getInitializer();
    if (initializer?.getKind() !== SyntaxKind.ArrowFunction) {
      return null;
    }
  }

  // 関数、クラス、アロー関数以外は対象外
  if (
    !Node.isFunctionDeclaration(declaration) &&
    !Node.isClassDeclaration(declaration) &&
    !Node.isVariableDeclaration(declaration)
  ) {
    return null;
  }

  const nodeInfo = extractNodeInfo(declaration, basePath);
  if (!nodeInfo) return null;

  return generateNodeId(nodeInfo.name, nodeInfo.filePath, nodeInfo.lineNumber);
}
