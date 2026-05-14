import { useEffect } from "react";
import { gitService } from "../services/git.service";

/**
 * Subscribe to backend-pushed "git:state-changed" events and trigger a refetch
 * of refs + first commits page. Emitted after every successful write action
 * via the VS Code message channel or the standalone transport's synthetic
 * post-action emit.
 */
export function useGitInvalidation(refresh: () => void | Promise<void>): void {
  useEffect(() => {
    const transport = gitService.transport;
    return transport.on((evt) => {
      if (evt.name === "git:state-changed") {
        void refresh();
      }
    });
  }, [refresh]);
}
