import { describe, it, expect, afterAll } from "vitest";
import { execSync } from "child_process";
import path, { dirname } from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const fixturesPath = path.join(__dirname, "../fixtures/sample-project");
const cliPath = path.join(__dirname, "../../src/cli.ts");

/**
 * CLIを実行してJSON結果を取得
 */
function runCli(args: string): {
  stdout: string;
  stderr: string;
  exitCode: number;
} {
  try {
    const stdout = execSync(`npx tsx ${cliPath} ${args}`, {
      encoding: "utf-8",
      cwd: path.join(__dirname, "../.."),
    });
    return { stdout, stderr: "", exitCode: 0 };
  } catch (error: unknown) {
    const execError = error as {
      stdout?: string;
      stderr?: string;
      status?: number;
    };
    return {
      stdout: execError.stdout || "",
      stderr: execError.stderr || "",
      exitCode: execError.status || 1,
    };
  }
}

describe("CLI", () => {
  const dbPath = path.join(fixturesPath, ".ts-code-graph");

  afterAll(() => {
    // テスト後にDBディレクトリを削除
    if (fs.existsSync(dbPath)) {
      fs.rmSync(dbPath, { recursive: true, force: true });
    }
  });

  describe("index コマンド", () => {
    it("プロジェクトをインデックスできる", () => {
      const { stdout, exitCode } = runCli(`index ${fixturesPath}`);
      const result = JSON.parse(stdout);

      expect(exitCode).toBe(0);
      expect(result.success).toBe(true);
      expect(result.stats.nodes).toBe(21);
      expect(result.stats.edges).toBeGreaterThan(0);
    });

    it("DBファイルが作成される", () => {
      const dbFile = path.join(dbPath, "index.db");
      expect(fs.existsSync(dbFile)).toBe(true);
    });
  });

  describe("query コマンド", () => {
    it("関数名で検索できる", () => {
      const { stdout, exitCode } = runCli(`query greet -d ${fixturesPath}`);
      const result = JSON.parse(stdout);

      expect(exitCode).toBe(0);
      expect(result.matches).toHaveLength(1);
      expect(result.matches[0].node.name).toBe("greet");
      expect(result.matches[0].node.filePath).toBe("src/sample.ts");
    });

    it("呼び出し元を取得できる", () => {
      const { stdout } = runCli(`query greet -d ${fixturesPath}`);
      const result = JSON.parse(stdout);

      const callers = result.matches[0].callers;
      const callerNames = callers.map((c: { name: string }) => c.name);

      expect(callerNames).toContain("greetWithSum");
      expect(callerNames).toContain("sayHello");
    });

    it("呼び出し先を取得できる", () => {
      const { stdout } = runCli(`query greetWithSum -d ${fixturesPath}`);
      const result = JSON.parse(stdout);

      const callees = result.matches[0].callees;
      const calleeNames = callees.map((c: { name: string }) => c.name);

      expect(calleeNames).toContain("greet");
      expect(calleeNames).toContain("add");
    });

    it("存在しない関数は空の結果を返す", () => {
      const { stdout, exitCode } = runCli(
        `query nonExistent -d ${fixturesPath}`
      );
      const result = JSON.parse(stdout);

      expect(exitCode).toBe(0);
      expect(result.matches).toHaveLength(0);
    });
  });

  describe("エラーハンドリング", () => {
    it("存在しないディレクトリでエラーを返す", () => {
      const { stderr, exitCode } = runCli("index /non/existent/path");

      expect(exitCode).toBe(1);
      expect(stderr).toContain("error");
    });

    it("tsconfig.jsonがないディレクトリでエラーを返す", () => {
      const { stderr, exitCode } = runCli(`index ${__dirname}`);

      expect(exitCode).toBe(1);
      expect(stderr).toContain("tsconfig.json");
    });
  });
});
