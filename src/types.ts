export interface CodeNode {
  id: string;
  name: string;
  type: "function" | "class" | "method" | "variable" | "component";
  filePath: string;
  lineNumber: number;
  signature?: string;
}

export interface CodeEdge {
  fromNodeId: string;
  toNodeId: string;
  type: "calls" | "imports" | "extends" | "implements";
}

export interface CallGraph {
  nodes: Map<string, CodeNode>;
  edges: CodeEdge[];
}
