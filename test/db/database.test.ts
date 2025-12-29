import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import os from "os";
import {
  createDatabase,
  getDbPath,
  CodeGraphRepository,
} from "../../src/db/index.js";
import { CodeNode, CodeEdge } from "../../src/types.js";

describe("Database", () => {
  let tempDir: string;
  let repository: CodeGraphRepository;

  beforeEach(() => {
    // テスト用の一時ディレクトリを作成
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "ts-code-graph-test-"));
    const db = createDatabase(tempDir);
    repository = new CodeGraphRepository(db);
  });

  afterEach(() => {
    repository.close();
    // 一時ディレクトリを削除
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe("getDbPath", () => {
    it("正しいDBパスを返す", () => {
      const dbPath = getDbPath("/project");
      expect(dbPath).toBe("/project/.ts-code-graph/index.db");
    });
  });

  describe("createDatabase", () => {
    it("DBディレクトリとファイルを作成する", () => {
      const dbPath = getDbPath(tempDir);
      expect(fs.existsSync(dbPath)).toBe(true);
    });
  });

  describe("CodeGraphRepository", () => {
    const sampleNodes: CodeNode[] = [
      {
        id: "src/auth.ts:validateUser",
        name: "validateUser",
        type: "function",
        filePath: "src/auth.ts",
        lineNumber: 10,
      },
      {
        id: "src/auth.ts:hashPassword",
        name: "hashPassword",
        type: "function",
        filePath: "src/auth.ts",
        lineNumber: 25,
      },
      {
        id: "src/api.ts:login",
        name: "login",
        type: "function",
        filePath: "src/api.ts",
        lineNumber: 5,
      },
    ];

    const sampleEdges: CodeEdge[] = [
      {
        fromNodeId: "src/api.ts:login",
        toNodeId: "src/auth.ts:validateUser",
        type: "calls",
      },
      {
        fromNodeId: "src/auth.ts:validateUser",
        toNodeId: "src/auth.ts:hashPassword",
        type: "calls",
      },
    ];

    describe("insertNodes / findNodesByName", () => {
      it("ノードを挿入して名前で検索できる", () => {
        repository.insertNodes(sampleNodes);

        const found = repository.findNodesByName("validateUser");

        expect(found).toHaveLength(1);
        expect(found[0].id).toBe("src/auth.ts:validateUser");
        expect(found[0].filePath).toBe("src/auth.ts");
        expect(found[0].lineNumber).toBe(10);
      });
    });

    describe("findNodeById", () => {
      it("IDでノードを取得できる", () => {
        repository.insertNodes(sampleNodes);

        const node = repository.findNodeById("src/auth.ts:validateUser");

        expect(node).toBeDefined();
        expect(node?.name).toBe("validateUser");
      });

      it("存在しないIDの場合undefinedを返す", () => {
        repository.insertNodes(sampleNodes);

        const node = repository.findNodeById("nonexistent");

        expect(node).toBeUndefined();
      });
    });

    describe("insertEdges / findCallers / findCallees", () => {
      beforeEach(() => {
        repository.insertNodes(sampleNodes);
        repository.insertEdges(sampleEdges);
      });

      it("呼び出し元を取得できる", () => {
        const callers = repository.findCallers("src/auth.ts:validateUser");

        expect(callers).toHaveLength(1);
        expect(callers[0].name).toBe("login");
      });

      it("呼び出し先を取得できる", () => {
        const callees = repository.findCallees("src/auth.ts:validateUser");

        expect(callees).toHaveLength(1);
        expect(callees[0].name).toBe("hashPassword");
      });
    });

    describe("countNodes / countEdges", () => {
      it("ノード数とエッジ数を取得できる", () => {
        repository.insertNodes(sampleNodes);
        repository.insertEdges(sampleEdges);

        expect(repository.countNodes()).toBe(3);
        expect(repository.countEdges()).toBe(2);
      });
    });

    describe("clear", () => {
      it("全データを削除できる", () => {
        repository.insertNodes(sampleNodes);
        repository.insertEdges(sampleEdges);

        repository.clear();

        expect(repository.countNodes()).toBe(0);
        expect(repository.countEdges()).toBe(0);
      });
    });
  });
});
