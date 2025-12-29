# ts-code-graph

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A CLI tool for analyzing TypeScript/Next.js codebase structure and visualizing function call relationships.

## Features

- **AST Analysis**: Parse TypeScript code using ts-morph
- **Call Graph Detection**: Detect function and class call relationships
- **Data Persistence**: Store code structure in SQLite database
- **CLI Interface**: Simple index and query commands

## Installation

```bash
# Global installation
npm install -g ts-code-graph

# Or use via npx
npx ts-code-graph
```

## Usage

### Index a Project

Analyze a TypeScript project and store the code structure:

```bash
ts-code-graph index <directory>
```

Output example:
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

### Query Relationships

Search for functions/classes and display their call relationships:

```bash
ts-code-graph query <name> [-d, --directory <path>]
```

Output example:
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

## Tech Stack

| Technology | Purpose |
|------------|---------|
| [ts-morph](https://ts-morph.com/) | TypeScript AST analysis |
| [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) | Data persistence |
| [commander](https://github.com/tj/commander.js) | CLI framework |

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run in development mode
npm run dev

# Run tests
npm test
```

## License

MIT

---

# ts-code-graph

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

TypeScript/Next.jsコードベースの構造を分析し、関数呼び出し関係を可視化するCLIツール。

## 機能

- **AST解析**: ts-morphを使用したTypeScriptコードの解析
- **呼び出しグラフ検出**: 関数・クラス間の呼び出し関係を検出
- **データ永続化**: コード構造をSQLiteデータベースに保存
- **CLIインターフェース**: シンプルなindexとqueryコマンド

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

## 技術スタック

| 技術 | 用途 |
|------|------|
| [ts-morph](https://ts-morph.com/) | TypeScript AST解析 |
| [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) | データ永続化 |
| [commander](https://github.com/tj/commander.js) | CLIフレームワーク |

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
