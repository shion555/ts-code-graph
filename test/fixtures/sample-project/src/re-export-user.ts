import { originalFunction } from "./re-export-named.js";

// 静的import経由のre-export呼び出し
export function useNamedReExport() {
  return originalFunction();
}

// 動的import経由のre-export
export async function dynamicNamedReExport() {
  const mod = await import("./re-export-named.js");
  return mod.originalFunction();
}

export async function dynamicWildcardReExport() {
  const mod = await import("./re-export-wildcard.js");
  return mod.originalFunction();
}
