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
      result.nodes.push(...partialResult.nodes);
      result.edges.push(...partialResult.edges);
      result.externalCalls.push(...partialResult.externalCalls);
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
    id: `${filePath}:${lineNumber}:${name}`,
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
 * 動的import式を抽出し、importされるモジュール内の関数/クラスへのエッジを作成
 *
 * @param importKeyword - ImportKeywordノード
 * @param fromNodeId - 呼び出し元ノードID
 * @param basePath - 基準パス
 * @returns 抽出されたCodeEdgeとExternalCallの配列
 */
function extractDynamicImport(
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
      callName: "@unknown:dynamic-import",
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
 * 動的importのターゲットモジュールを解決し、exportされたノードを取得
 *
 * @param call - CallExpression（動的import）
 * @param modulePath - モジュールパス
 * @param basePath - 基準パス
 * @returns 解決結果（外部モジュールかどうか、exportされたノードID一覧）
 */
function resolveDynamicImportTarget(
  call: CallExpression,
  modulePath: string,
  basePath: string
): { isExternal: boolean; exportedNodes: string[] } {
  const sourceFile = call.getSourceFile();
  const project = sourceFile.getProject();

  try {
    // 外部パッケージの場合（相対パスでない）
    if (!modulePath.startsWith(".") && !modulePath.startsWith("/")) {
      return { isExternal: true, exportedNodes: [] };
    }

    // 相対パスを絶対パスに解決
    const currentDir = path.dirname(sourceFile.getFilePath());
    let resolvedPath = path.resolve(currentDir, modulePath);

    // .js 拡張子を .ts に変換
    if (resolvedPath.endsWith(".js")) {
      resolvedPath = resolvedPath.replace(/\.js$/, ".ts");
    } else if (!resolvedPath.endsWith(".ts")) {
      // 拡張子がない場合、.ts を追加
      resolvedPath += ".ts";
    }

    // ソースファイルを取得
    const targetSourceFile = project.getSourceFile(resolvedPath);

    if (!targetSourceFile || targetSourceFile.isFromExternalLibrary()) {
      return { isExternal: true, exportedNodes: [] };
    }

    // 内部モジュールのexportされた関数/クラスを収集
    const exportedNodes: string[] = [];
    const relativePath = path.relative(
      basePath,
      targetSourceFile.getFilePath()
    );

    // exportされた関数
    for (const func of targetSourceFile.getFunctions()) {
      if (func.isExported()) {
        const name = func.getName() || "(anonymous)";
        const nodeId = `${relativePath}:${func.getStartLineNumber()}:${name}`;
        exportedNodes.push(nodeId);
      }
    }

    // exportされたクラス
    for (const cls of targetSourceFile.getClasses()) {
      if (cls.isExported()) {
        const name = cls.getName() || "(anonymous)";
        const nodeId = `${relativePath}:${cls.getStartLineNumber()}:${name}`;
        exportedNodes.push(nodeId);
      }
    }

    // exportされたアロー関数（変数宣言）
    for (const variable of targetSourceFile.getVariableDeclarations()) {
      const initializer = variable.getInitializer();
      if (initializer?.getKind() === SyntaxKind.ArrowFunction) {
        const statement = variable.getVariableStatement();
        if (statement?.isExported()) {
          const name = variable.getName();
          const nodeId = `${relativePath}:${variable.getStartLineNumber()}:${name}`;
          exportedNodes.push(nodeId);
        }
      }
    }

    return { isExternal: false, exportedNodes };
  } catch {
    return { isExternal: true, exportedNodes: [] };
  }
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

  if (def.getSourceFile().isFromExternalLibrary()) {
    return `@external:${callText}`;
  }

  const lineNumber = def.getNode()?.getStartLineNumber() ?? 0;
  return `${relativePath}:${lineNumber}:${def.getName()}`;
}
