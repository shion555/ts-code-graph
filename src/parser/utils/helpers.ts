// 定数定義
export const EXTERNAL_PREFIX = "@external:" as const;
export const UNKNOWN_PREFIX = "@unknown:" as const;

/**
 * 呼び出しが外部/未知かを判定
 *
 * @param resolved - 解決されたノードID
 * @returns 外部または未知の場合はtrue
 */
export function isExternalOrUnknown(resolved: string): boolean {
  return (
    resolved.startsWith(EXTERNAL_PREFIX) || resolved.startsWith(UNKNOWN_PREFIX)
  );
}

/**
 * 外部/未知プレフィックスを除去
 *
 * @param resolved - 解決されたノードID
 * @returns プレフィックスを除去した呼び出し名
 */
export function extractCallName(resolved: string): string {
  if (resolved.startsWith(EXTERNAL_PREFIX)) {
    return resolved.slice(EXTERNAL_PREFIX.length);
  }
  if (resolved.startsWith(UNKNOWN_PREFIX)) {
    return resolved.slice(UNKNOWN_PREFIX.length);
  }
  return resolved;
}
