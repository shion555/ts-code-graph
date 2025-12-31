// 関数宣言
export function greet(name: string): string {
  return `Hello, ${name}`;
}

// アロー関数
export const add = (a: number, b: number): number => {
  return a + b;
};

// クラス定義
export class Calculator {
  multiply(a: number, b: number): number {
    return a * b;
  }

  addAndDouble(a: number, b: number): number {
    const sum = add(a, b);
    return sum * 2;
  }
}

// 同一ファイル内の呼び出し
export function greetWithSum(name: string, a: number, b: number): string {
  const greeting = greet(name);
  const sum = add(a, b);
  return `${greeting}, sum: ${sum}`;
}

// メソッド呼び出し（PropertyAccessExpression）をテストするための関数
export function useCalculator(a: number, b: number): number {
  const calc = new Calculator();
  return calc.multiply(a, b);
}

// 外部ライブラリ呼び出しをテストするための関数
export function joinPaths(a: string, b: string): string {
  // consoleはグローバルオブジェクトで外部呼び出しとして扱われる
  console.log(a, b);
  // undefinedFunctionは定義がないため@unknownとして扱われる
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  undefinedFunction();
  return `${a}/${b}`;
}

// 複雑な呼び出し式（IIFE）をテストするための関数
// これはgetCallIdentifierでundefinedを返すケース
export function useIIFE(): number {
  return ((x: number) => x * 2)(5);
}

// 匿名関数のエクスポート（名前なし関数のテスト）
export default function (): string {
  return "anonymous function";
}

// 匿名クラスのエクスポート（名前なしクラスのテスト）
export const AnonymousClass = class {
  getValue(): number {
    return 42;
  }
};
