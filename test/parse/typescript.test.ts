import { describe, it, expect } from "vitest";
import path, { dirname } from "path";
import { parseProject } from "../../src/parser/typescript.js";
import { fileURLToPath } from "url";
import os from "os";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const fixturesPath = path.join(__dirname, "../fixtures/sample-project");
const { nodes, edges } = parseProject(fixturesPath);

describe("parseProject", () => {
  it("関数宣言の抽出ができる", () => {
    const greet = nodes.find((n) => n.name === "greet");

    expect(greet).toBeDefined();
    expect(greet?.type).toBe("function");
    expect(greet?.filePath).toBe("src/sample.ts");
    expect(greet?.lineNumber).toBe(2);
  });

  it("アロー関数の抽出ができる", () => {
    const add = nodes.find((n) => n.name === "add");

    expect(add).toBeDefined();
    expect(add?.type).toBe("function");
    expect(add?.filePath).toBe("src/sample.ts");
    expect(add?.lineNumber).toBe(7);
  });

  it("クラス定義を抽出できる", () => {
    const calculator = nodes.find((n) => n.name === "Calculator");

    expect(calculator).toBeDefined();
    expect(calculator?.type).toBe("class");
    expect(calculator?.filePath).toBe("src/sample.ts");
    expect(calculator?.lineNumber).toBe(12);
  });

  it("正しいノード数を抽出する", () => {
    expect(nodes.length).toBe(6);
  });
});

describe("edgesの抽出（同一ファイル内からの呼び出し）", () => {
  it("greetWithSumからgreetへの呼び出しを検出する", () => {
    const edge = edges.find(
      (e) =>
        e.fromNodeId === "src/sample.ts:greetWithSum" &&
        e.toNodeId === "src/sample.ts:greet",
    );

    expect(edge).toBeDefined();
    expect(edge?.type).toBe("calls");
  });

  it("greetWithSumからaddへの呼び出しを検出する", () => {
    const edge = edges.find(
      (e) =>
        e.fromNodeId === "src/sample.ts:greetWithSum" &&
        e.toNodeId === "src/sample.ts:add",
    );

    expect(edge).toBeDefined();
    expect(edge?.type).toBe("calls");
  });
});

describe("edgesからの抽出（import経由の呼び出し)", () => {
  it("sayHelloからgreetへの呼び出しを検出する", () => {
    const edge = edges.find(
      (e) =>
        e.fromNodeId === "src/caller.ts:sayHello" &&
        e.toNodeId === "src/sample.ts:greet",
    );

    expect(edge).toBeDefined();
    expect(edge?.type).toBe("calls");
  });

  it("calculate から add への呼び出しを検出する", () => {
    const edge = edges.find(
      (e) =>
        e.fromNodeId === "src/caller.ts:calculate" &&
        e.toNodeId === "src/sample.ts:add",
    );

    expect(edge).toBeDefined();
    expect(edge?.type).toBe("calls");
  });

  describe("エラーケース", () => {
    it("tsconfig.json が存在しない場合エラーをスローする", () => {
      const noTsconfigPath = os.tmpdir();

      expect(() => parseProject(noTsconfigPath)).toThrow(
        /tsconfig\.jsonが見つかりません/,
      );
    });

    it("存在しないディレクトリの場合エラーをスローする", () => {
      const nonExistentPath = "/non/existent/path";

      expect(() => parseProject(nonExistentPath)).toThrow(
        /tsconfig\.jsonが見つかりません/,
      );
    });
  });
});
