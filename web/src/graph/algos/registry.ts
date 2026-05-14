import type { GraphAlgorithm } from "./types";

export const algorithmRegistry = new Map<string, GraphAlgorithm>();

export function registerAlgorithm(algo: GraphAlgorithm): void {
  algorithmRegistry.set(algo.id, algo);
}

export function getAlgorithm(id: string): GraphAlgorithm | undefined {
  return algorithmRegistry.get(id);
}
