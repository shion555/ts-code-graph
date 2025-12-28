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
