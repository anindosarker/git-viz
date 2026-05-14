import { registerColumn } from "./registry";
import type { ColumnDefinition } from "./types";

const Component: React.FC = () => null;
Component.displayName = "GraphColumn";

export const graphColumn: ColumnDefinition = {
  id: "graph",
  label: "Graph",
  defaultWidth: 200,
  Component,
};

registerColumn(graphColumn);
