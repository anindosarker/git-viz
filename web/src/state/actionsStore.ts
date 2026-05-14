import type { GitActionResult } from "@git-viz/shared";
import { create } from "zustand";

export type ActionModalKind =
  | "branch-create"
  | "branch-rename"
  | "merge"
  | "rebase"
  | "cherry-pick"
  | "revert"
  | "reset"
  | "tag-create"
  | "stash-create"
  | "push"
  | "pull"
  | "remote-add"
  | "remote-rename";

export interface ActionModalState {
  kind: ActionModalKind;
  /** Optional pre-fill data (e.g. selected commit hash or branch name). */
  context?: Record<string, unknown>;
}

export interface ConfirmModalState {
  title: string;
  description: string;
  confirmLabel?: string;
  destructive?: boolean;
  /** When set, the user must type this string to confirm. */
  typedConfirm?: string;
  onConfirm: () => void | Promise<void>;
}

export interface ToastState {
  id: number;
  ok: boolean;
  title: string;
  result: GitActionResult;
}

interface ActionsStore {
  modal?: ActionModalState;
  confirm?: ConfirmModalState;
  toasts: ToastState[];
  openModal: (m: ActionModalState) => void;
  closeModal: () => void;
  openConfirm: (c: ConfirmModalState) => void;
  closeConfirm: () => void;
  pushToast: (title: string, result: GitActionResult) => void;
  dismissToast: (id: number) => void;
}

let toastCounter = 1;

export const useActionsStore = create<ActionsStore>((set) => ({
  modal: undefined,
  confirm: undefined,
  toasts: [],
  openModal: (m) => set({ modal: m }),
  closeModal: () => set({ modal: undefined }),
  openConfirm: (c) => set({ confirm: c }),
  closeConfirm: () => set({ confirm: undefined }),
  pushToast: (title, result) =>
    set((s) => ({
      toasts: [...s.toasts, { id: toastCounter++, ok: result.ok, title, result }],
    })),
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
