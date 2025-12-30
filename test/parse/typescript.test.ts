import { describe, it, expect, beforeEach } from "vitest";
import path, { dirname } from "path";
import { parseProject } from "../../src/parser/typescript.js";
import { CodeNode, CodeEdge } from "../../src/types.js";
import { fileURLToPath } from "url";
import os from "os";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const fixturesPath = path.join(__dirname, "../fixtures/sample-project");

describe("parseProject", () => {
  let nodes: CodeNode[];
  let edges: CodeEdge[];

  beforeEach(() => {
    const result = parseProject(fixturesPath);
    nodes = result.nodes;
    edges = result.edges;
  });

  function findNodeByName(name: string): CodeNode {
    const node = nodes.find((n) => n.name === name);
    expect(node).toBeDefined();
    return node!;
  }

  function findEdge(fromNodeId: string, toNodeId: string): CodeEdge {
    const edge = edges.find(
      (e) => e.fromNodeId === fromNodeId && e.toNodeId === toNodeId
    );
    expect(edge).toBeDefined();
    return edge!;
  }

  describe("ノードの抽出", () => {
    it("関数宣言の抽出ができる", () => {
      const greet = findNodeByName("greet");

      expect(greet.type).toBe("function");
      expect(greet.filePath).toBe("src/sample.ts");
      expect(greet.lineNumber).toBe(2);
    });

    it("アロー関数の抽出ができる", () => {
      const add = findNodeByName("add");

      expect(add.type).toBe("function");
      expect(add.filePath).toBe("src/sample.ts");
      expect(add.lineNumber).toBe(7);
    });

    it("クラス定義を抽出できる", () => {
      const calculator = findNodeByName("Calculator");

      expect(calculator.type).toBe("class");
      expect(calculator.filePath).toBe("src/sample.ts");
      expect(calculator.lineNumber).toBe(12);
    });

    it("正しいノード数を抽出する", () => {
      expect(nodes.length).toBe(12);
    });
  });

  describe("edgesの抽出（同一ファイル内からの呼び出し）", () => {
    it("greetWithSumからgreetへの呼び出しを検出する", () => {
      const edge = findEdge(
        "src/sample.ts:greetWithSum",
        "src/sample.ts:greet"
      );

      expect(edge.type).toBe("calls");
    });

    it("greetWithSumからaddへの呼び出しを検出する", () => {
      const edge = findEdge("src/sample.ts:greetWithSum", "src/sample.ts:add");

      expect(edge.type).toBe("calls");
    });
  });

  describe("edgesの抽出（import経由の呼び出し）", () => {
    it("sayHelloからgreetへの呼び出しを検出する", () => {
      const edge = findEdge("src/caller.ts:sayHello", "src/sample.ts:greet");

      expect(edge.type).toBe("calls");
    });

    it("calculateからaddへの呼び出しを検出する", () => {
      const edge = findEdge("src/caller.ts:calculate", "src/sample.ts:add");

      expect(edge.type).toBe("calls");
    });
  });
});

describe("parseProject エラーケース", () => {
  it("tsconfig.jsonが存在しない場合エラーをスローする", () => {
    const noTsconfigPath = os.tmpdir();

    expect(() => parseProject(noTsconfigPath)).toThrow(
      /tsconfig\.jsonが見つかりません/
    );
  });

  it("存在しないディレクトリの場合エラーをスローする", () => {
    const nonExistentPath = "/non/existent/path";

    expect(() => parseProject(nonExistentPath)).toThrow(
      /tsconfig\.jsonが見つかりません/
    );
  });
});

describe("外部ライブラリの除外", () => {
  it("node_modules配下のファイルを解析対象から除外する", () => {
    const result = parseProject(fixturesPath);
    const nodeModulesNodes = result.nodes.filter((n) =>
      n.filePath.includes("node_modules")
    );
    expect(nodeModulesNodes.length).toBe(0);
  });

  it("外部ライブラリへの呼び出しをexternalCallsとして記録する", () => {
    const result = parseProject(fixturesPath);
    const externalCall = result.externalCalls.find(
      (ec) =>
        ec.callName.includes("mockFunction") ||
        ec.callText.includes("mockFunction")
    );
    expect(externalCall).toBeDefined();
  });
});
