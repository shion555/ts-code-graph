import { describe, it, expect } from "vitest";
import path, { dirname } from "path";
import { parseProject } from "../../src/parser/typescript.js";
import { CodeNode, CodeEdge } from "../../src/types.js";
import { fileURLToPath } from "url";
import os from "os";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const fixturesPath = path.join(__dirname, "../fixtures/sample-project");
const { nodes, edges } = parseProject(fixturesPath);

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

describe("parseProject", () => {
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
    expect(nodes.length).toBe(11);
  });
});

describe("edgesの抽出（同一ファイル内からの呼び出し）", () => {
  it("greetWithSumからgreetへの呼び出しを検出する", () => {
    const edge = findEdge("src/sample.ts:greetWithSum", "src/sample.ts:greet");

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
