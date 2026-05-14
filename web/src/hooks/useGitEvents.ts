import { useEffect } from "react";
import type { GitChangeKind } from "@git-viz/shared";
import { GitEventSubscriber } from "../services/events";
import { gitService } from "../services/git.service";
import { useStore } from "../state/store";

let cachedSubscriber: GitEventSubscriber | undefined;
function getSubscriber(): GitEventSubscriber {
  if (!cachedSubscriber) cachedSubscriber = new GitEventSubscriber(gitService.transport);
  return cachedSubscriber;
}

interface UseGitEventsArgs {
  onChange: (kinds: GitChangeKind[]) => void;
}

/**
 * Subscribes to backend git state-changed events and invokes onChange for the
 * active repo. Re-subscribes when the active repo switches.
 */
export function useGitEvents({ onChange }: UseGitEventsArgs): void {
  const activeRepoId = useStore((s) => s.activeRepoId);

  useEffect(() => {
    const subscriber = getSubscriber();
    if (activeRepoId !== undefined) subscriber.setRepoId(activeRepoId);
    const unsubscribe = subscriber.subscribe(activeRepoId, (change) => {
      if (activeRepoId !== undefined && change.repoId !== activeRepoId) return;
      onChange(change.kinds);
    });
    return unsubscribe;
  }, [activeRepoId, onChange]);
}
