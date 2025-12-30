# ts-code-graph

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

[English version](./README.md)

TypeScript/Next.jsコードベースの構造を分析し、関数呼び出し関係を可視化するCLIツール。

## 機能

- **AST解析**: ts-morphを使用したTypeScriptコードの解析
- **呼び出しグラフ検出**: 関数・クラス間の呼び出し関係を検出
- **データ永続化**: コード構造をSQLiteデータベースに保存
- **CLIインターフェース**: シンプルなindexとqueryコマンド
- **MCPサーバー**: AI統合のためのModel Context Protocolサポート

## インストール

```bash
# グローバルインストール
npm install -g ts-code-graph

# または npx 経由で使用
npx ts-code-graph
```

## 使い方

### プロジェクトのインデックス作成

TypeScriptプロジェクトを解析し、コード構造を保存します：

```bash
ts-code-graph index <directory>
```

出力例：
```json
{
  "success": true,
  "directory": "/path/to/project",
  "stats": {
    "nodes": 42,
    "edges": 156
  }
}
```

### 関係性のクエリ

関数/クラスを検索し、呼び出し関係を表示します：

```bash
ts-code-graph query <name> [-d, --directory <path>]
```

出力例：
```json
{
  "matches": [
    {
      "node": {
        "id": "src/parser/typescript.ts:parseProject",
        "name": "parseProject",
        "type": "function",
        "filePath": "src/parser/typescript.ts",
        "lineNumber": 19
      },
      "callers": [],
      "callees": []
    }
  ]
}
```

## MCPサーバー

ts-code-graphはAI統合のためのMCP（Model Context Protocol）サーバーを提供します。

### MCPサーバーの起動

```bash
npm run mcp
```

### 利用可能なツール

| ツール | 説明 |
|--------|------|
| `index_codebase` | TypeScriptプロジェクトをインデックスしてコード構造を分析 |
| `search_code` | 関数やクラスを名前で検索 |
| `get_call_graph` | 関数やクラスの呼び出し元と呼び出し先を取得 |

## 技術スタック

| 技術 | 用途 |
|------|------|
| [ts-morph](https://ts-morph.com/) | TypeScript AST解析 |
| [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) | データ永続化 |
| [commander](https://github.com/tj/commander.js) | CLIフレームワーク |
| [@modelcontextprotocol/sdk](https://github.com/modelcontextprotocol/sdk) | MCPサーバー |

## 開発

```bash
# 依存関係のインストール
npm install

# ビルド
npm run build

# 開発モードで実行
npm run dev

# テスト実行
npm test
```

## ライセンス

MIT
