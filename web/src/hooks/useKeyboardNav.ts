import { useEffect, useRef } from "react";
import { useStore } from "../state/store";

const PENDING_G_TIMEOUT_MS = 600;

function isTextTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select") return true;
  if (target.isContentEditable) return true;
  return false;
}

export function useKeyboardNav(): void {
  const pendingG = useRef<number | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (isTextTarget(e.target)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const store = useStore.getState();
      const commits = store.commits;
      const selected = store.selectedHash;
      const currentIdx = selected ? commits.findIndex((c) => c.hash === selected) : -1;

      const moveBy = (delta: number) => {
        if (commits.length === 0) return;
        const nextIdx =
          currentIdx === -1
            ? delta > 0
              ? 0
              : commits.length - 1
            : Math.max(0, Math.min(commits.length - 1, currentIdx + delta));
        store.select(commits[nextIdx]?.hash);
      };

      switch (e.key) {
        case "j":
        case "ArrowDown":
          e.preventDefault();
          moveBy(1);
          break;
        case "k":
        case "ArrowUp":
          e.preventDefault();
          moveBy(-1);
          break;
        case "Enter":
          // Open commit details: select first if nothing is selected; otherwise
          // selectedHash is already driving the drawer (no-op).
          if (currentIdx === -1 && commits.length > 0) {
            e.preventDefault();
            store.select(commits[0].hash);
          }
          break;
        case "Escape":
          if (store.preferencesOpen) {
            store.setPreferencesOpen(false);
          } else {
            store.select(undefined);
          }
          break;
        case "/":
          // search focus (Plan 5c) — best-effort look for an input named "search"
          {
            const search = document.querySelector<HTMLInputElement>(
              "input[data-gitviz='search'], input[name='search']"
            );
            if (search) {
              e.preventDefault();
              search.focus();
              search.select();
            }
          }
          break;
        case "g":
          if (pendingG.current !== null) {
            window.clearTimeout(pendingG.current);
            pendingG.current = null;
            if (commits.length > 0) store.select(commits[0].hash);
          } else {
            pendingG.current = window.setTimeout(() => {
              pendingG.current = null;
            }, PENDING_G_TIMEOUT_MS);
          }
          break;
        case "G":
          if (commits.length > 0) store.select(commits[commits.length - 1].hash);
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", handler);
    return () => {
      window.removeEventListener("keydown", handler);
      if (pendingG.current !== null) {
        window.clearTimeout(pendingG.current);
        pendingG.current = null;
      }
    };
  }, []);
}
