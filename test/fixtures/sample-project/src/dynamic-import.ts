// 基本的な動的import
export async function loadGreet() {
  const module = await import("./sample.js");
  return module.greet("Dynamic");
}

// 外部ライブラリの動的import
export async function loadExternal() {
  const path = await import("path");
  return path.join("a", "b");
}

// 変数を使った動的import（解決不可）
export async function loadVariable(moduleName: string) {
  const module = await import(moduleName);
  return module;
}

// 条件付き動的import
export async function loadConditional(isDev: boolean) {
  if (isDev) {
    const devModule = await import("./sample.js");
    return devModule.add(1, 2);
  }
  return 0;
}
