import type { ColumnDefinition, ColumnId } from "./types";

export const columnRegistry = new Map<ColumnId, ColumnDefinition>();

export function registerColumn(column: ColumnDefinition): void {
  columnRegistry.set(column.id, column);
}

export function getColumn(id: ColumnId): ColumnDefinition | undefined {
  return columnRegistry.get(id);
}
