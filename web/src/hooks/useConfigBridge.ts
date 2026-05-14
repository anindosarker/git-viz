import { useEffect } from "react";
import { gitService } from "../services/git.service";
import { useStore } from "../state/store";

/**
 * Subscribes to `config:update` messages from the extension host and applies
 * them to the Zustand store. Also asks for the initial snapshot on mount so
 * standalone mode (which never receives a push) still gets values once they
 * exist server-side.
 */
export function useConfigBridge(): void {
  const applyConfig = useStore((s) => s.applyConfig);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const msg = event.data;
      if (msg?.command === "config:update" && msg.values && typeof msg.values === "object") {
        applyConfig(msg.values as Record<string, unknown>);
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [applyConfig]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const values = await gitService.transport.request<Record<string, unknown>>("config:getAll");
        if (!cancelled && values && typeof values === "object") {
          applyConfig(values);
        }
      } catch {
        // standalone mode has no config bridge — silent.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [applyConfig]);
}

export function setConfigKey(key: string, value: unknown): Promise<void> {
  return gitService.transport.request<void>("config:set", { key, value });
}
