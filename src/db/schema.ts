import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

/** DBディレクトリ名 */
const DB_DIR = ".ts-code-graph";

/** DBファイル名 */
const DB_FILE = "index.db";

/**
 * プロジェクトのDBパスを取得
 *
 * @param projectPath - プロジェクトのルートディレクトリ
 * @returns DBファイルのパス
 */
export function getDbPath(projectPath: string): string {
  return path.join(projectPath, DB_DIR, DB_FILE);
}

/**
 * DBディレクトリを作成
 *
 * @param projectPath - プロジェクトのルートディレクトリ
 */
function ensureDbDirectory(projectPath: string): void {
  const dbDir = path.join(projectPath, DB_DIR);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
}

/**
 * スキーマを初期化
 *
 * @param db - Databaseインスタンス
 */
function initializeSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS nodes (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      file_path TEXT NOT NULL,
      line_number INTEGER NOT NULL,
      signature TEXT
    );

    CREATE TABLE IF NOT EXISTS edges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      from_node_id TEXT NOT NULL,
      to_node_id TEXT NOT NULL,
      type TEXT NOT NULL,
      FOREIGN KEY (from_node_id) REFERENCES nodes(id),
      FOREIGN KEY (to_node_id) REFERENCES nodes(id),
      UNIQUE (from_node_id, to_node_id, type)
    );

    CREATE TABLE IF NOT EXISTS external_calls (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      from_node_id TEXT NOT NULL,
      call_name TEXT NOT NULL,
      call_text TEXT,
      FOREIGN KEY (from_node_id) REFERENCES nodes(id),
      UNIQUE (from_node_id, call_name, call_text)
    );

    CREATE INDEX IF NOT EXISTS idx_nodes_name ON nodes(name);
    CREATE INDEX IF NOT EXISTS idx_nodes_file_path ON nodes(file_path);
    CREATE INDEX IF NOT EXISTS idx_edges_from ON edges(from_node_id);
    CREATE INDEX IF NOT EXISTS idx_edges_to ON edges(to_node_id);
    CREATE INDEX IF NOT EXISTS idx_external_calls_from ON external_calls(from_node_id);
    CREATE INDEX IF NOT EXISTS idx_external_calls_name ON external_calls(call_name);
  `);
}

/**
 * データベース接続を作成し、スキーマを初期化
 *
 * @param projectPath - プロジェクトのルートディレクトリ
 * @returns Databaseインスタンス
 */
export function createDatabase(projectPath: string): Database.Database {
  ensureDbDirectory(projectPath);
  const dbPath = getDbPath(projectPath);
  const db = new Database(dbPath);

  // WALモードでパフォーマンス向上
  db.pragma("journal_mode = WAL");

  initializeSchema(db);

  return db;
}
