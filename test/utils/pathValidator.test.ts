import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import {
  validateDirectory,
  validateDbDirectory,
  PathTraversalError,
  SymbolicLinkError,
} from "../../src/utils/pathValidator.js";

describe("pathValidator", () => {
  let testDir: string;
  let validDir: string;
  let symlink: string;

  beforeAll(() => {
    // 一時テストディレクトリ作成
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), "path-validator-test-"));
    validDir = path.join(testDir, "valid");
    symlink = path.join(testDir, "symlink");

    fs.mkdirSync(validDir);
    fs.symlinkSync(validDir, symlink);
  });

  afterAll(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  describe("validateDirectory", () => {
    it("正常なディレクトリパスを検証できる", () => {
      const result = validateDirectory(validDir);
      expect(result).toBe(path.resolve(validDir));
    });

    it("パストラバーサルを検出する: ../を含むパス", () => {
      expect(() => validateDirectory("../../../etc")).toThrow(
        PathTraversalError
      );
    });

    it("パストラバーサルを検出する: 正規化後に..が残るパス", () => {
      expect(() => validateDirectory("foo/../../bar")).toThrow(
        PathTraversalError
      );
    });

    it("存在しないディレクトリでエラー", () => {
      expect(() =>
        validateDirectory(path.join(testDir, "nonexistent"))
      ).toThrow("ディレクトリが存在しません");
    });

    it("シンボリックリンクを検出する", () => {
      expect(() => validateDirectory(symlink)).toThrow(SymbolicLinkError);
    });

    it("allowSymlinks: true でシンボリックリンクを許可", () => {
      const result = validateDirectory(symlink, { allowSymlinks: true });
      expect(result).toBe(path.resolve(symlink));
    });

    it("ファイルが指定された場合エラー", () => {
      const file = path.join(validDir, "test.txt");
      fs.writeFileSync(file, "test");
      expect(() => validateDirectory(file)).toThrow(
        "ディレクトリではありません"
      );
    });
  });

  describe("validateDbDirectory", () => {
    it("正常なDBディレクトリパスを構築できる", () => {
      const result = validateDbDirectory(validDir);
      expect(result).toBe(path.join(validDir, ".ts-code-graph"));
    });

    it("カスタムDBディレクトリ名を使用できる", () => {
      const result = validateDbDirectory(validDir, "custom-db");
      expect(result).toBe(path.join(validDir, "custom-db"));
    });

    it("DBディレクトリ名に..が含まれる場合エラー", () => {
      expect(() => validateDbDirectory(validDir, "..")).toThrow(
        "不正なDBディレクトリ名"
      );
    });

    it("DBディレクトリ名にパスセパレータが含まれる場合エラー", () => {
      expect(() => validateDbDirectory(validDir, "foo/bar")).toThrow(
        "不正なDBディレクトリ名"
      );
    });
  });
});
