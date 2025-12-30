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

export interface ExternalCall {
  fromNodeId: string;
  callName: string;
  callText: string;
}

export interface ParseResult {
  nodes: CodeNode[];
  edges: CodeEdge[];
  externalCalls: ExternalCall[];
}
