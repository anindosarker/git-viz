import type { GraphRenderer } from "./types";

export const rendererRegistry = new Map<string, GraphRenderer>();

export function registerRenderer(renderer: GraphRenderer): void {
  rendererRegistry.set(renderer.id, renderer);
}

export function getRenderer(id: string): GraphRenderer | undefined {
  return rendererRegistry.get(id);
}
