import { describe, it, expect } from "vitest";
import path from "path";
import { parseProject } from "../../src/parser/typescript.js";

const fixturesPath = path.join(__dirname, "../fixtures/sample-project");

describe("parseProject", () => {
  const nodes = parseProject(fixturesPath);

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
    expect(nodes.length).toBe(3);
  });
});
