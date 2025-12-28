import { Project, SyntaxKind, SourceFile } from "ts-morph";
import path from "path";
import { CodeNode } from "../types.js";

/**
 * TypeScriptプロジェクトを解析し、コードノードを抽出する
 *
 * @param projectPath - プロジェクトのルートディレクトリ
 * @return 抽出されたCodeNodeの配列
 */
export function parseProject(projectPath: string): CodeNode[] {
  const absoluteProjectPath = path.resolve(projectPath);

  const project = new Project({
    tsConfigFilePath: `${absoluteProjectPath}/tsconfig.json`,
  });

  const nodes: CodeNode[] = [];

  for (const sourceFile of project.getSourceFiles()) {
    // 各ファイルからノードを抽出
    nodes.push(...extractNodes(sourceFile, absoluteProjectPath));
  }

  return nodes;
}
/**
 * ノードを抽出する
 * @param sourceFile - 対象ファイル
 * @param basePath - 基準パス
 * @return 抽出されたCodeNodeの配列
 */
function extractNodes(sourceFile: SourceFile, basePath: string): CodeNode[] {
  const nodes: CodeNode[] = [];
  const filePath = path.relative(basePath, sourceFile.getFilePath());

  // 関数定義を抽出
  for (const func of sourceFile.getFunctions()) {
    nodes.push(
      createNode(
        func.getName() || "(anonymous)",
        "function",
        filePath,
        func.getStartLineNumber(),
      ),
    );
  }

  // アロー関数を抽出
  for (const variable of sourceFile.getVariableDeclarations()) {
    const initializer = variable.getInitializer();
    if (initializer?.getKind() === SyntaxKind.ArrowFunction) {
      nodes.push(
        createNode(
          variable.getName(),
          "function",
          filePath,
          variable.getStartLineNumber(),
        ),
      );
    }
  }

  // クラスを抽出
  for (const cls of sourceFile.getClasses()) {
    nodes.push(
      createNode(
        cls.getName() || "(anonymous)",
        "class",
        filePath,
        cls.getStartLineNumber(),
      ),
    );
  }

  return nodes;
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
