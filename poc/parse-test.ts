import { Project, SyntaxKind } from "ts-morph";
import path from "path";

const targetDir = process.argv[2];

if (!targetDir) {
  console.error("Usage: npm run poc -- <project-directory>");
  console.error("Example: npm run poc -- ../my-nextjs-app");
  process.exit(1);
}

console.log(`\n📁 Parsing: ${targetDir}\n`);

const tsConfigPath = path.join(targetDir, "tsconfig.json");

const project = new Project({
  tsConfigFilePath: tsConfigPath,
});

for (const sourceFile of project.getSourceFiles()) {
  const relativePath = path.relative(targetDir, sourceFile.getFilePath());

  // 関数宣言
  const functions = sourceFile.getFunctions();
  for (const func of functions) {
    console.log(`📦 Function: ${func.getName() || "(anonymous)"}`);
    console.log(`   File: ${relativePath}:${func.getStartLineNumber()}`);

    const calls = func.getDescendantsOfKind(SyntaxKind.CallExpression);
    for (const call of calls) {
      console.log(`   → calls: ${call.getExpression().getText()}`);
    }
    console.log();
  }

  // アロー関数
  const variables = sourceFile.getVariableDeclarations();
  for (const variable of variables) {
    const initializer = variable.getInitializer();
    if (initializer?.getKind() === SyntaxKind.ArrowFunction) {
      console.log(`📦 Arrow Function: ${variable.getName()}`);
      console.log(`   File: ${relativePath}:${variable.getStartLineNumber()}`);

      const calls = initializer.getDescendantsOfKind(SyntaxKind.CallExpression);
      for (const call of calls) {
        console.log(`   → calls: ${call.getExpression().getText()}`);
      }
      console.log();
    }
  }
}
