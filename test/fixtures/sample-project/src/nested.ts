// ネストされた関数のテストケース

// 外側の関数（ノードとして抽出される）
export function outerFunction(): number {
  // ネストされた関数宣言（現在の実装では抽出されない）
  function innerFunction(x: number): number {
    return x * 2;
  }

  // ネストされたアロー関数（現在の実装では抽出されない）
  const innerArrow = (y: number): number => y + 1;

  return innerFunction(5) + innerArrow(10);
}

// ネストされたメソッド呼び出しを含む関数
export function nestedMethodCalls(): void {
  const obj = {
    getValue(): number {
      return 42;
    },
  };

  console.log(obj.getValue());
}
