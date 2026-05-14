export const GRAPH_PALETTE: string[] = [
  "var(--vscode-scmGraph-foreground1, #0098fa)",
  "var(--vscode-scmGraph-foreground2, #9a00fa)",
  "var(--vscode-scmGraph-foreground3, #00fa9a)",
  "var(--vscode-scmGraph-foreground4, #fa9a00)",
  "var(--vscode-scmGraph-foreground5, #fa0098)",
];

export function colorForIndex(index: number): string {
  return GRAPH_PALETTE[index % GRAPH_PALETTE.length];
}
