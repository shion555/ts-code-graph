import Database from "better-sqlite3";
import { CodeNode, CodeEdge } from "../types.js";

/**
 * データベース操作を管理するリポジトリクラス
 */
export class CodeGraphRepository {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  /**
   * 全データを削除（再インデックス用）
   */
  clear(): void {
    this.db.exec("DELETE FROM edges");
    this.db.exec("DELETE FROM nodes");
  }

  /**
   * ノードを一括挿入
   *
   * @param nodes - 挿入するノードの配列
   */
  insertNodes(nodes: CodeNode[]): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO nodes (id, name, type, file_path, line_number, signature)
      VALUES (@id, @name, @type, @filePath, @lineNumber, @signature)
    `);

    const insertMany = this.db.transaction((nodes: CodeNode[]) => {
      for (const node of nodes) {
        stmt.run({
          id: node.id,
          name: node.name,
          type: node.type,
          filePath: node.filePath,
          lineNumber: node.lineNumber,
          signature: node.signature ?? null,
        });
      }
    });

    insertMany(nodes);
  }

  /**
   * エッジを一括挿入
   *
   * @param edges - 挿入するエッジの配列
   */
  insertEdges(edges: CodeEdge[]): void {
    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO edges (from_node_id, to_node_id, type)
      VALUES (@fromNodeId, @toNodeId, @type)
    `);

    const insertMany = this.db.transaction((edges: CodeEdge[]) => {
      for (const edge of edges) {
        stmt.run({
          fromNodeId: edge.fromNodeId,
          toNodeId: edge.toNodeId,
          type: edge.type,
        });
      }
    });

    insertMany(edges);
  }

  /**
   * 名前でノードを検索
   *
   * @param name - 検索する名前
   * @returns 一致するノードの配列
   */
  findNodesByName(name: string): CodeNode[] {
    const stmt = this.db.prepare(`
      SELECT id, name, type, file_path as filePath, line_number as lineNumber, signature
      FROM nodes
      WHERE name = ?
    `);

    return stmt.all(name) as CodeNode[];
  }

  /**
   * IDでノードを取得
   *
   * @param id - ノードID
   * @returns ノード、または見つからない場合はundefined
   */
  findNodeById(id: string): CodeNode | undefined {
    const stmt = this.db.prepare(`
      SELECT id, name, type, file_path as filePath, line_number as lineNumber, signature
      FROM nodes
      WHERE id = ?
    `);

    return stmt.get(id) as CodeNode | undefined;
  }

  /**
   * 指定ノードを呼び出している側（呼び出し元）を取得
   *
   * @param nodeId - 対象ノードID
   * @returns 呼び出し元ノードの配列
   */
  findCallers(nodeId: string): CodeNode[] {
    const stmt = this.db.prepare(`
      SELECT n.id, n.name, n.type, n.file_path as filePath, n.line_number as lineNumber, n.signature
      FROM nodes n
      INNER JOIN edges e ON n.id = e.from_node_id
      WHERE e.to_node_id = ? AND e.type = 'calls'
    `);

    return stmt.all(nodeId) as CodeNode[];
  }

  /**
   * 指定ノードが呼び出している先（呼び出し先）を取得
   *
   * @param nodeId - 対象ノードID
   * @returns 呼び出し先ノードの配列
   */
  findCallees(nodeId: string): CodeNode[] {
    const stmt = this.db.prepare(`
      SELECT n.id, n.name, n.type, n.file_path as filePath, n.line_number as lineNumber, n.signature
      FROM nodes n
      INNER JOIN edges e ON n.id = e.to_node_id
      WHERE e.from_node_id = ? AND e.type = 'calls'
    `);

    return stmt.all(nodeId) as CodeNode[];
  }

  /**
   * 全ノード数を取得
   *
   * @returns ノード数
   */
  countNodes(): number {
    const stmt = this.db.prepare("SELECT COUNT(*) as count FROM nodes");
    const result = stmt.get() as { count: number };
    return result.count;
  }

  /**
   * 全エッジ数を取得
   *
   * @returns エッジ数
   */
  countEdges(): number {
    const stmt = this.db.prepare("SELECT COUNT(*) as count FROM edges");
    const result = stmt.get() as { count: number };
    return result.count;
  }

  /**
   * データベース接続を閉じる
   */
  close(): void {
    this.db.close();
  }
}
