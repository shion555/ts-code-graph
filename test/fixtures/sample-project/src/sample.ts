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
}

// 同一ファイル内の呼び出し
export function greetWithSum(name: string, a: number, b: number): string {
  const greeting = greet(name);
  const sum = add(a, b);
  return `${greeting}, sum: ${sum}`;
}
