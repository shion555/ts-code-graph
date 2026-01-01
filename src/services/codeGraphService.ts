import { parseProject } from "../parser/typescript.js";
import { createDatabase, CodeGraphRepository } from "../db/index.js";
import { validateDirectory } from "../utils/pathValidator.js";
import { CodeNode } from "../types.js";

interface IndexStats {
  nodes: number;
  edges: number;
  externalCalls: number;
}

export interface IndexProjectResult {
  directory: string;
  stats: IndexStats;
}

export interface QueryMatch {
  node: CodeNode;
  callers: CodeNode[];
  callees: CodeNode[];
}

export interface QueryCodeGraphResult {
  directory: string;
  matches: QueryMatch[];
}

/**
 * 指定したプロジェクトを解析し、結果をDBへ保存した上で統計情報を返す
 *
 * @param directory - プロジェクトディレクトリ
 * @returns 解析済みディレクトリと統計情報
 */
export function indexProject(directory: string): IndexProjectResult {
  const validatedDirectory = validateDirectory(directory);
  const { nodes, edges, externalCalls } = parseProject(validatedDirectory);

  return withRepository(validatedDirectory, (repository) => {
    repository.clear();
    repository.insertNodes(nodes);
    repository.insertEdges(edges);
    repository.insertExternalCalls(externalCalls);

    return {
      directory: validatedDirectory,
      stats: {
        nodes: repository.countNodes(),
        edges: repository.countEdges(),
        externalCalls: repository.countExternalCalls(),
      },
    };
  });
}

/**
 * ノードを検索し、呼び出し関係付きで返す
 *
 * @param name - 検索対象の名前
 * @param directory - プロジェクトディレクトリ
 * @returns 呼び出し関係情報付きの検索結果
 */
export function queryCodeGraph(
  name: string,
  directory: string
): QueryCodeGraphResult {
  const validatedDirectory = validateDirectory(directory);

  return withRepository(validatedDirectory, (repository) => {
    const nodes = repository.findNodesByName(name);
    const matches = nodes.map((node) => ({
      node,
      callers: repository.findCallers(node.id),
      callees: repository.findCallees(node.id),
    }));

    return { directory: validatedDirectory, matches };
  });
}

/**
 * 検証済みディレクトリに対するリポジトリ処理を安全に実行する
 *
 * @param validatedDirectory - validateDirectory済みのプロジェクトパス
 * @param handler - リポジトリを使用する処理
 * @returns ハンドラーの戻り値
 */
function withRepository<T>(
  validatedDirectory: string,
  handler: (repository: CodeGraphRepository) => T
): T {
  const db = createDatabase(validatedDirectory);
  const repository = new CodeGraphRepository(db);

  try {
    return handler(repository);
  } finally {
    repository.close();
  }
}
