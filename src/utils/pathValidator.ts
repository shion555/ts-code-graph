import * as fs from "fs";
import * as path from "path";

/**
 * パストラバーサル攻撃を検出するエラー
 */
export class PathTraversalError extends Error {
  constructor(originalPath: string, resolvedPath: string) {
    super(
      `パストラバーサルが検出されました: ${originalPath} -> ${resolvedPath}`
    );
    this.name = "PathTraversalError";
  }
}

/**
 * シンボリックリンクが検出された場合のエラー
 */
export class SymbolicLinkError extends Error {
  constructor(targetPath: string, linkTarget: string) {
    super(`シンボリックリンクが検出されました: ${targetPath} -> ${linkTarget}`);
    this.name = "SymbolicLinkError";
  }
}

/**
 * ディレクトリパスを検証し、安全な絶対パスを返す
 *
 * 検証項目:
 * 1. パストラバーサル検出 (正規化後のパスに ".." が含まれる)
 * 2. ディレクトリの存在確認
 * 3. シンボリックリンクの検出
 * 4. ディレクトリ検証
 *
 * @param directory - 検証するディレクトリパス
 * @param options - オプション設定
 * @param options.allowSymlinks - シンボリックリンクを許可するか (デフォルト: false)
 * @returns 検証済みの絶対パス
 * @throws {PathTraversalError} パストラバーサルが検出された場合
 * @throws {SymbolicLinkError} シンボリックリンクが検出された場合
 * @throws {Error} ディレクトリが存在しない、またはディレクトリでない場合
 */
export function validateDirectory(
  directory: string,
  options: { allowSymlinks?: boolean } = {}
): string {
  const { allowSymlinks = false } = options;

  // 1. パスを正規化
  const normalized = path.normalize(directory);

  // 2. パストラバーサル検出: 正規化後のパスに ".." が含まれる場合は危険
  if (normalized.includes("..")) {
    throw new PathTraversalError(directory, normalized);
  }

  // 3. 絶対パスに解決
  const absolutePath = path.resolve(normalized);

  // 4. 存在確認
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`ディレクトリが存在しません: ${directory}`);
  }

  // 5. シンボリックリンク検出
  if (!allowSymlinks) {
    const lstat = fs.lstatSync(absolutePath);
    if (lstat.isSymbolicLink()) {
      const linkTarget = fs.readlinkSync(absolutePath);
      throw new SymbolicLinkError(absolutePath, linkTarget);
    }
  }

  // 6. ディレクトリ検証（シンボリックリンクでない実体を確認）
  const stat = fs.statSync(absolutePath);
  if (!stat.isDirectory()) {
    throw new Error(`ディレクトリではありません: ${directory}`);
  }

  return absolutePath;
}

/**
 * DBディレクトリのパスを検証
 *
 * プロジェクトディレクトリが検証済みであることを前提に、
 * その配下の .ts-code-graph ディレクトリパスを安全に構築
 *
 * @param validatedProjectPath - 検証済みプロジェクトディレクトリの絶対パス
 * @param dbDirName - DBディレクトリ名
 * @returns 検証済みのDB絶対パス
 * @throws {Error} パスに不正な文字が含まれる場合
 */
export function validateDbDirectory(
  validatedProjectPath: string,
  dbDirName: string = ".ts-code-graph"
): string {
  // DBディレクトリ名に不正な文字が含まれていないか検証
  if (dbDirName.includes("..") || dbDirName.includes(path.sep)) {
    throw new Error(`不正なDBディレクトリ名: ${dbDirName}`);
  }

  // 検証済みパスに単純に結合（パストラバーサルの心配なし）
  return path.join(validatedProjectPath, dbDirName);
}
