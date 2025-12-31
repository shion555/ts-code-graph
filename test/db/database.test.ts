import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import os from "os";
import {
  createDatabase,
  getDbPath,
  CodeGraphRepository,
} from "../../src/db/index.js";
import { CodeNode, CodeEdge, ExternalCall } from "../../src/types.js";

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

    it("相対パスを絶対パスに変換する", () => {
      const dbPath = getDbPath("./project");
      expect(path.isAbsolute(dbPath)).toBe(true);
      expect(dbPath).toContain(".ts-code-graph/index.db");
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

      it("空配列を渡しても正常に動作する", () => {
        expect(() => repository.insertNodes([])).not.toThrow();
        expect(repository.countNodes()).toBe(0);
      });
    });

    describe("findNodeById", () => {
      it("IDでノードを取得できる", () => {
        repository.insertNodes(sampleNodes);

        const node = repository.findNodeById("src/auth.ts:validateUser");

        expect(node).toBeDefined();
        if (!node) throw new Error("node should be defined");
        expect(node.name).toBe("validateUser");
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

      it("空配列を渡しても正常に動作する", () => {
        expect(() => repository.insertEdges([])).not.toThrow();
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

    describe("ExternalCall関連メソッド", () => {
      const sampleExternalCalls: ExternalCall[] = [
        {
          fromNodeId: "src/api.ts:login",
          callName: "console.log",
          callText: "console.log",
        },
        {
          fromNodeId: "src/api.ts:login",
          callName: "path.join",
          callText: "path.join",
        },
        {
          fromNodeId: "src/auth.ts:validateUser",
          callName: "bcrypt.compare",
          callText: "bcrypt.compare",
        },
      ];

      beforeEach(() => {
        repository.insertNodes(sampleNodes);
      });

      it("外部呼び出しを挿入して取得できる", () => {
        repository.insertExternalCalls(sampleExternalCalls);

        const calls = repository.findExternalCallsByNode("src/api.ts:login");

        expect(calls).toHaveLength(2);
        expect(calls.map((c) => c.callName)).toContain("console.log");
        expect(calls.map((c) => c.callName)).toContain("path.join");
      });

      it("外部呼び出し数を取得できる", () => {
        repository.insertExternalCalls(sampleExternalCalls);

        expect(repository.countExternalCalls()).toBe(3);
      });

      it("存在しないノードの外部呼び出しは空配列を返す", () => {
        repository.insertExternalCalls(sampleExternalCalls);

        const calls = repository.findExternalCallsByNode("nonexistent");

        expect(calls).toHaveLength(0);
      });

      it("空配列を渡しても正常に動作する", () => {
        expect(() => repository.insertExternalCalls([])).not.toThrow();
        expect(repository.countExternalCalls()).toBe(0);
      });
    });
  });

  describe("createDatabase - ディレクトリが既に存在する場合", () => {
    it("既存のディレクトリでもDBを作成できる", () => {
      // 2回目のcreateDatabase呼び出し（ディレクトリは既に存在）
      const db2 = createDatabase(tempDir);
      const repository2 = new CodeGraphRepository(db2);

      // 正常に動作することを確認
      expect(repository2.countNodes()).toBe(0);

      repository2.close();
    });
  });
});
