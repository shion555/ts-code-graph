/**
 * ノードIDを生成する
 *
 * @param name - 名前
 * @param filePath - ファイルパス
 * @param lineNumber - 行番号
 * @returns 生成されたノードID
 */
export function generateNodeId(
  name: string,
  filePath: string,
  lineNumber: number
): string {
  return `${filePath}:${lineNumber}:${name}`;
}
