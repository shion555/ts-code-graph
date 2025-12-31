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
      expect(nodes.length).toBe(21);
    });
  });

  describe("edgesの抽出（同一ファイル内からの呼び出し）", () => {
    it("greetWithSumからgreetへの呼び出しを検出する", () => {
      const edge = findEdge(
        "src/sample.ts:24:greetWithSum",
        "src/sample.ts:2:greet"
      );

      expect(edge.type).toBe("calls");
    });

    it("greetWithSumからaddへの呼び出しを検出する", () => {
      const edge = findEdge(
        "src/sample.ts:24:greetWithSum",
        "src/sample.ts:7:add"
      );

      expect(edge.type).toBe("calls");
    });
  });

  describe("edgesの抽出（import経由の呼び出し）", () => {
    it("sayHelloからgreetへの呼び出しを検出する", () => {
      const edge = findEdge(
        "src/caller.ts:3:sayHello",
        "src/sample.ts:2:greet"
      );

      expect(edge.type).toBe("calls");
    });

    it("calculateからaddへの呼び出しを検出する", () => {
      const edge = findEdge("src/caller.ts:7:calculate", "src/sample.ts:7:add");

      expect(edge.type).toBe("calls");
    });
  });

  describe("クラスメソッドの抽出", () => {
    it("通常のメソッドを抽出できる", () => {
      const multiply = findNodeByName("multiply");

      expect(multiply).toBeDefined();
      expect(multiply.type).toBe("method");
      expect(multiply.filePath).toBe("src/sample.ts");
      expect(multiply.lineNumber).toBe(13);
    });

    it("匿名クラスのメソッドを抽出できる", () => {
      const doSomething = findNodeByName("doSomething");

      expect(doSomething).toBeDefined();
      expect(doSomething.type).toBe("method");
      expect(doSomething.filePath).toBe("src/anonymous.ts");
    });

    it("メソッドから関数への呼び出しを検出する", () => {
      const addAndDouble = findNodeByName("addAndDouble");
      expect(addAndDouble).toBeDefined();

      // addAndDouble が add を呼び出すエッジを確認
      const callsToAdd = edges.filter(
        (e) => e.fromNodeId === addAndDouble.id && e.toNodeId.includes(":add")
      );
      expect(callsToAdd.length).toBeGreaterThan(0);
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

describe("空プロジェクト", () => {
  const emptyProjectPath = path.join(__dirname, "../fixtures/empty-project");

  it("空プロジェクト時は空配列を返す", () => {
    const result = parseProject(emptyProjectPath);

    expect(result.nodes).toEqual([]);
    expect(result.edges).toEqual([]);
    expect(result.externalCalls).toEqual([]);
  });
});

describe("匿名関数・クラスの名前付け", () => {
  let nodes: CodeNode[];

  beforeEach(() => {
    const result = parseProject(fixturesPath);
    nodes = result.nodes;
  });

  it("匿名関数に(anonymous)という名前を付ける", () => {
    const anonymousFunc = nodes.find(
      (n) => n.name === "(anonymous)" && n.type === "function"
    );

    expect(anonymousFunc).toBeDefined();
    expect(anonymousFunc!.filePath).toBe("src/sample.ts");
  });

  it("匿名クラスに(anonymous)という名前を付ける", () => {
    const anonymousClass = nodes.find(
      (n) => n.name === "(anonymous)" && n.type === "class"
    );

    expect(anonymousClass).toBeDefined();
    expect(anonymousClass!.filePath).toBe("src/anonymous.ts");
  });

  it("変数に代入されたアロー関数は変数名で抽出される", () => {
    const addFunc = nodes.find(
      (n) => n.name === "add" && n.type === "function"
    );

    expect(addFunc).toBeDefined();
    expect(addFunc!.filePath).toBe("src/sample.ts");
  });
});

describe("複数ファイル対応", () => {
  let nodes: CodeNode[];
  let edges: CodeEdge[];

  beforeEach(() => {
    const result = parseProject(fixturesPath);
    nodes = result.nodes;
    edges = result.edges;
  });

  it("複数のソースファイルからノードを抽出する", () => {
    const filePaths = [...new Set(nodes.map((n) => n.filePath))];

    expect(filePaths.length).toBeGreaterThan(1);
    expect(filePaths).toContain("src/sample.ts");
    expect(filePaths).toContain("src/caller.ts");
  });

  it("ファイル間の呼び出し関係を正しく検出する", () => {
    const crossFileEdges = edges.filter((e) => {
      const fromFile = e.fromNodeId.split(":")[0];
      const toFile = e.toNodeId.split(":")[0];
      return fromFile !== toFile;
    });

    expect(crossFileEdges.length).toBeGreaterThan(0);
  });
});

describe("ネストされた関数やメソッド", () => {
  let nodes: CodeNode[];

  beforeEach(() => {
    const result = parseProject(fixturesPath);
    nodes = result.nodes;
  });

  it("外側の関数はノードとして抽出される", () => {
    const outerFunc = nodes.find((n) => n.name === "outerFunction");

    expect(outerFunc).toBeDefined();
    expect(outerFunc!.type).toBe("function");
    expect(outerFunc!.filePath).toBe("src/nested.ts");
  });

  it("ネストされた内部関数はトップレベルのノードとして抽出されない", () => {
    const innerFunc = nodes.find((n) => n.name === "innerFunction");
    const innerArrow = nodes.find((n) => n.name === "innerArrow");

    // 現在の実装ではネストされた関数は抽出されない
    expect(innerFunc).toBeUndefined();
    expect(innerArrow).toBeUndefined();
  });
});

describe("型エイリアスとインターフェース", () => {
  let nodes: CodeNode[];

  beforeEach(() => {
    const result = parseProject(fixturesPath);
    nodes = result.nodes;
  });

  it("型エイリアスはノードとして抽出されない", () => {
    const userIdType = nodes.find((n) => n.name === "UserId");
    const userDataType = nodes.find((n) => n.name === "UserData");

    expect(userIdType).toBeUndefined();
    expect(userDataType).toBeUndefined();
  });

  it("インターフェースはノードとして抽出されない", () => {
    const iUser = nodes.find((n) => n.name === "IUser");
    const iUserService = nodes.find((n) => n.name === "IUserService");

    expect(iUser).toBeUndefined();
    expect(iUserService).toBeUndefined();
  });

  it("インターフェースを実装するクラスはノードとして抽出される", () => {
    const userService = nodes.find((n) => n.name === "UserService");

    expect(userService).toBeDefined();
    expect(userService!.type).toBe("class");
    expect(userService!.filePath).toBe("src/types-test.ts");
  });

  it("型を使用する関数はノードとして抽出される", () => {
    const processFunc = nodes.find((n) => n.name === "processUserData");

    expect(processFunc).toBeDefined();
    expect(processFunc!.type).toBe("function");
  });
});
