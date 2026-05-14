import { useEffect } from "react";
import { invalidateGraphPaletteCache } from "../graph/colors";

/**
 * Listens for theme:changed messages from the extension host and clears
 * the cached graph palette so the next render re-reads CSS variables.
 */
export function useThemeSync(onChange?: () => void): void {
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const msg = event.data;
      if (msg?.command !== "theme:changed") return;
      invalidateGraphPaletteCache();
      onChange?.();
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [onChange]);
}
